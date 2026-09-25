# Subagent: utils-tests

## Your Task
Extend the existing utility test coverage to reach 95%+ on `src/utils/helpers.ts`.

## Files to Read First
1. `src/utils/helpers.ts` — see all exported functions and classes
2. `tests/unit/utils/helpers.baseline.test.ts` — existing tests (do NOT duplicate these)

## File to Write
- `tests/unit/utils/helpers.extended.test.ts`

## What's Already Tested (in helpers.baseline.test.ts — do NOT re-test these)
- `isValidEmail` — basic cases
- `isNonEmptyString` — basic cases
- `formatAmount` — basic cases
- `formatDateRange` — basic cases
- `sanitizeString` — basic cases
- `generateId` — basic cases

## What Needs Testing (NOT yet covered)

### `isValidAmount(amount: unknown): boolean`
```typescript
// From src/utils/helpers.ts:
// Returns true only when: typeof amount === 'number', isFinite, Number.isInteger,
// amount > 0, amount <= 1_000_000
isValidAmount(100)          // true
isValidAmount(0)            // false — zero not valid
isValidAmount(-50)          // false — negative not valid
isValidAmount(10.5)         // false — not an integer (amounts are cents)
isValidAmount(1_000_001)    // false — over max
isValidAmount('100')        // false — string
isValidAmount(null)         // false — null
isValidAmount(undefined)    // false — undefined
isValidAmount(Infinity)     // false — not finite
isValidAmount(NaN)          // false — not finite
```

### `isValidDate(dateStr: unknown): boolean`
```typescript
isValidDate('2024-01-01')     // true
isValidDate('2024-13-01')     // false — invalid month
isValidDate('not a date')     // false
isValidDate(null)             // false
isValidDate(undefined)        // false
isValidDate(new Date())       // false — object not string
```

### `AppError` class
```typescript
const err = new AppError('test error', 422, 'TEST_CODE');
expect(err.message).toBe('test error');
expect(err.statusCode).toBe(422);
expect(err.code).toBe('TEST_CODE');
expect(err.name).toBe('AppError');
expect(err instanceof Error).toBe(true);

// Default statusCode
const err2 = new AppError('oops');
expect(err2.statusCode).toBe(500);
```

### `ValidationError` class
```typescript
const err = new ValidationError('bad input');
expect(err.statusCode).toBe(400);
expect(err.code).toBe('VALIDATION_ERROR');
expect(err.name).toBe('ValidationError');
expect(err instanceof AppError).toBe(true);
```

### `NotFoundError` class
```typescript
const err = new NotFoundError('User');
expect(err.message).toBe('User not found');
expect(err.statusCode).toBe(404);
expect(err.code).toBe('NOT_FOUND');
```

### `UnauthorizedError` class
```typescript
const err = new UnauthorizedError();
expect(err.statusCode).toBe(401);
const err2 = new UnauthorizedError('custom message');
expect(err2.message).toBe('custom message');
```

### `ForbiddenError` class
```typescript
const err = new ForbiddenError();
expect(err.statusCode).toBe(403);
```

### `sendSuccess` and `sendError`
These require a mock Express Response object. Use jest.fn() mocks:

```typescript
const mockRes = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
} as unknown as Response;

sendSuccess(mockRes, { id: '123' }, 201);
expect(mockRes.status).toHaveBeenCalledWith(201);
expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: { id: '123' } });

sendError(mockRes, 'Not found', 404);
expect(mockRes.status).toHaveBeenCalledWith(404);
expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Not found' });
```

## Coverage Target
- `src/utils/helpers.ts`: 95%+
