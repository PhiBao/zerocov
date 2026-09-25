import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate } from '../auth/middleware';
import { sendSuccess, sendError, generateId, isValidDate, formatAmount, formatDateRange } from '../utils/helpers';
import { CreateReportDTO, ExpenseCategory, Report } from '../types';

export const reportsRouter: Router = Router();

// GET /reports — list reports for the authenticated user
reportsRouter.get('/', authenticate, (req: Request, res: Response) => {
  const reports = db.listReportsByUser(req.user!.userId);
  return sendSuccess(res, reports);
});

// GET /reports/:id — get a specific report
reportsRouter.get('/:id', authenticate, (req: Request, res: Response) => {
  const report = db.findReportById(req.params.id);
  if (!report) return sendError(res, 'Report not found', 404);
  if (report.userId !== req.user!.userId && req.user!.role === 'employee') {
    return sendError(res, 'Forbidden', 403);
  }
  return sendSuccess(res, report);
});

// POST /reports — generate a new report
reportsRouter.post('/', authenticate, (req: Request, res: Response) => {
  const { dateFrom, dateTo, categories, format = 'json' }: CreateReportDTO = req.body;

  if (!isValidDate(dateFrom)) return sendError(res, 'Invalid dateFrom — must be ISO date string');
  if (!isValidDate(dateTo)) return sendError(res, 'Invalid dateTo — must be ISO date string');

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (from > to) return sendError(res, 'dateFrom must be before or equal to dateTo');

  if (categories && !Array.isArray(categories)) {
    return sendError(res, 'categories must be an array');
  }

  const validCategories: ExpenseCategory[] = [
    'travel', 'meals', 'accommodation', 'equipment', 'software', 'training', 'other',
  ];
  if (categories) {
    for (const cat of categories) {
      if (!validCategories.includes(cat)) {
        return sendError(res, `Invalid category: ${cat}`);
      }
    }
  }

  // For employees, only include their own expenses
  // For managers/admins, include all expenses in range
  let expenses = db.listExpensesByDateRange(from, to, categories);
  if (req.user!.role === 'employee') {
    expenses = expenses.filter(e => e.userId === req.user!.userId);
  }
  // Only include approved/paid expenses in reports
  expenses = expenses.filter(e => e.status === 'approved' || e.status === 'paid');

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const report: Report = {
    id: generateId(),
    userId: req.user!.userId,
    dateFrom: from,
    dateTo: to,
    categories,
    generatedAt: new Date(),
    format,
    expenses,
    totalAmount,
    expenseCount: expenses.length,
  };

  db.createReport(report);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}.csv"`);
    const csv = [
      'id,date,category,description,amount,status',
      ...expenses.map(e =>
        `${e.id},${e.createdAt.toISOString()},${e.category},"${e.description}",${formatAmount(e.amount)},${e.status}`,
      ),
    ].join('\n');
    return res.send(csv);
  }

  return sendSuccess(res, {
    ...report,
    summary: {
      dateRange: formatDateRange(from, to),
      totalFormatted: formatAmount(totalAmount),
      expenseCount: expenses.length,
    },
  }, 201);
});
