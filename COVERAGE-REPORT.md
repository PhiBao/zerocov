# Coverage Report — ExpenseFlow API (ZeroCov session)

All numbers below are reproducible with `pnpm test:coverage` (see
[REPRODUCING.md](REPRODUCING.md)).

## Summary

| Metric | Before | After | Delta |
|---|---|---|---|
| Statements | 22.77% | **89.46%** | +66.69 pp |
| Lines | 25.36% | **91.57%** | +66.21 pp |
| Branches | 5.00% | **77.31%** | +72.31 pp |
| Functions | 10.46% | **80.00%** | +69.54 pp |
| Test suites | 1 | **9** | +8 |
| Test cases | 14 | **145** | +131 |
| Time to produce | ~2–3 weeks (manual estimate) | **~25 minutes (Bob session)** | — |

## By Module

| Module | Before | After | Notes |
|---|---|---|---|
| `auth/middleware.ts` | 0% | **90.5%** | Divergence found and fixed (500 → 401) |
| `auth/routes.ts` | 0% | **96.2%** | register / login / refresh / logout / me |
| `auth/tokens.ts` | 0% | **100%** | JWT sign/verify fully covered |
| `expenses/routes.ts` | 0% | **87.8%** | CRUD + submit; amount validation divergence fixed |
| `approvals/routes.ts` | 0% | **97.6%** | All approval resolution paths |
| `reports/routes.ts` | 0% | **100%** | JSON + CSV report generation |
| `db.ts` | 0% | **80.0%** | Commonly used DB methods |
| `utils/helpers.ts` | partial (43%) | **100%** | All functions + error classes |
| `notifications/service.ts` | 0% | 26.7% | Mocked service; intentionally out of session scope |

## Findings — spec divergences detected and fixed

Both findings were produced by tests that assert the contract in `openapi.yaml` /
`docs/`, not the current behavior. The test commits fail until the fix commits land.

### Finding 1 — `auth/middleware.ts`: expired/invalid JWTs returned 500 instead of 401

**Spec**: `docs/auth-security-requirements.md` → `EXP-TOKEN-401`: *"Expired tokens
MUST return 401, not 500."* `openapi.yaml` documents 401 for invalid/expired tokens on
every authenticated route.

**Root cause**: the `catch` block in `authenticate()` re-threw every JWT error, so
`TokenExpiredError` propagated to the Express global error handler and became a 500.

**Fix**: return 401 for every token verification failure (missing, malformed, invalid
signature, expired) in the middleware itself.

**Detected by**: `tests/unit/auth/middleware.test.ts` — "returns 401 (not 500) for an
expired access token".

### Finding 2 — `expenses/routes.ts`: amount validation bypassed the shared validator

**Spec**: `openapi.yaml` declares `amount` as `type: integer, minimum: 1` (cents).

**Root cause**: `POST /expenses` and `PATCH /expenses/:id` used an inline
`typeof amount !== 'number' || amount <= 0` check instead of the shared
`isValidAmount()` helper. Non-integer amounts (e.g. `10.5`), non-finite amounts (raw
JSON `1e999` parses to `Infinity`), and amounts above the $10,000 business cap were
accepted. `isValidAmount()` itself did not enforce the documented integer type.

**Fix**: both routes now call `isValidAmount()`, and the helper enforces
`Number.isInteger`, finiteness, `> 0`, and the cap.

**Detected by**: `tests/unit/expenses/routes.test.ts` — non-integer, above-cap, and
non-finite cases for POST and PATCH.

## How IBM Bob 2.0 features were used

### Document understanding
Bob read the three specification documents before writing a test:
- `openapi.yaml` — required HTTP status codes and schemas per endpoint
- `docs/auth-security-requirements.md` — the status-code table, including `EXP-TOKEN-401`
- `docs/approval-workflow.md` — the approval state machine for integration tests

This is what makes the tests spec-driven: a test derived from current behavior alone
would have encoded the 500 as correct and the amount bypass as acceptable.

### Plan mode
Produced `TEST-STRATEGY.md` (risk-ranked modules, layer assignments, per-module
behaviors from the specs, four subagent workstreams) for human review before any test
was written.

### Parallel subagents
Four subagents ran simultaneously with isolated context:

| Subagent | Scope | Output |
|---|---|---|
| `auth-tests` | JWT tokens, middleware, auth routes | `tests/unit/auth/*` |
| `api-tests` | Expenses, approvals, reports handlers | `tests/unit/expenses/`, `tests/unit/approvals/`, `tests/unit/reports/` |
| `integration-tests` | Full approval workflow | `tests/integration/` |
| `utils-tests` | Helpers + error classes | `tests/unit/utils/helpers.extended.test.ts` |

### Agent mode
Ran `pnpm test:coverage`, read the failure output, cross-referenced the specs, applied
the source fixes, and re-ran until green.

### Rules, skills, and project context
`.bob/rules/testing-standards.md`, `.bob/skills/test-strategist/SKILL.md`, and
`AGENTS.md` keep all subagents aligned on spec-driven testing and prevent assertions
from being weakened to match buggy behavior.
