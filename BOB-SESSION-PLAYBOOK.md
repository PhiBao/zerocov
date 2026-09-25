# ZeroCov — IBM Bob 2.0 Session Playbook

This file contains the exact prompts to paste into IBM Bob IDE to run the full ZeroCov workflow. Copy each prompt verbatim. Do not paraphrase.

---

## PRE-SESSION CHECKLIST

Before opening IBM Bob, verify:
- [ ] The workspace is a fresh worktree checked out at `zerocov-baseline` (pre-session state)
- [ ] IBM Bob IDE is open with `expense-flow-api/` as the workspace root
- [ ] Terminal confirms baseline: `pnpm test:coverage` → ~22.8% statements
- [ ] All source files are visible in the file explorer
- [ ] `AGENTS.md`, `openapi.yaml`, `docs/` are visible

**Operator note**: the fixture contains spec divergences by design. The workflow is
expected to surface them via spec-driven tests. Do not tell Bob where they are — the
detection is the demonstration.

---

## PROMPT 1 — SESSION OPENER (paste this first)

Paste into Bob chat (Agent mode):

```
@AGENTS.md @openapi.yaml @docs/auth-security-requirements.md @docs/approval-workflow.md

I need you to act as a test engineer for this project. Our codebase has ~22.8% test coverage. Critical paths — auth, expenses, approvals — have 0% test coverage. We need to reach 75%+ in one session.

Please follow this workflow exactly:

STEP 1: Read all the attached documents carefully. Then run `pnpm test:coverage` to see the current baseline.

STEP 2: Switch to Plan mode and create a file called TEST-STRATEGY.md in the project root. The strategy must cover:
- A risk assessment table showing each module's coverage and priority
- Which test layer (unit/integration) covers which module
- What specific behaviors to test from the OpenAPI spec and business docs
- Which 4 subagent workstreams will write the tests in parallel

Wait for my approval before writing any tests.
```

**Expected Bob behavior**: Bob reads the documents, runs `pnpm test:coverage`, shows the 22% baseline, switches to Plan mode, and produces `TEST-STRATEGY.md`.

---

## PROMPT 2 — APPROVE THE STRATEGY (paste after reviewing TEST-STRATEGY.md)

Read TEST-STRATEGY.md first. If it looks good:

```
TEST-STRATEGY.md looks good. Proceed with implementation.

STEP 3: Now spawn 4 subagents in parallel to write tests simultaneously:

Subagent 1 — "auth-tests":
  Read: src/auth/middleware.ts, src/auth/tokens.ts, src/auth/routes.ts
  Read: docs/auth-security-requirements.md, openapi.yaml (auth paths only)
  Write: tests/unit/auth/middleware.test.ts, tests/unit/auth/tokens.test.ts, tests/unit/auth/routes.test.ts
  Cover every status code required by the security requirements table. Assert the
  documented status code, never the current behavior. Divergences are bugs to report.

Subagent 2 — "api-tests":
  Read: src/expenses/routes.ts, src/approvals/routes.ts, src/reports/routes.ts
  Read: openapi.yaml (expenses, approvals, reports paths)
  Write: tests/unit/expenses/routes.test.ts, tests/unit/approvals/routes.test.ts, tests/unit/reports/routes.test.ts

Subagent 3 — "integration-tests":
  Read: docs/approval-workflow.md, openapi.yaml
  Read: src/auth/routes.ts, src/expenses/routes.ts, src/approvals/routes.ts
  Write: tests/integration/expense-approval-flow.test.ts
  Test the complete workflow: employee registers → creates expense → submits for approval → manager approves → expense is approved

Subagent 4 — "utils-tests":
  Read: src/utils/helpers.ts, tests/unit/utils/helpers.baseline.test.ts
  Write: tests/unit/utils/helpers.extended.test.ts
  Cover all currently uncovered functions: isValidAmount, isValidDate, AppError classes, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError

Spawn all 4 subagents simultaneously. Do not wait for one to finish before starting the next.
```

**Expected Bob behavior**: Bob spawns 4 subagents — you'll see them appear in the Bob interface one after another. Each runs independently and reports back. Takes 3-5 minutes.

---

## PROMPT 3 — VERIFY AND FIX (paste after all 4 subagents complete)

```
All subagents have finished. Now:

STEP 4: Run the full test suite with coverage:
pnpm test:coverage

Read the output carefully.
- For any failing tests: read the test, read the source file, understand why it fails
- If the test is correct and the code is wrong → fix the SOURCE code and explain what bug you found
- If the test is wrong → fix the TEST and explain what was incorrect

After fixing, run pnpm test:coverage again.

Report back with:
1. How many tests failed initially
2. Which failures were bugs in the code vs errors in the tests
3. The final coverage percentage
```

**Expected Bob behavior**: Bob runs tests and sees failures only where the implementation diverges from the specs. It separates test errors from source defects, reports each as **"BUG FOUND: spec requires [X], code returns [Y]"**, fixes the source, and re-runs until green.

---

## PROMPT 4 — COVERAGE REPORT (paste after tests pass)

```
STEP 5: Generate a coverage summary report. Create a file called COVERAGE-REPORT.md with:

# Coverage Report — ExpenseFlow API

## Summary
- Session date: [today]
- Before: [X]% statements
- After: [Y]% statements
- Tests added: [N]
- Bugs found: [list any bugs discovered]

## By Module
[table with before/after per module]

## Bugs Found and Fixed
[detailed description of each bug found during testing]

## How IBM Bob 2.0 Features Were Used
- Document understanding: [what docs were read and why they mattered]
- Plan mode: [what the strategy covered]
- Subagents: [which subagent wrote which tests]
- Agent mode: [what it ran and fixed]
```

**Expected Bob behavior**: Creates COVERAGE-REPORT.md with the final numbers and bug descriptions.

---

## PROMPT 5 — CREATE PR (final step)

```
STEP 6: Create a pull request for all the test files added in this session.

/create-pr

The PR title should be: "feat(tests): ZeroCov session — 22.8% → 89.5% statement coverage via IBM Bob 2.0"

The description should include:
- Summary of coverage improvement
- List of bugs discovered
- Which IBM Bob features were used (document understanding, Plan mode, parallel subagents, Agent mode)
```

**Expected Bob behavior**: Runs `/create-pr` workflow, generates PR description, creates the PR.

---

## FALLBACK PROMPTS

### If a subagent produces broken TypeScript:
```
The tests from the [auth-tests / api-tests / integration-tests / utils-tests] subagent have TypeScript compilation errors. Please read the errors from `pnpm test:coverage` output and fix the type errors in the affected test files.
```

### If coverage target is missed (< 70%):
```
Coverage is at [X]%. We need 75%+. Please analyze the coverage report and identify which uncovered lines would be easiest to add tests for to reach the target. Add those tests now.
```

### If no spec divergence is reported:
```
Go back to docs/auth-security-requirements.md and openapi.yaml and enumerate every
required status code. For each one, confirm a test asserts it. Where a test is
missing, add it — then compare the actual response with the documented one and report
any mismatch as a spec divergence.
```
