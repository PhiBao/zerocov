# Testing Standards — Bob Rules

These rules apply to every conversation in this project when writing or reviewing tests.

## Mandatory Behaviors

1. **Always read the spec first.** Before writing tests for any endpoint or module, read `@openapi.yaml` and the relevant document in `@docs/`. Tests must validate what the spec says should happen.

2. **Always read AGENTS.md first.** Before any session, internalize the project structure, testing conventions, and commands documented in `@AGENTS.md`.

3. **Reset the database between tests.** Every test file must call `db.reset()` in `beforeEach`. Failing to reset state makes tests unreliable and order-dependent.

4. **Use createApp() for HTTP tests.** Never import the running server. Always use `const app = createApp()` with supertest.

5. **Match OpenAPI status codes exactly.** If openapi.yaml says 401, the test MUST assert `expect(res.status).toBe(401)` — not 500, not "any 4xx". Discrepancies between spec and code are bugs that must be reported.

6. **Test both happy path AND error paths.** Every 400, 401, 403, 404, and 422 response in the OpenAPI spec needs at least one test.

7. **Do not mock auth middleware away.** Tests must exercise the real authentication flow. Never do `jest.mock('../auth/middleware')` without strong justification.

8. **Report spec violations.** If you discover that the implementation does not match the OpenAPI spec, report it clearly as: "**BUG FOUND**: [description]. Spec requires [X], code returns [Y]."

9. **Never weaken an assertion to make a failing test pass.** If the test encodes a spec requirement and the code disagrees, fix the code (or report the divergence for human review). Do not change the expected status code to match the bug.

## Coverage Targets

- `src/auth/`: 85%+ coverage
- `src/expenses/`: 80%+ coverage  
- `src/approvals/`: 80%+ coverage
- `src/reports/`: 75%+ coverage
- `src/utils/helpers.ts`: 95%+ coverage
- Overall target: 75%+ lines
