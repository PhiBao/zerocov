import express, { Request, Response, NextFunction } from 'express';
import { authRouter } from './auth/routes';
import { expensesRouter } from './expenses/routes';
import { approvalsRouter } from './approvals/routes';
import { reportsRouter } from './reports/routes';
import { AppError } from './utils/helpers';

export function createApp(): express.Application {
  const app = express();

  // ── Middleware ─────────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use('/auth', authRouter);
  app.use('/expenses', expensesRouter);
  app.use('/approvals', approvalsRouter);
  app.use('/reports', reportsRouter);

  // ── Health check ────────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── 404 handler ─────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // ── Global error handler ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
    }
    // Unexpected errors that were not converted to AppError responses
    console.error('[UnhandledError]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  });

  return app;
}
