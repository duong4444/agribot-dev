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
  RAG = 'layer_2_rag', // Layer 2 RAG enabled
  LLM_FALLBACK = 'layer_3_llm', // Layer 3 LLM Fallback
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

// Layer 2: RAG (Retrieval-Augmented Generation)
export interface RAGResult {
  answer: string;
  confidence: number;
  sources: Array<{
    id: string;
    content: string;
    similarity: number;
    documentName: string;
    chunkIndex: number;
  }>;
  retrievalTime: number;
  synthesisTime: number;
}

// Layer 3: Pure LLM Fallback
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
  ragResult?: RAGResult; // Layer 2 RAG enabled
  llmResult?: LLMResult;
  
  // Action-specific data
  businessData?: BusinessQueryResult;
  iotCommand?: IoTCommandResult;
  
  // Sources & citations
  sources?: Array<{
    type: 'document' | 'rag_document' | 'database' | 'llm';
    reference: string;
    confidence?: number;
    excerpt?: string;
  }>;
  
  // Metadata
  metadata?: {
    retrievalTime?: number;
    synthesisTime?: number;
    chunksUsed?: number;
  };
  
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
  // Layer thresholds (3-layer architecture)
  exactMatchThreshold: number;      // 0.9
  ragConfidenceThreshold: number;   // 0.7 - Layer 2 RAG enabled
  llmFallbackThreshold: number;     // 0.5
  
  // RAG settings (Layer 2 RAG enabled)
  ragTopK: number;                  // 5
  ragSimilarityThreshold: number;   // 0.7
  chunkSize: number;                // 500 characters
  chunkOverlap: number;             // 1 sentence
  
  // LLM settings
  llmModel: string;                 // 'gemini-2.0-flash'
  llmTemperature: number;           // 0.7
  llmMaxTokens: number;             // 1000
  
  // Embedding settings (Layer 2 RAG enabled)
  embeddingModel: string;           // 'dangvantuan/vietnamese-document-embedding'
  embeddingDimension: number;       // 768
  embeddingBatchSize: number;       // 32
  
  // Performance
  maxResponseTime: number;          // 5000 ms
  enableCaching: boolean;           // true
  cacheExpiry: number;              // 3600 seconds
}


