export interface BranchInventory {
  branchId: string;
  branchName: string;
  city: string;
  address?: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categorySlug?: string;
  category_slug?: string;
  categoryName?: string;
  category_name?: string;
  brand: string;
  price: number;
  originalPrice?: number;
  original_price?: number;
  stock?: number;
  stock_quantity?: number;
  thumbnail: string;
  images: string[];
  specs: Record<string, string>;
  description: string;
  warrantyMonths?: number;
  warranty_months?: number;
  inventories?: BranchInventory[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selected?: boolean;
}

export interface OrderItem {
  id?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  productThumbnail?: string;
  price?: number;
  unitPrice?: number;
  quantity: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderCode: string; // e.g. BK-1024
  customerName: string;
  phone: string;
  address: string;
  note?: string;
  branchId?: string;
  branchName?: string;
  totalAmount: number;
  paymentMethod: 'COD' | 'QR_PAY';
  status: OrderStatus;
  trackingInfo?: string;
  userId?: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface CreateOrderPayload {
  customerName: string;
  phone: string;
  address: string;
  note?: string;
  branchId?: string;
  userId?: string;
  paymentMethod: 'COD' | 'QR_PAY';
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ChatMessageCard {
  type: 'products' | 'order' | 'inventory' | 'reviews';
  data: any;
}

export interface ChatPerformanceMetrics {
  totalResponseTimeMs: number;
  intentDetectionMs: number;
  toolExecutionMs: number;
  ragRetrievalMs: number;
  llmGenerationMs: number;
  detectedIntent: string;
  topRagScore: number;
  ragChunksEvaluated: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  cards?: ChatMessageCard;
  citations?: string[];
  suggestions?: string[];
  toolUsed?: string;
  metrics?: ChatPerformanceMetrics;
  timestamp: string;
}

export interface Review {
  id: string;
  productId: string;
  productSlug?: string;
  orderId?: string;
  orderCode: string;
  customerName: string;
  phone?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductReviewsData {
  reviews: Review[];
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: Record<number, number>;
}

export interface CreateReviewPayload {
  orderCode: string;
  phone: string;
  productId: string;
  rating: number;
  comment: string;
}

export type InventoryStockStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export interface BranchStockDetail {
  branchId: string;
  branchName: string;
  city: string;
  address: string;
  phone: string;
  quantity: number;
  status: 'Còn hàng' | 'Sắp hết hàng' | 'Hết hàng';
  updatedAt?: string;
}

export interface ProductInventoryItem {
  productId: string;
  productName: string;
  productSlug: string;
  brand: string;
  thumbnail: string;
  categoryName: string;
  categorySlug: string;
  price: number;
  totalStock: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  branchesStock: BranchStockDetail[];
}

export interface BranchSummary {
  branchId: string;
  branchName: string;
  city: string;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryOverviewSummary {
  totalStockUnits: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  branchSummaries: BranchSummary[];
}

export interface InventoryOverviewData {
  summary: InventoryOverviewSummary;
  branches: Branch[];
  items: ProductInventoryItem[];
}

export interface UpdateInventoryPayload {
  productId: string;
  branchId: string;
  quantity: number;
}

export interface TransferStockPayload {
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  note?: string;
}

export interface User {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'admin';
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  address?: string;
}


