import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../auth/middleware';
import { sendSuccess, sendError } from '../utils/helpers';
import { ResolveApprovalDTO } from '../types';

export const approvalsRouter: Router = Router();

// GET /approvals — list pending approvals for the authenticated manager/admin
approvalsRouter.get('/', authenticate, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const approvals = db.listApprovalsByApproverId(req.user!.userId);
  // Enrich with expense details
  const enriched = approvals.map(a => ({
    ...a,
    expense: db.findExpenseById(a.expenseId),
    requester: (() => {
      const u = db.findUserById(a.requesterId);
      return u ? { id: u.id, name: u.name, email: u.email } : null;
    })(),
  }));
  return sendSuccess(res, enriched);
});

// GET /approvals/pending — only pending items
approvalsRouter.get('/pending', authenticate, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const all = db.listApprovalsByApproverId(req.user!.userId);
  const pending = all.filter(a => a.status === 'pending');
  return sendSuccess(res, pending);
});

// GET /approvals/:id — get a specific approval request
approvalsRouter.get('/:id', authenticate, (req: Request, res: Response) => {
  const approval = db.findApprovalById(req.params.id);
  if (!approval) return sendError(res, 'Approval not found', 404);

  // Only the approver or the requester can view it
  const isApprover = approval.approverId === req.user!.userId;
  const isRequester = approval.requesterId === req.user!.userId;
  const isAdmin = req.user!.role === 'admin';

  if (!isApprover && !isRequester && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  return sendSuccess(res, {
    ...approval,
    expense: db.findExpenseById(approval.expenseId),
  });
});

// POST /approvals/:id/resolve — approve or reject an expense
approvalsRouter.post('/:id/resolve', authenticate, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const approval = db.findApprovalById(req.params.id);
  if (!approval) return sendError(res, 'Approval not found', 404);
  if (approval.approverId !== req.user!.userId) {
    return sendError(res, 'You are not the assigned approver', 403);
  }
  if (approval.status !== 'pending') {
    return sendError(res, 'This approval has already been resolved', 422);
  }

  const { status, comment }: ResolveApprovalDTO = req.body;
  if (status !== 'approved' && status !== 'rejected') {
    return sendError(res, 'Status must be "approved" or "rejected"');
  }

  const updatedApproval = db.updateApproval(req.params.id, {
    status,
    comment,
    resolvedAt: new Date(),
  });

  // Update the expense status to match approval outcome
  const newExpenseStatus = status === 'approved' ? 'approved' : 'rejected';
  const updatedExpense = db.updateExpense(approval.expenseId, { status: newExpenseStatus });

  return sendSuccess(res, { approval: updatedApproval, expense: updatedExpense });
});
