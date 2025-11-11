/**
 * AI Module Types - Refactored Architecture
 * 2-Layer Processing: Exact FTS → LLM Fallback + Action Router
 * (Previously 3-layer with RAG, now simplified to 2-layer)
 */

// ========================================
// INTENT & ENTITY TYPES
// ========================================

export enum IntentType {
  // Knowledge queries
  KNOWLEDGE_QUERY = 'knowledge_query',      // Hỏi đáp kiến thức nông nghiệp
  
  // Business queries
  FINANCIAL_QUERY = 'financial_query',      // Hỏi về tài chính
  ANALYTICS_QUERY = 'analytics_query',      // Yêu cầu phân tích
  
  // IoT Actions
  DEVICE_CONTROL = 'device_control',        // Điều khiển thiết bị IoT
  SENSOR_QUERY = 'sensor_query',            // Hỏi dữ liệu cảm biến
  
  // Fallback
  UNKNOWN = 'unknown',                      // Không xác định
}

export enum EntityType {
  DATE = 'date',
  MONEY = 'money',
  CROP_NAME = 'crop_name',
  FARM_AREA = 'farm_area',
  DEVICE_NAME = 'device_name',
  ACTIVITY_TYPE = 'activity_type',
  METRIC = 'metric',
  FINANCIAL_TYPE = 'financial_type',
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
  // REMOVED: RAG = 'layer_2_rag', - Layer 2 RAG disabled
  LLM_FALLBACK = 'layer_2_llm', // Changed from layer_3 to layer_2
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

// REMOVED: Layer 2 RAG (2-layer architecture)
// export interface RAGContext {
//   chunks: DocumentChunk[];
//   totalRetrieved: number;
//   query: string;
//   embeddings?: number[];
// }
//
// export interface DocumentChunk {
//   id: string;
//   content: string;
//   metadata: {
//     documentId: string;
//     filename: string;
//     pageNumber?: number;
//     chunkIndex: number;
//     timestamp?: Date;
//   };
//   score: number;
// }
//
// export interface RAGResult {
//   found: boolean;
//   answer?: string;
//   context: RAGContext;
//   confidence: number;
//   sources: Array<{
//     documentId: string;
//     filename: string;
//     relevanceScore: number;
//   }>;
// }

// Layer 2: Pure LLM (formerly Layer 3)
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
  // REMOVED: ragResult?: RAGResult; - Layer 2 RAG disabled
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
  // REMOVED: chunks?: DocumentChunk[]; - Layer 2 RAG disabled
  
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
  // Layer thresholds (2-layer architecture)
  exactMatchThreshold: number;      // 0.9
  // REMOVED: ragConfidenceThreshold: number; - Layer 2 RAG disabled
  llmFallbackThreshold: number;     // 0.5
  
  // REMOVED: RAG settings (Layer 2 RAG disabled)
  // ragTopK: number;                  // 5
  // chunkSize: number;                // 500 tokens
  // chunkOverlap: number;             // 50 tokens
  
  // LLM settings
  llmModel: string;                 // 'gemini-2.0-flash'
  llmTemperature: number;           // 0.7
  llmMaxTokens: number;             // 1000
  
  // REMOVED: Embedding settings (Layer 2 RAG disabled)
  // embeddingModel: string;           // 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
  // embeddingDimension: number;       // 768
  
  // Performance
  maxResponseTime: number;          // 5000 ms
  enableCaching: boolean;           // true
  cacheExpiry: number;              // 3600 seconds
}


