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

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CategoryListResponse {
  items: Category[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  variantName: string;
  unit: string;
  weight: string | null;
  price: string;
  mrp: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  category: Category;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateVariantRequest {
  sku: string;
  variantName: string;
  unit: string;
  price: number;
  weight?: number;
  mrp?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export type UpdateVariantRequest = Partial<CreateVariantRequest>;

export interface CreateProductRequest {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  isActive?: boolean;
  variants: CreateVariantRequest[];
}

export type UpdateProductRequest = Partial<Omit<CreateProductRequest, "variants">>;

export interface UpdateProductImageRequest {
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}
