# Subagent: auth-tests

## Your Task
Write comprehensive unit tests for the authentication module of the ExpenseFlow API.

## Files to Read First
1. `docs/auth-security-requirements.md` — READ THIS FIRST. It defines the exact HTTP status codes required. Any discrepancy between this doc and the code is a **bug** that must be reported.
2. `openapi.yaml` — read only the `/auth/*` paths section for expected request/response shapes.
3. `src/auth/middleware.ts` — authenticate() and requireRole() middleware
4. `src/auth/tokens.ts` — JWT sign/verify helpers
5. `src/auth/routes.ts` — register, login, refresh, logout, /me routes
6. `src/db.ts` — for the db.reset() and db.createUser() methods
7. `tests/setup.ts` — to understand test environment variables

## Files to Write
- `tests/unit/auth/middleware.test.ts`
- `tests/unit/auth/tokens.test.ts`
- `tests/unit/auth/routes.test.ts`

## Test Patterns to Use

```typescript
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../../src/app';
import { db } from '../../../src/db';
import { generateAuthTokens, signAccessToken } from '../../../src/auth/tokens';
import { generateId } from '../../../src/utils/helpers';

const app = createApp();

beforeEach(() => { db.reset(); });

// Helper
const makeUser = (role: 'employee' | 'manager' | 'admin' = 'employee') =>
  db.createUser({ id: generateId(), email: `${role}@test.com`, passwordHash: '$2b$10$abc', name: `Test`, role, createdAt: new Date() });
```

## Required Coverage: Auth Security Requirements

`docs/auth-security-requirements.md` defines the exact HTTP status code required
for every auth scenario: missing/malformed/invalid/expired access tokens, bad
credentials, duplicate registration, weak passwords, and invalid refresh tokens.
Read that table and write at least one test per scenario.

Do not weaken an assertion to match the implementation. If the code returns a
different status code than the document requires, report it as a spec violation
using the `BUG FOUND` format from `.bob/rules/testing-standards.md`.

## Coverage Target
- `src/auth/middleware.ts`: 85%+
- `src/auth/tokens.ts`: 90%+
- `src/auth/routes.ts`: 85%+
