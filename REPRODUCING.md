# Reproducing the ZeroCov before/after

Every number in this repository is reproducible with `pnpm test:coverage`. No
database, network, or external service is required.

## 1. Baseline — before the session

```bash
pnpm install
git checkout zerocov-baseline
pnpm test:coverage
```

Expected: `22.77%` statements, `25.36%` lines, `1` test suite, `14` passing tests
(captured in [`docs/coverage-before.txt`](docs/coverage-before.txt)).
Critical paths (`auth/`, `expenses/`, `approvals/`, `reports/`) are at 0%.
`src/auth/middleware.ts` re-throws all JWT errors, so expired tokens produce 500.

## 2. Red — tests first (the failing state)

The session branch commits the test suites and the source fixes separately, so the
red state is preserved in git history:

```bash
git log --oneline zerocov/coverage-session
#   fix(expenses): validate amounts with the shared isValidAmount helper
#   fix(auth): return 401 for all token verification failures (EXP-TOKEN-401)
#   test(zerocov): add spec-driven suites (auth, expenses, approvals, reports, integration)

# Check out the test commit (the one before the first fix commit)
git checkout bec33ea
pnpm test:coverage
```

Expected: **8 failed, 137 passed** — failures only where the implementation diverges
from the spec: 3 token-handling cases (invalid, tampered, expired all return 500
instead of 401) and 5 amount-validation cases (non-integer, above-cap, and non-finite
amounts accepted instead of rejected). The captured output is in
[`docs/red-state-failures.txt`](docs/red-state-failures.txt). This is the failure
output that drives the VERIFY step of the workflow.

## 3. Green — after the fixes

```bash
git checkout main
pnpm test:coverage
```

Expected: `89.46%` statements, `91.57%` lines, `9` suites, `145` passing tests
(captured in [`docs/coverage-after.txt`](docs/coverage-after.txt)).

## 4. Re-running the workflow with IBM Bob 2.0

The fixture is designed to be re-driven from the baseline:

1. `git checkout zerocov-baseline` in a fresh worktree.
2. Open the worktree in IBM Bob 2.0.
3. Follow `BOB-SESSION-PLAYBOOK.md` verbatim.

The playbook intentionally does **not** name the defects or their fixes. The
subagents discover them by reading `openapi.yaml` and `docs/` and asserting the
documented status codes.

## Notes on the git history

This repository was published after the Bob session, so the git history is a
**reconstruction** for reproducibility, not the original session log:

- `zerocov-baseline` reconstructs the pre-session state (thin baseline suite, source
  defects present).
- `zerocov/coverage-session` replays the session output as separate test and fix
  commits so the red → green transition is auditable.
- The original Bob task session evidence is preserved as screenshots in
  `bob_sessions/`.
