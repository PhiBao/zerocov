import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../auth/middleware';
import { sendSuccess, sendError, generateId, isNonEmptyString, sanitizeString, isValidAmount } from '../utils/helpers';
import { CreateExpenseDTO, UpdateExpenseDTO, SubmitExpenseDTO, ExpenseCategory } from '../types';

export const expensesRouter: Router = Router();

const VALID_CATEGORIES: ExpenseCategory[] = [
  'travel', 'meals', 'accommodation', 'equipment', 'software', 'training', 'other',
];

// GET /expenses — list expenses for the authenticated user
expensesRouter.get('/', authenticate, (req: Request, res: Response) => {
  const expenses = db.listExpensesByUser(req.user!.userId);
  return sendSuccess(res, expenses);
});

// GET /expenses/:id — get a single expense
expensesRouter.get('/:id', authenticate, (req: Request, res: Response) => {
  const expense = db.findExpenseById(req.params.id);
  if (!expense) return sendError(res, 'Expense not found', 404);
  // Employees can only view their own expenses; managers/admins can view all
  if (req.user!.role === 'employee' && expense.userId !== req.user!.userId) {
    return sendError(res, 'Forbidden', 403);
  }
  return sendSuccess(res, expense);
});

// POST /expenses — create a new expense (draft)
expensesRouter.post('/', authenticate, (req: Request, res: Response) => {
  const { amount, category, description, receiptUrl }: CreateExpenseDTO = req.body;

  if (!isValidAmount(amount)) {
    return sendError(res, 'Amount must be a positive integer in cents (max $10,000.00)');
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return sendError(res, `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (!isNonEmptyString(description)) {
    return sendError(res, 'Description is required');
  }

  const expense = db.createExpense({
    id: generateId(),
    userId: req.user!.userId,
    amount,
    category,
    description: sanitizeString(description),
    receiptUrl,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return sendSuccess(res, expense, 201);
});

// PATCH /expenses/:id — update a draft expense
expensesRouter.patch('/:id', authenticate, (req: Request, res: Response) => {
  const expense = db.findExpenseById(req.params.id);
  if (!expense) return sendError(res, 'Expense not found', 404);
  if (expense.userId !== req.user!.userId) return sendError(res, 'Forbidden', 403);
  if (expense.status !== 'draft') return sendError(res, 'Only draft expenses can be edited', 422);

  const updates: UpdateExpenseDTO = req.body;

  if (updates.amount !== undefined && !isValidAmount(updates.amount)) {
    return sendError(res, 'Amount must be a positive integer in cents (max $10,000.00)');
  }
  if (updates.category !== undefined && !VALID_CATEGORIES.includes(updates.category)) {
    return sendError(res, 'Invalid category');
  }

  const updated = db.updateExpense(req.params.id, {
    ...updates,
    description: updates.description ? sanitizeString(updates.description) : expense.description,
  });

  return sendSuccess(res, updated);
});

// DELETE /expenses/:id — delete a draft expense
expensesRouter.delete('/:id', authenticate, (req: Request, res: Response) => {
  const expense = db.findExpenseById(req.params.id);
  if (!expense) return sendError(res, 'Expense not found', 404);
  if (expense.userId !== req.user!.userId) return sendError(res, 'Forbidden', 403);
  if (expense.status !== 'draft') return sendError(res, 'Only draft expenses can be deleted', 422);

  db.deleteExpense(req.params.id);
  return sendSuccess(res, { message: 'Expense deleted' });
});

// POST /expenses/:id/submit — submit a draft expense for approval
expensesRouter.post('/:id/submit', authenticate, (req: Request, res: Response) => {
  const expense = db.findExpenseById(req.params.id);
  if (!expense) return sendError(res, 'Expense not found', 404);
  if (expense.userId !== req.user!.userId) return sendError(res, 'Forbidden', 403);
  if (expense.status !== 'draft') return sendError(res, 'Only draft expenses can be submitted', 422);

  const { approverId }: SubmitExpenseDTO = req.body;
  if (!isNonEmptyString(approverId)) return sendError(res, 'Approver ID is required');

  const approver = db.findUserById(approverId);
  if (!approver) return sendError(res, 'Approver not found', 404);
  if (approver.role !== 'manager' && approver.role !== 'admin') {
    return sendError(res, 'Approver must be a manager or admin', 422);
  }

  db.updateExpense(req.params.id, { status: 'submitted' });

  const approval = db.createApproval({
    id: generateId(),
    expenseId: expense.id,
    requesterId: req.user!.userId,
    approverId,
    status: 'pending',
    createdAt: new Date(),
  });

  return sendSuccess(res, { expense: db.findExpenseById(req.params.id), approval }, 201);
});

// GET /expenses/admin/all — admin view of all expenses
expensesRouter.get('/admin/all', authenticate, requireRole('admin', 'manager'), (req: Request, res: Response) => {
  const statusFilter = req.query.status as string | undefined;
  const expenses = statusFilter
    ? db.listExpensesByStatus(statusFilter as any)
    : Array.from({ length: 0 }); // would iterate all in production
  return sendSuccess(res, expenses);
});
