/**
 * AI Module Types - Refactored Architecture
 * 3-Layer Processing: Exact → RAG → LLM Fallback + Action Router
 */

// ========================================
// INTENT & ENTITY TYPES
// ========================================

export enum IntentType {
  // Knowledge queries
  KNOWLEDGE_QUERY = 'knowledge_query',
  
  // Business queries (từ database)
  FINANCIAL_QUERY = 'financial_query',      // Doanh thu, chi phí
  CROP_QUERY = 'crop_query',                // Thông tin cây trồng
  ACTIVITY_QUERY = 'activity_query',        // Hoạt động nông trại
  ANALYTICS_QUERY = 'analytics_query',      // Phân tích, báo cáo
  FARM_QUERY = 'farm_query',                // Thông tin nông trại
  
  // IoT Actions
  DEVICE_CONTROL = 'device_control',        // Điều khiển thiết bị
  SENSOR_QUERY = 'sensor_query',            // Truy vấn cảm biến
  
  // CRUD Actions
  CREATE_RECORD = 'create_record',          // Tạo bản ghi
  UPDATE_RECORD = 'update_record',          // Cập nhật
  DELETE_RECORD = 'delete_record',          // Xóa
  
  // Fallback
  UNKNOWN = 'unknown',
}

export enum EntityType {
  DATE = 'date',
  MONEY = 'money',
  CROP_NAME = 'crop_name',
  FARM_AREA = 'farm_area',
  DEVICE_NAME = 'device_name',
  ACTIVITY_TYPE = 'activity_type',
  METRIC = 'metric',
}

export interface Entity {
  type: EntityType;
  value: string;
  raw: string;
  confidence: number;
  position?: {
    start: number;
    end: number;
  };
}

export interface IntentClassificationResult {
  intent: IntentType;
  confidence: number;
  entities: Entity[];
  originalQuery: string;
  normalizedQuery: string;
}

// ========================================
// PROCESSING LAYERS
// ========================================

export enum ProcessingLayer {
  EXACT_MATCH = 'layer_1_exact',
  RAG = 'layer_2_rag',
  LLM_FALLBACK = 'layer_3_llm',
  ACTION = 'action_router',
}

// Layer 1: Exact Document Match
export interface ExactMatchResult {
  found: boolean;
  content?: string;
  source?: {
    documentId: string;
    filename: string;
    pageNumber?: number;
    chunkIndex?: number;
  };
  confidence?: number;
  metadata?: any; // Additional metadata for debugging
}

// Layer 2: RAG
export interface RAGContext {
  chunks: DocumentChunk[];
  totalRetrieved: number;
  query: string;
  embeddings?: number[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    filename: string;
    pageNumber?: number;
    chunkIndex: number;
    timestamp?: Date;
  };
  score: number;
}

export interface RAGResult {
  found: boolean;
  answer?: string;
  context: RAGContext;
  confidence: number;
  sources: Array<{
    documentId: string;
    filename: string;
    relevanceScore: number;
  }>;
}

// Layer 3: Pure LLM
export interface LLMResult {
  answer: string;
  model: string;
  confidence: number;
  fallbackReason?: string;
}

// ========================================
// ACTION RESULTS
// ========================================

export interface BusinessQueryResult {
  success: boolean;
  data: any;
  query: string;
  executedSQL?: string;
  visualization?: {
    type: 'chart' | 'table' | 'metric';
    config: any;
  };
}

export interface IoTCommandResult {
  success: boolean;
  deviceId: string;
  deviceName: string;
  command: string;
  status: 'sent' | 'acknowledged' | 'executed' | 'failed';
  message: string;
  timestamp: Date;
}

// ========================================
// FINAL AI RESPONSE
// ========================================

export interface AIResponse {
  success: boolean;
  message: string;
  
  // Metadata
  intent: IntentType;
  processingLayer: ProcessingLayer;
  confidence: number;
  responseTime: number;
  
  // Layer-specific data
  exactMatch?: ExactMatchResult;
  ragResult?: RAGResult;
  llmResult?: LLMResult;
  
  // Action-specific data
  businessData?: BusinessQueryResult;
  iotCommand?: IoTCommandResult;
  
  // Sources & citations
  sources?: Array<{
    type: 'document' | 'database' | 'llm';
    reference: string;
    confidence?: number;
  }>;
  
  // Error handling
  error?: {
    code: string;
    message: string;
    layer: ProcessingLayer;
  };
}

// ========================================
// DOCUMENT MANAGEMENT
// ========================================

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  filepath: string;
  mimeType: string;
  size: number;
  
  // Content
  rawText?: string;
  chunks?: DocumentChunk[];
  
  // Metadata
  userId: string;
  category?: string;
  tags?: string[];
  language?: string;
  
  // Processing status
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  indexed: boolean;
  
  // Timestamps
  uploadedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// CONFIGURATION
// ========================================

export interface AIConfig {
  // Layer thresholds
  exactMatchThreshold: number;      // 0.9
  ragConfidenceThreshold: number;   // 0.7
  llmFallbackThreshold: number;     // 0.5
  
  // RAG settings
  ragTopK: number;                  // 5
  chunkSize: number;                // 500 tokens
  chunkOverlap: number;             // 50 tokens
  
  // LLM settings
  llmModel: string;                 // 'gemini-2.0-flash'
  llmTemperature: number;           // 0.7
  llmMaxTokens: number;             // 1000
  
  // Embedding settings
  embeddingModel: string;           // 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
  embeddingDimension: number;       // 768
  
  // Performance
  maxResponseTime: number;          // 5000 ms
  enableCaching: boolean;           // true
  cacheExpiry: number;              // 3600 seconds
}


