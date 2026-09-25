# ExpenseFlow API

A Node.js + TypeScript REST API for expense tracking and multi-step approval
workflows. Employees submit expenses, managers approve or reject them, and admins
generate reports.

This is the sample project used by the **ZeroCov** workflow (IBM Bob 2.0), which
takes a low-coverage codebase to a spec-driven test suite in one session.

## Stack

Node.js 22 · TypeScript 5 · Express 4 · Jest 29 + Supertest · JWT · bcryptjs · pnpm

## Getting started

```bash
pnpm install
pnpm test:coverage   # run the test suite with coverage
pnpm dev             # start the API (ts-node)
```

## API contract and business rules

The specifications are the source of truth:

- [`openapi.yaml`](openapi.yaml) — full HTTP contract (status codes, schemas)
- [`docs/approval-workflow.md`](docs/approval-workflow.md) — approval state machine
- [`docs/auth-security-requirements.md`](docs/auth-security-requirements.md) — required auth status codes

## Project structure

```
src/
  auth/          JWT tokens, authenticate/requireRole middleware, auth routes
  expenses/      Expense CRUD + submit
  approvals/     Multi-step approval resolution
  reports/       Date-range report generation (JSON + CSV)
  notifications/ Mocked notification service
  utils/         Shared helpers, validation, error classes
  db.ts          In-memory database with reset()
  app.ts         Express app factory
tests/           Jest + Supertest suites
docs/            Business and security specifications
.bob/            IBM Bob rules, skills, and subagent prompts
```

## License

MIT — see [LICENSE](LICENSE).
