/**
 * Shared API types mirroring the backend response shapes.
 *
 * The backend wraps every successful response in `TransformInterceptor`:
 *   { success: true, data: T, meta?: { timestamp, path } }
 *
 * Errors come back as:
 *   { success: false, statusCode, message, error, timestamp, path }
 * where `message` may be either a single string or an array of strings.
 */

export interface ApiMeta {
  timestamp: string;
  path: string;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

export class ApiError extends Error {
  statusCode: number;
  messages: string[];
  error: string;

  constructor(
    statusCode: number,
    messages: string[],
    error: string,
    messageOverride?: string,
  ) {
    super(messageOverride ?? messages.join(" "));
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.messages = messages;
    this.error = error;
  }
}

/* ---------- Domain models ---------- */

export interface Admin {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  accessToken: string;
  admin: Admin;
}

export interface DashboardCounts {
  activeProducts: number;
  activeCategories: number;
  lowStockVariants: number;
}

export interface DashboardOrdersToday {
  count: number;
  revenue: string;
}

export interface DashboardSummary {
  counts: DashboardCounts;
  ordersToday: DashboardOrdersToday;
  ordersByStatus: Record<string, number>;
}
