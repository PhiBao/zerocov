# ExpenseFlow API — AGENTS.md

## Project Overview

ExpenseFlow is a Node.js + TypeScript REST API for expense tracking and multi-step approval workflows. Employees submit expenses, managers approve or reject them, and admins can generate reports.

**This is the sample project used by the ZeroCov workflow on IBM Bob 2.0.** It is a realistic, production-shaped API with a deliberately thin baseline test suite. The goal of the workflow is to take it from ~22.8% to 75%+ statement coverage using Agent mode, parallel subagents, and document understanding.

**The specifications are the source of truth** — not the current implementation:

- `openapi.yaml` — the HTTP contract (status codes, request/response schemas)
- `docs/auth-security-requirements.md` — required auth status codes (e.g. `EXP-TOKEN-401`)
- `docs/approval-workflow.md` — the expense approval state machine

Any behavior in `src/` that contradicts these documents is a defect to be reported (and, where appropriate, fixed), not a behavior to encode into tests.

## Technology Stack

- **Runtime**: Node.js 22, TypeScript 5
- **Framework**: Express 4
- **Auth**: JWT (jsonwebtoken), bcryptjs
- **Database**: In-memory (InMemoryDatabase class in `src/db.ts`) — no external DB needed
- **Testing**: Jest 29 + ts-jest + Supertest
- **Package manager**: pnpm

## Directory Structure

```
src/
  types.ts              # All shared TypeScript types and interfaces
  db.ts                 # In-memory database (InMemoryDatabase class)
  app.ts                # Express app factory (createApp)
  index.ts              # Entry point (starts server)
  auth/
    tokens.ts           # JWT sign/verify helpers
    middleware.ts       # authenticate() and requireRole() middleware
    routes.ts           # POST /auth/register, /login, /refresh, /logout; GET /auth/me
  expenses/
    routes.ts           # GET/POST/PATCH/DELETE /expenses; POST /expenses/:id/submit
  approvals/
    routes.ts           # GET /approvals, /approvals/pending, /:id; POST /:id/resolve
  reports/
    routes.ts           # GET/POST /reports, GET /reports/:id
  notifications/
    service.ts          # NotificationService (mocked email, no real sending)
  utils/
    helpers.ts          # generateId, sendSuccess, sendError, validation/formatting utils, error classes

tests/
  setup.ts              # Jest env vars (JWT secrets for tests)
  coverage-setup.ts     # Force-imports all source modules for coverage reporting
  unit/
    utils/              # helpers.baseline.test.ts (pre-session) + helpers.extended.test.ts
    auth/               # middleware.test.ts, tokens.test.ts, routes.test.ts
    expenses/           # routes.test.ts
    approvals/          # routes.test.ts
    reports/            # routes.test.ts
  integration/          # expense-approval-flow.test.ts

docs/
  approval-workflow.md  # Business logic: expense approval state machine
  auth-security-requirements.md  # Security requirements for auth endpoints

openapi.yaml            # Full OpenAPI 3.0 specification for all endpoints
```

## Key Architectural Patterns

- **In-memory DB**: The `InMemoryDatabase` class in `src/db.ts` has a `reset()` method — call `db.reset()` in `beforeEach` to isolate tests.
- **App factory**: `createApp()` in `src/app.ts` returns a fresh Express app. Use this in tests with Supertest: `const app = createApp()`.
- **Error classes**: `AppError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError` in `utils/helpers.ts`.
- **Response shapes**: All routes use `sendSuccess(res, data, statusCode)` and `sendError(res, message, statusCode)` from `utils/helpers.ts`. Responses are always `{ success: boolean, data?, error? }`.
- **Amounts** are integers in cents. Validation is centralized in `isValidAmount()` in `utils/helpers.ts` — routes should reuse it rather than re-implementing checks.
- **Auth**: JWT Bearer tokens. The `authenticate` middleware adds `req.user: TokenPayload` to the request.

## Testing Conventions

- Use `supertest` with `createApp()` for HTTP-level tests.
- Call `db.reset()` in `beforeEach` to reset state between tests.
- Create test users with `db.createUser(...)` and generate tokens with `generateAuthTokens(...)`.
- Import `db` from `'../../src/db'` (or appropriate relative path).
- Import `createApp` from `'../../src/app'`.
- Import auth helpers from `'../../src/auth/tokens'`.
- Test files go in `tests/unit/<module>/` for unit tests and `tests/integration/` for multi-step flows.
- Assert the status code the spec requires. Never weaken an assertion to make a failing test pass.

## Running Tests

```bash
# Run the suite with coverage
pnpm test:coverage

# Reproduce the pre-session baseline (22.8% statements)
git checkout zerocov-baseline
pnpm test:coverage
```

## Environment Variables (for tests — set in tests/setup.ts)

```
JWT_SECRET=test-secret-do-not-use-in-production
JWT_REFRESH_SECRET=test-refresh-secret-do-not-use-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=test
```
