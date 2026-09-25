# Subagent: integration-tests

## Your Task
Write integration tests that validate the complete multi-step expense approval workflow from end-to-end.

## Files to Read First
1. `docs/approval-workflow.md` — READ THIS FIRST. It defines the full state machine and all business rules.
2. `openapi.yaml` — for exact status codes at each step
3. `src/expenses/routes.ts`, `src/approvals/routes.ts`, `src/auth/routes.ts`
4. `src/db.ts` — for all database methods

## File to Write
- `tests/integration/expense-approval-flow.test.ts`

## Integration Test Structure

Unlike unit tests (which test one handler at a time), integration tests call multiple endpoints in sequence to validate complete business workflows. They test that the system behaves correctly when multiple steps happen together.

```typescript
import request from 'supertest';
import { createApp } from '../../src/app';
import { db } from '../../src/db';
import { generateAuthTokens } from '../../src/auth/tokens';
import { generateId } from '../../src/utils/helpers';

const app = createApp();
beforeEach(() => { db.reset(); });
```

## Required Integration Scenarios

### Scenario 1: Happy Path — Full Approval Flow
```
1. Employee registers → POST /auth/register → 201
2. Manager is seeded directly in db (no public register for manager role needed)
3. Employee creates expense → POST /expenses → 201, status: "draft"
4. Employee submits for approval → POST /expenses/:id/submit → 201, status: "submitted"
5. Manager approves → POST /approvals/:id/resolve {status: "approved"} → 200
6. Expense status is now "approved" → GET /expenses/:id → data.status === "approved"
7. Approval resolvedAt is set → GET /approvals/:id → data.resolvedAt is not null
```

### Scenario 2: Rejection Flow
```
1. Create employee + manager + draft expense (via db directly for speed)
2. Submit expense for manager approval
3. Manager rejects with comment → POST /approvals/:id/resolve {status: "rejected", comment: "Missing receipt"}
4. Expense status is now "rejected"
5. Approval comment is preserved
```

### Scenario 3: State Guard — Cannot Edit After Submit
```
1. Create and submit an expense (steps 1-4 above)
2. Employee tries to PATCH the submitted expense → 422
3. Employee tries to DELETE the submitted expense → 422
```

### Scenario 4: Double Resolution Guard
```
1. Create and submit expense
2. Manager approves it (first resolution → 200)
3. Manager tries to approve again → 422
4. Manager tries to reject it → 422
```

### Scenario 5: Wrong Approver
```
1. Employee submits expense with managerA as approver
2. managerB tries to resolve → 403
3. managerA resolves → 200 (this works)
```

### Scenario 6: Report After Approval
```
1. Create, submit, and approve an expense
2. Generate a report for the date range → POST /reports
3. The approved expense appears in the report
4. A rejected expense (from another scenario) does NOT appear in the report
```

## Coverage Target
- Tests should cover the complete workflow documented in `docs/approval-workflow.md`
- All 10 test requirements listed at the bottom of that document must be satisfied
