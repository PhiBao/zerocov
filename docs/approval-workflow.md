# Approval Workflow — Business Logic Reference

## Overview

The ExpenseFlow approval workflow governs how an employee's expense request moves from creation to final payment. This document is the authoritative source for what behavior the system must implement and what tests must validate.

## States

```
draft → submitted → approved → paid
                  ↘ rejected
```

| State | Description |
|---|---|
| `draft` | Created by employee; can be edited or deleted |
| `submitted` | Submitted for review; employee names an approver |
| `approved` | Approved by the designated manager/admin |
| `rejected` | Rejected by the designated manager/admin |
| `paid` | Payment processed (admin only action, not yet implemented) |

## Transitions

### draft → submitted
- Trigger: `POST /expenses/:id/submit`
- Actor: The expense's owner (employee)
- Preconditions:
  - Expense must be in `draft` state
  - `approverId` must be provided in request body
  - Approver must exist in the system
  - Approver must have role `manager` or `admin`
- Side effects:
  - Expense status changes to `submitted`
  - An `ApprovalRequest` record is created with `status: 'pending'`
  - Notification sent to approver (mocked)

### submitted → approved
- Trigger: `POST /approvals/:id/resolve` with `{ status: "approved" }`
- Actor: The designated approver only (approverId must match req.user.userId)
- Preconditions:
  - ApprovalRequest must exist and be in `pending` status
  - Only the designated approver can resolve (not any manager)
- Side effects:
  - ApprovalRequest status changes to `approved`
  - Expense status changes to `approved`
  - `resolvedAt` timestamp set
  - Notification sent to requester (mocked)

### submitted → rejected
- Trigger: `POST /approvals/:id/resolve` with `{ status: "rejected" }`
- Actor: The designated approver only
- Preconditions: Same as above
- Side effects:
  - ApprovalRequest status changes to `rejected`
  - Expense status changes to `rejected`
  - `resolvedAt` timestamp set
  - Optional `comment` recorded
  - Notification sent to requester (mocked)

### Once resolved, no further transitions
- An ApprovalRequest in `approved` or `rejected` state cannot be re-resolved
- Attempting to resolve again returns HTTP 422

## Business Rules

1. **Single approval per expense**: Only one ApprovalRequest can exist per expense.
2. **Self-approval forbidden**: An employee cannot name themselves as approver (enforced by role check — employees cannot be approvers).
3. **Approver identity locked**: The approver is fixed when the expense is submitted; it cannot be changed after submission.
4. **Draft-only editing**: Expenses in any state other than `draft` cannot be modified or deleted.
5. **Report inclusion**: Only `approved` and `paid` expenses appear in reports.

## Test Requirements

Tests covering the approval workflow must verify:

1. **Happy path**: employee creates → submits → manager approves → expense is `approved`
2. **Rejection path**: employee creates → submits → manager rejects → expense is `rejected`
3. **Invalid approver**: submitting with a non-existent approver returns 404
4. **Employee-as-approver**: submitting with employee role approver returns 422
5. **Double resolution**: resolving an already-resolved approval returns 422
6. **Wrong approver**: a different manager trying to resolve someone else's assignment returns 403
7. **State guard**: editing a submitted expense returns 422
8. **State guard**: deleting a submitted expense returns 422
9. **Authorization**: unauthenticated resolve request returns 401
10. **Role guard**: employee role cannot call the resolve endpoint (returns 403)
