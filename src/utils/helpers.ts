import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '../types';
import { Response } from 'express';

// ─── ID generation ────────────────────────────────────────────────────────────

export function generateId(): string {
  return uuidv4();
}

// ─── Response helpers ─────────────────────────────────────────────────────────

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function sendError(res: Response, message: string, statusCode = 400): void {
  const body: ApiResponse = { success: false, error: message };
  res.status(statusCode).json(body);
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidAmount(amount: unknown): boolean {
  if (typeof amount !== 'number') return false;
  if (!Number.isFinite(amount)) return false;
  if (!Number.isInteger(amount)) return false;  // openapi.yaml: amount is an integer (cents)
  if (amount <= 0) return false;
  if (amount > 10_000_00) return false;         // business cap: $10,000.00 in cents
  return true;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidDate(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDateRange(from: Date, to: Date): string {
  return `${from.toISOString().split('T')[0]} to ${to.toISOString().split('T')[0]}`;
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// ─── Error classes ────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}
