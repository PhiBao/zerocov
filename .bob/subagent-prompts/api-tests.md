# Subagent: api-tests

## Your Task
Write comprehensive unit tests for the expenses, approvals, and reports API handlers.

## Files to Read First
1. `openapi.yaml` — read the `/expenses`, `/approvals`, and `/reports` paths for required status codes and request shapes
2. `src/expenses/routes.ts`
3. `src/approvals/routes.ts`
4. `src/reports/routes.ts`
5. `src/db.ts` — for db.reset(), db.createUser(), db.createExpense(), etc.
6. `src/types.ts` — for all type definitions
7. `AGENTS.md` — for testing conventions

## Files to Write
- `tests/unit/expenses/routes.test.ts`
- `tests/unit/approvals/routes.test.ts`

## Test Patterns to Use

```typescript
import request from 'supertest';
import { createApp } from '../../../src/app';
import { db } from '../../../src/db';
import { generateAuthTokens } from '../../../src/auth/tokens';
import { generateId } from '../../../src/utils/helpers';

const app = createApp();

beforeEach(() => { db.reset(); });

const makeUser = (role: 'employee' | 'manager' | 'admin' = 'employee') =>
  db.createUser({ id: generateId(), email: `${role}@test.com`, passwordHash: 'x', name: 'T', role, createdAt: new Date() });

const authHeader = (user: ReturnType<typeof makeUser>) => {
  const { accessToken } = generateAuthTokens({ userId: user.id, email: user.email, role: user.role });
  return { Authorization: `Bearer ${accessToken}` };
};

const makeExpense = (userId: string, status = 'draft' as const) =>
  db.createExpense({ id: generateId(), userId, amount: 5000, category: 'travel', description: 'Test', status, createdAt: new Date(), updatedAt: new Date() });
```

## Required Test Coverage for Expenses

Per `openapi.yaml`:
1. `POST /expenses` with valid data → 201
2. `POST /expenses` with invalid amount (0 or negative) → 400
3. `POST /expenses` with invalid category → 400
4. `POST /expenses` without auth → 401
5. `GET /expenses` → 200 with user's expenses
6. `GET /expenses/:id` own expense → 200
7. `GET /expenses/:id` another user's expense as employee → 403
8. `GET /expenses/:id` non-existent → 404
9. `PATCH /expenses/:id` draft → 200
10. `PATCH /expenses/:id` submitted expense → 422
11. `DELETE /expenses/:id` draft → 200
12. `DELETE /expenses/:id` submitted expense → 422
13. `POST /expenses/:id/submit` with valid approver → 201
14. `POST /expenses/:id/submit` with employee as approver → 422
15. `POST /expenses/:id/submit` already submitted → 422

## Required Test Coverage for Approvals

Per `openapi.yaml` and business rules:
1. `GET /approvals` as manager → 200
2. `GET /approvals` as employee → 403
3. `GET /approvals/pending` → 200 with only pending items
4. `POST /approvals/:id/resolve` approve → 200, expense becomes approved
5. `POST /approvals/:id/resolve` reject → 200, expense becomes rejected
6. `POST /approvals/:id/resolve` already resolved → 422
7. `POST /approvals/:id/resolve` wrong approver → 403
8. `POST /approvals/:id/resolve` without auth → 401
9. `POST /approvals/:id/resolve` invalid status → 400

## Coverage Target
- `src/expenses/routes.ts`: 80%+
- `src/approvals/routes.ts`: 80%+
