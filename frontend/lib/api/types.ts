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

export interface CustomerUser {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
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

export interface CustomerLoginResponseData {
  access_token: string;
  token_type: string;
  expires_in: string;
  user: CustomerUser;
}

export interface CustomerRegisterRequest {
  fullName: string;
  mobile: string;
  email?: string;
  password: string;
}

export type CustomerProfile = CustomerUser;

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

export type StockStatus = "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK";
export type InventoryTransactionType =
  | "IN"
  | "OUT"
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT"
  | "RESERVE"
  | "RELEASE"
  | "DAMAGE"
  | "RETURN";

export interface InventoryVariantProduct {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string | null;
  category?: Pick<Category, "id" | "name" | "slug"> | null;
}

export interface InventoryVariant {
  id: string;
  productId: string;
  sku: string;
  variantName: string;
  unit: string;
  weight: string | null;
  price?: string;
  mrp?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  product?: InventoryVariantProduct | null;
}

export interface InventoryItem {
  id: string;
  variantId: string;
  availableStock: number;
  reservedStock: number;
  lowStockThreshold: number;
  isInStock: boolean;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  variant: InventoryVariant;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryAdjustmentRequest {
  variantId: string;
  quantity: number;
  type: InventoryTransactionType;
  reason?: string;
}

export interface UpdateInventoryRequest {
  lowStockThreshold?: number;
}

export interface InventoryTransaction {
  id: string;
  variantId: string;
  inventoryId: string;
  type: InventoryTransactionType;
  quantityChange: number;
  availableStockAfter: number;
  reservedStockAfter: number;
  reason: string | null;
  referenceId: string | null;
  referenceType: string | null;
  performedByAdminId: string | null;
  createdAt: string;
  variant?: {
    id: string;
    sku: string;
    variantName: string;
    unit: string;
    product?: { id: string; name: string } | null;
  };
}

export interface InventoryTransactionListResponse {
  items: InventoryTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAYMENT_SUBMITTED" | "PAID" | "FAILED";
export type PaymentMethod = "COD" | "UPI";

export interface OrderUser {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  productNameSnapshot: string;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  transactionReference: string | null;
  paymentProofUrl: string | null;
  amount: string;
  paymentStatus: PaymentStatus;
  verifiedByAdminId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  paymentUrl?: string | null;
  qrCodeData?: string | null;
  merchantName?: string | null;
  upiId?: string | null;
  qrImageUrl?: string | null;
  paymentInstructions?: string | null;
  statusMessage?: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  remarks: string | null;
  updatedByAdminId: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  userId: string;
  addressId: string;
  orderNumber: string;
  subtotal: string;
  deliveryFee: string;
  totalAmount: string;
  currentStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  deliveryName: string | null;
  deliveryPhone: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryPincode: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  items: OrderItem[];
  user?: OrderUser | null;
  payments?: Payment[];
  statusHistory?: OrderStatusHistory[];
}

export interface OrderListResponse {
  items: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  remarks?: string;
}

export interface CartProductRef {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  category: Category;
}

export interface CartVariantRef {
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
  product: CartProductRef;
}

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  variant: CartVariantRef;
}

export interface Cart {
  id: string;
  userId: string;
  subtotal: string;
  itemCount: number;
  items: CartItem[];
}

export type CartListResponse = Cart;

export interface AddCartItemRequest {
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  area: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type AddressListResponse = Address[];

export interface CreateAddressRequest {
  label: string;
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export type UpdateAddressRequest = Partial<CreateAddressRequest>;

export interface CreateOrderRequest {
  addressId: string;
}

export type CustomerOrder = AdminOrder;

export interface CustomerOrderListResponse {
  items: CustomerOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentProofRequest {
  proof: File;
}

export type SettingType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
export type SettingCategory =
  | "BUSINESS"
  | "DELIVERY"
  | "PAYMENT"
  | "CONTACT"
  | "SYSTEM"
  | "STORE";

export interface Setting {
  id: string;
  key: string;
  value: string;
  type: SettingType;
  category: SettingCategory;
  description: string | null;
  isEditable: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SettingListResponse {
  items: Setting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicSettings {
  business: {
    name?: string;
    tagline?: string;
    heroHeading?: string;
    heroSubtitle?: string;
    logoUrl?: string;
    faviconUrl?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    gstNumber?: string;
    description?: string;
  };
  contact: {
    phone?: string;
    whatsapp?: string;
    whatsappChannelUrl?: string;
    instagramUrl?: string;
    instagramHandle?: string;
    deliveryAreaDescription?: string;
    supportEmail?: string;
    customerCareHours?: string;
  };
  delivery: {
    fee?: number;
    freeDeliveryThreshold?: number;
    minimumOrderValue?: number;
    maximumRadius?: number;
    estimatedTime?: string;
    sameDayEnabled?: boolean;
  };
  payment: {
    upiId?: string;
    upiDisplayName?: string;
    qrImageUrl?: string;
    bankName?: string;
    accountHolderName?: string;
    branch?: string;
    ifsc?: string;
    codEnabled?: boolean;
    upiEnabled?: boolean;
    futureGatewayEnabled?: boolean;
    instructions?: string;
    availableMethods: PaymentMethod[];
  };
  store: {
    openTime?: string;
    closeTime?: string;
    acceptOrders?: boolean;
    storeClosed?: boolean;
    holidayMode?: boolean;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
  };
  branding?: {
    themeColor?: string;
    accentColor?: string;
  };
  system?: {
    storeVersion?: string;
    environment?: string;
  };
}

export interface DeliveryPolicy {
  minimumOrderValue: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  deliveryEnabled: boolean;
  deliveryCharge: number;
  checkoutDisabled: boolean;
  amountToMinimum: number;
  amountToFreeDelivery: number;
  message: string;
}
