/**
 * In-memory database for the ExpenseFlow API.
 * In a real application this would be PostgreSQL via an ORM.
 * Kept simple for the hackathon demo so no database setup is needed.
 */
import {
  User,
  Expense,
  ApprovalRequest,
  Report,
  ExpenseCategory,
  ExpenseStatus,
} from './types';
import { generateId } from './utils/helpers';

class InMemoryDatabase {
  private users: Map<string, User> = new Map();
  private expenses: Map<string, Expense> = new Map();
  private approvals: Map<string, ApprovalRequest> = new Map();
  private reports: Map<string, Report> = new Map();

  // ── Users ──────────────────────────────────────────────────────────────────

  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  findUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  findUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return user;
    }
    return undefined;
  }

  listUsers(): User[] {
    return Array.from(this.users.values());
  }

  // ── Expenses ───────────────────────────────────────────────────────────────

  createExpense(expense: Expense): Expense {
    this.expenses.set(expense.id, expense);
    return expense;
  }

  findExpenseById(id: string): Expense | undefined {
    return this.expenses.get(id);
  }

  updateExpense(id: string, updates: Partial<Expense>): Expense | undefined {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    const updated = { ...expense, ...updates, updatedAt: new Date() };
    this.expenses.set(id, updated);
    return updated;
  }

  deleteExpense(id: string): boolean {
    return this.expenses.delete(id);
  }

  listExpensesByUser(userId: string): Expense[] {
    return Array.from(this.expenses.values()).filter(e => e.userId === userId);
  }

  listExpensesByStatus(status: ExpenseStatus): Expense[] {
    return Array.from(this.expenses.values()).filter(e => e.status === status);
  }

  listExpensesByDateRange(from: Date, to: Date, categories?: ExpenseCategory[]): Expense[] {
    return Array.from(this.expenses.values()).filter(e => {
      const inRange = e.createdAt >= from && e.createdAt <= to;
      if (!inRange) return false;
      if (categories && categories.length > 0) return categories.includes(e.category);
      return true;
    });
  }

  // ── Approvals ──────────────────────────────────────────────────────────────

  createApproval(approval: ApprovalRequest): ApprovalRequest {
    this.approvals.set(approval.id, approval);
    return approval;
  }

  findApprovalById(id: string): ApprovalRequest | undefined {
    return this.approvals.get(id);
  }

  findApprovalByExpenseId(expenseId: string): ApprovalRequest | undefined {
    for (const approval of this.approvals.values()) {
      if (approval.expenseId === expenseId) return approval;
    }
    return undefined;
  }

  updateApproval(id: string, updates: Partial<ApprovalRequest>): ApprovalRequest | undefined {
    const approval = this.approvals.get(id);
    if (!approval) return undefined;
    const updated = { ...approval, ...updates };
    this.approvals.set(id, updated);
    return updated;
  }

  listApprovalsByApproverId(approverId: string): ApprovalRequest[] {
    return Array.from(this.approvals.values()).filter(a => a.approverId === approverId);
  }

  listApprovalsByStatus(status: ApprovalRequest['status']): ApprovalRequest[] {
    return Array.from(this.approvals.values()).filter(a => a.status === status);
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  createReport(report: Report): Report {
    this.reports.set(report.id, report);
    return report;
  }

  findReportById(id: string): Report | undefined {
    return this.reports.get(id);
  }

  listReportsByUser(userId: string): Report[] {
    return Array.from(this.reports.values()).filter(r => r.userId === userId);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Reset all data — used in tests */
  reset(): void {
    this.users.clear();
    this.expenses.clear();
    this.approvals.clear();
    this.reports.clear();
  }

  /** Seed basic test data */
  seed(): void {
    // Seeded data is handled in test setup files
  }
}

export const db = new InMemoryDatabase();
