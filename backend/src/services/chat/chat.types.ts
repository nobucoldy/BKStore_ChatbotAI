export interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface ChatRequestOptions {
  message: string;
  history?: ChatHistoryItem[];
  sessionId?: string;
  stream?: boolean;
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: 'customer' | 'admin';
    phone?: string;
  };
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

export interface ChatResponseData {
  reply: string;
  citations: string[];
  sessionId?: string;
  cards?: {
    type: 'products' | 'order' | 'inventory' | 'reviews';
    data: any;
  };
  suggestions?: string[];
  clarification?: {
    domain: 'product_recommendation' | 'order_tracking' | 'inventory_check' | 'product_reviews';
    missingSlots: string[];
  };
  toolUsed?: string;
  model: string;
  metrics?: ChatPerformanceMetrics;
}

export type ChatIntentType =
  | 'track_order'
  | 'check_inventory'
  | 'filter_products'
  | 'product_details'
  | 'warranty_all_products'
  | 'check_review_eligibility'
  | 'product_reviews'
  | 'clarify_product_need'
  | 'clarify_order_tracking'
  | 'clarify_inventory_product'
  | 'clarify_review_product'
  | 'greeting'
  | 'about_bot'
  | 'courtesy'
  | 'general';

export interface DetectedIntentResult {
  intent: ChatIntentType;
  extracted: any;
}

export interface SlotAccumulationResult {
  category?: 'laptop' | 'smartphone' | 'accessory';
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  useCase?: string;
}
