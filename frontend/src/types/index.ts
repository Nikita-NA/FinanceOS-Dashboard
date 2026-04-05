export type Role = 'VIEWER' | 'ANALYST' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Transaction {
  id: string;
  amount: string | number;
  type: TransactionType;
  category: string;
  date: string;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: { id: string; name: string };
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginatedMeta;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  savingsRate: number;
}

export interface CategoryBreakdownRow {
  category: string;
  type: TransactionType;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrendRow {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface WeeklyTrendRow {
  week: string;
  income: number;
  expense: number;
  net: number;
}

export interface IncomeExpenseRatio {
  totalIncome: number;
  totalExpenses: number;
  total: number;
  incomeRatio: number;
  expenseRatio: number;
}

/** GET /dashboard/top-categories */
export interface TopCategoryRow {
  category: string;
  total: number;
  count: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  path?: string;
  timestamp?: string;
}

export interface HealthScoreBreakdownPart {
  score: number;
  max: number;
  label: string;
}

export interface HealthScoreResponse {
  score: number;
  grade: string;
  breakdown: {
    savingsRate: HealthScoreBreakdownPart;
    expenseConsistency: HealthScoreBreakdownPart;
    incomeDiversity: HealthScoreBreakdownPart;
    housingCostRatio: HealthScoreBreakdownPart;
    trend: HealthScoreBreakdownPart;
  };
  tips: string[];
  calculatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  performedBy: string;
  performedByEmail: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}
