# Test Strategy — ExpenseFlow API

## Coverage Baseline
- Current: 22.77% statements / 25.36% lines (1 suite, 14 tests)
- Target: 75%+ statements

## Risk Assessment

| Module | Current Coverage | Risk Level | Priority |
|---|---|---|---|
| `auth/middleware.ts` | 0% | CRITICAL | 1 |
| `auth/routes.ts` | 0% | CRITICAL | 1 |
| `auth/tokens.ts` | 0% | HIGH | 2 |
| `expenses/routes.ts` | 0% | HIGH | 2 |
| `approvals/routes.ts` | 0% | HIGH | 2 |
| `reports/routes.ts` | 0% | MEDIUM | 3 |
| `db.ts` | 0% | MEDIUM | 3 |
| `utils/helpers.ts` | partial (43%) | LOW | 4 |

## Test Layers

### Layer 1: Unit — Utils (`tests/unit/utils/`)
Target: `src/utils/helpers.ts` — 95%+. All validators, formatters, error classes,
and response helpers.

### Layer 2: Unit — Auth (`tests/unit/auth/`)
Target: `src/auth/tokens.ts`, `src/auth/middleware.ts`, `src/auth/routes.ts` — 85%+.
Key behaviors from `docs/auth-security-requirements.md` and `openapi.yaml`:
- every status code in the security requirements table (401/403/200/201/409/400)
- expired, malformed, and tampered tokens
- role enforcement (employee vs manager vs admin)
- no user enumeration on login

### Layer 3: Unit — API Handlers (`tests/unit/expenses/`, `tests/unit/approvals/`, `tests/unit/reports/`)
Target: 80%+.
- expense CRUD, ownership (403), state guards (422), amount validation per `openapi.yaml`
- approval resolution paths and double-resolution guard
- report date validation, category filters, JSON summary, CSV export

### Layer 4: Integration (`tests/integration/`)
Scenarios from `docs/approval-workflow.md`:
- create → submit → approve → expense approved
- create → submit → reject → expense rejected
- state guards after submission
- approved expenses appear in reports; rejected do not

## Subagent Assignments
- `auth-tests`: Layer 2 completely
- `api-tests`: Layer 3 completely
- `integration-tests`: Layer 4 completely
- `utils-tests`: Layer 1 remaining

## Spec Divergences Found (VERIFY step)

1. `auth/middleware.ts` returned 500 for invalid/expired tokens; spec requires 401
   (`EXP-TOKEN-401`). Fixed.
2. `expenses/routes.ts` POST/PATCH accepted non-integer, non-finite, and above-cap
   amounts; `openapi.yaml` requires `type: integer, minimum: 1`. Fixed; the shared
   `isValidAmount()` helper now enforces integer cents.

---

*Reconstructed from the ZeroCov session output for repository completeness; the
original was produced in Plan mode in IBM Bob 2.0.*
