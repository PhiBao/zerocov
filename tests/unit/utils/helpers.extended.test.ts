import { Response } from 'express';
import {
  isValidAmount,
  isValidDate,
  isValidEmail,
  isNonEmptyString,
  sanitizeString,
  formatAmount,
  sendSuccess,
  sendError,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../../../src/utils/helpers';

// ── isValidAmount ─────────────────────────────────────────────────────────────

describe('isValidAmount', () => {
  it('returns true for a positive integer', () => { expect(isValidAmount(100)).toBe(true); });
  it('returns true for 1 (minimum valid)', () => { expect(isValidAmount(1)).toBe(true); });
  it('returns true for max valid value', () => { expect(isValidAmount(1_000_000)).toBe(true); });
  it('returns false for 0', () => { expect(isValidAmount(0)).toBe(false); });
  it('returns false for negative number', () => { expect(isValidAmount(-1)).toBe(false); });
  it('returns false for amount over max', () => { expect(isValidAmount(1_000_001)).toBe(false); });
  it('returns false for a string', () => { expect(isValidAmount('100')).toBe(false); });
  it('returns false for null', () => { expect(isValidAmount(null)).toBe(false); });
  it('returns false for undefined', () => { expect(isValidAmount(undefined)).toBe(false); });
  it('returns false for Infinity', () => { expect(isValidAmount(Infinity)).toBe(false); });
  it('returns false for NaN', () => { expect(isValidAmount(NaN)).toBe(false); });
  it('returns false for an object', () => { expect(isValidAmount({})).toBe(false); });
});

// ── isValidDate ───────────────────────────────────────────────────────────────

describe('isValidDate', () => {
  it('returns true for a valid ISO date string', () => { expect(isValidDate('2024-01-01')).toBe(true); });
  it('returns true for a full ISO datetime string', () => { expect(isValidDate('2024-01-01T12:00:00Z')).toBe(true); });
  it('returns false for an invalid date string', () => { expect(isValidDate('not-a-date')).toBe(false); });
  it('returns false for a number', () => { expect(isValidDate(1234567890)).toBe(false); });
  it('returns false for null', () => { expect(isValidDate(null)).toBe(false); });
  it('returns false for undefined', () => { expect(isValidDate(undefined)).toBe(false); });
  it('returns false for a Date object', () => { expect(isValidDate(new Date())).toBe(false); });
  it('returns false for an invalid date like "2024-13-01"', () => { expect(isValidDate('2024-13-01')).toBe(false); });
});

// ── AppError ──────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('creates with message, statusCode, and code', () => {
    const err = new AppError('test error', 422, 'TEST_CODE');
    expect(err.message).toBe('test error');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('TEST_CODE');
    expect(err.name).toBe('AppError');
    expect(err instanceof Error).toBe(true);
  });

  it('defaults statusCode to 500', () => {
    const err = new AppError('oops');
    expect(err.statusCode).toBe(500);
  });

  it('code is optional', () => {
    const err = new AppError('oops', 500);
    expect(err.code).toBeUndefined();
  });
});

// ── ValidationError ───────────────────────────────────────────────────────────

describe('ValidationError', () => {
  it('has statusCode 400 and code VALIDATION_ERROR', () => {
    const err = new ValidationError('bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.name).toBe('ValidationError');
    expect(err instanceof AppError).toBe(true);
  });
});

// ── NotFoundError ─────────────────────────────────────────────────────────────

describe('NotFoundError', () => {
  it('creates a "X not found" message with 404', () => {
    const err = new NotFoundError('User');
    expect(err.message).toBe('User not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});

// ── UnauthorizedError ─────────────────────────────────────────────────────────

describe('UnauthorizedError', () => {
  it('defaults to "Unauthorized" message with 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('accepts a custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
    expect(err.statusCode).toBe(401);
  });
});

// ── ForbiddenError ────────────────────────────────────────────────────────────

describe('ForbiddenError', () => {
  it('creates with statusCode 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
  });
});

// ── sendSuccess / sendError ───────────────────────────────────────────────────

describe('sendSuccess', () => {
  it('calls res.status and res.json with correct shape', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    sendSuccess(res, { id: '123' }, 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: '123' } });
  });

  it('defaults to status 200', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
    sendSuccess(res, 'ok');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('sendError', () => {
  it('calls res.status and res.json with error shape', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    sendError(res, 'Not found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Not found' });
  });

  it('defaults to status 400', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
    sendError(res, 'bad');
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
