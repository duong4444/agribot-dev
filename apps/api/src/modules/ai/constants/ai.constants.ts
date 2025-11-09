/**
 * AI Module Constants
 */

import { AIConfig } from '../types/ai.types';

// ========================================
// DEFAULT CONFIGURATION
// ========================================

export const DEFAULT_AI_CONFIG: AIConfig = {
  // Layer thresholds
  exactMatchThreshold: 0.7, // Lowered from 0.9 for better FTS matching
  ragConfidenceThreshold: 0.7,
  llmFallbackThreshold: 0.5,
  
  // RAG settings
  ragTopK: 5,
  chunkSize: 500,
  chunkOverlap: 50,
  
  // LLM settings
  llmModel: 'gemini-2.0-flash-exp',
  llmTemperature: 0.7,
  llmMaxTokens: 4096,
  
  // Embedding settings
  embeddingModel: 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
  embeddingDimension: 768,
  
  // Performance
  maxResponseTime: 5000,
  enableCaching: true,
  cacheExpiry: 3600,
};

// ========================================
// INTENT PATTERNS (Rule-based)
// ========================================

export const INTENT_PATTERNS = {
  // Financial queries
  FINANCIAL_QUERY: [
    /doanh\s*thu/i,
    /thu\s*nhập/i,
    /lợi\s*nhuận/i,
    /chi\s*phí/i,
    /tổng\s*tiền/i,
    /bao\s*nhiêu\s*tiền/i,
    /giá\s*trị/i,
  ],
  
  // Device control (IoT)
  DEVICE_CONTROL: [
    /bật/i,
    /tắt/i,
    /điều\s*khiển/i,
    /thiết\s*bị/i,
    /máy/i,
    /hệ\s*thống/i,
  ],
  
  // Sensor queries
  SENSOR_QUERY: [
    /cảm\s*biến/i,
    /nhiệt\s*độ/i,
    /độ\s*ẩm/i,
    /ánh\s*sáng/i,
    /ph/i,
    /đo/i,
    /giám\s*sát/i,
  ],
  
  // Analytics
  ANALYTICS_QUERY: [
    /phân\s*tích/i,
    /báo\s*cáo/i,
    /thống\s*kê/i,
    /xu\s*hướng/i,
    /biểu\s*đồ/i,
    /so\s*sánh/i,
  ],
  
  // Knowledge queries (default nếu không match các pattern trên)
  KNOWLEDGE_QUERY: [
    /là\s*gì/i,
    /thế\s*nào/i,
    /như\s*thế\s*nào/i,
    /tại\s*sao/i,
    /vì\s*sao/i,
    /cách/i,
    /hướng\s*dẫn/i,
    /bệnh/i,
    /sâu/i,
    /trồng/i,
    /chăm\s*sóc/i,
  ],
};

// ========================================
// ENTITY PATTERNS
// ========================================

export const ENTITY_PATTERNS = {
  // Dates
  DATE: [
    /hôm\s*nay/i,
    /hôm\s*qua/i,
    /tuần\s*này/i,
    /tuần\s*trước/i,
    /tháng\s*này/i,
    /tháng\s*(\d+)/i,
    /năm\s*này/i,
    /năm\s*(\d{4})/i,
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
  ],
  
  // Money
  MONEY: [
    /(\d+[\d,\.]*)\s*(đồng|vnđ|vnd|k|triệu|tr|tỷ)/i,
  ],
  
  // Crop names (Vietnamese common crops)
  CROP_NAME: [
    /lúa/i,
    /cà\s*chua/i,
    /dưa\s*hấu/i,
    /ớt/i,
    /rau/i,
    /ngô/i,
    /khoai/i,
    /đậu/i,
    /cải/i,
  ],
  
  // Farm areas
  FARM_AREA: [
    /luống\s*([A-Z]|\d+)/i,
    /khu\s*([A-Z]|\d+)/i,
    /lô\s*([A-Z]|\d+)/i,
    /vườn\s*([A-Z]|\d+)/i,
  ],
  
  // Device names
  DEVICE_NAME: [
    /máy\s*bơm/i,
    /vòi\s*phun/i,
    /van\s*tưới/i,
    /hệ\s*thống\s*tưới/i,
    /thiết\s*bị/i,
  ],
};

// ========================================
// PROMPT TEMPLATES
// ========================================

export const PROMPT_TEMPLATES = {
  // RAG synthesis
  RAG_SYNTHESIS: `Bạn là trợ lý AI nông nghiệp thông minh.
Dựa vào các đoạn tài liệu sau, hãy trả lời câu hỏi của người dùng một cách chính xác và chi tiết.

Tài liệu tham khảo:
{context}

Câu hỏi: {query}

Yêu cầu:
- Trả lời bằng tiếng Việt
- Dựa vào tài liệu được cung cấp
- Trích dẫn nguồn nếu có thể
- Nếu không tìm thấy thông tin, hãy nói rõ

Trả lời:`,

  // Pure LLM fallback
  LLM_FALLBACK: `Bạn là trợ lý AI chuyên về nông nghiệp tại Việt Nam.
Bạn CHỈ trả lời các câu hỏi liên quan đến nông nghiệp, trồng trọt, chăm sóc cây, thiết bị nông nghiệp, và quản lý nông trại.

Câu hỏi: {query}

Hướng dẫn:
- Nếu câu hỏi là lời chào/cảm ơn: Trả lời lịch sự và giới thiệu bạn có thể hỗ trợ gì về nông nghiệp
- Nếu câu hỏi KHÔNG liên quan đến nông nghiệp: Từ chối lịch sự và đề xuất hỏi về nông nghiệp
- Nếu câu hỏi về nông nghiệp: Trả lời chi tiết, chính xác bằng tiếng Việt
- Nếu không chắc chắn: Nói rõ và đề xuất tìm hiểu thêm

Trả lời:`,

  // Business query explanation
  BUSINESS_QUERY_EXPLAIN: `Dựa vào dữ liệu sau:
{data}

Hãy giải thích kết quả cho người dùng một cách dễ hiểu.
Câu hỏi gốc: {query}

Trả lời:`,
};

// ========================================
// SUPPORTED DOCUMENT TYPES
// ========================================

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

export const SUPPORTED_FILE_EXTENSIONS = [
  '.pdf',
  '.txt',
  '.md',
  '.docx',
  '.doc',
];

// ========================================
// ERROR MESSAGES
// ========================================

export const ERROR_MESSAGES = {
  INTENT_CLASSIFICATION_FAILED: 'Không thể phân loại ý định của câu hỏi',
  NO_DOCUMENTS_FOUND: 'Không tìm thấy tài liệu liên quan',
  RAG_FAILED: 'Lỗi khi tìm kiếm thông tin từ tài liệu',
  LLM_FAILED: 'Lỗi khi xử lý câu hỏi với AI',
  ACTION_EXECUTION_FAILED: 'Không thể thực hiện hành động',
  DEVICE_NOT_FOUND: 'Không tìm thấy thiết bị',
  PERMISSION_DENIED: 'Bạn không có quyền thực hiện hành động này',
  TIMEOUT: 'Yêu cầu xử lý quá lâu, vui lòng thử lại',
};

// ========================================
// CACHE KEYS
// ========================================

export const CACHE_KEYS = {
  INTENT: (query: string) => `intent:${query}`,
  EXACT_MATCH: (query: string) => `exact:${query}`,
  RAG_RESULT: (query: string) => `rag:${query}`,
  EMBEDDING: (text: string) => `embed:${text}`,
};


