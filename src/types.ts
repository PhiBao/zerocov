// ─── Core domain types ───────────────────────────────────────────────────────

export type UserRole = 'employee' | 'manager' | 'admin';
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
export type ExpenseCategory =
  | 'travel'
  | 'meals'
  | 'accommodation'
  | 'equipment'
  | 'software'
  | 'training'
  | 'other';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ReportFormat = 'json' | 'csv';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;        // in cents to avoid float issues
  category: ExpenseCategory;
  description: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRequest {
  id: string;
  expenseId: string;
  requesterId: string;
  approverId: string;
  status: ApprovalStatus;
  comment?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Report {
  id: string;
  userId: string;
  dateFrom: Date;
  dateTo: Date;
  categories?: ExpenseCategory[];
  generatedAt: Date;
  format: ReportFormat;
  expenses: Expense[];
  totalAmount: number;
  expenseCount: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─── Request/Response shapes ─────────────────────────────────────────────────

export interface CreateExpenseDTO {
  amount: number;
  category: ExpenseCategory;
  description: string;
  receiptUrl?: string;
}

export interface UpdateExpenseDTO {
  amount?: number;
  category?: ExpenseCategory;
  description?: string;
  receiptUrl?: string;
}

export interface SubmitExpenseDTO {
  approverId: string;
}

export interface ResolveApprovalDTO {
  status: 'approved' | 'rejected';
  comment?: string;
}

export interface CreateReportDTO {
  dateFrom: string;   // ISO date string
  dateTo: string;     // ISO date string
  categories?: ExpenseCategory[];
  format?: ReportFormat;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

// ─── API response envelope ───────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}
