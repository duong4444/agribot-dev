import { ConfigService } from '@nestjs/config';

export interface AiConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  huggingface: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  pinecone: {
    apiKey: string;
    environment: string;
    indexName: string;
  };
  weaviate: {
    url: string;
    apiKey?: string;
  };
  langchain: {
    maxRetries: number;
    timeout: number;
  };
}

// Chú ý đây chỉ là các thông số general , hiện tại dự án không dùng
export const getAiConfig = (configService: ConfigService): AiConfig => ({
  openai: {
    apiKey: configService.get<string>('OPENAI_API_KEY') || '',
    model: configService.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo'),
    maxTokens: configService.get<number>('OPENAI_MAX_TOKENS', 1000),
    temperature: configService.get<number>('OPENAI_TEMPERATURE', 0.7),
  },
  huggingface: {
    apiKey: configService.get<string>('HUGGINGFACE_API_KEY') || '',
    model: configService.get<string>('HUGGINGFACE_MODEL', 'vinai/phobert-base'),
    embeddingModel: configService.get<string>('HUGGINGFACE_EMBEDDING_MODEL', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'),
  },
  pinecone: {
    apiKey: configService.get<string>('PINECONE_API_KEY') || '',
    environment: configService.get<string>('PINECONE_ENVIRONMENT') || '',
    indexName: configService.get<string>('PINECONE_INDEX_NAME', 'agri-knowledge'),
  },
  weaviate: {
    url: configService.get<string>('WEAVIATE_URL', 'http://localhost:8080'),
    apiKey: configService.get<string>('WEAVIATE_API_KEY') || '',
  },
  langchain: {
    maxRetries: configService.get<number>('LANGCHAIN_MAX_RETRIES', 3),
    timeout: configService.get<number>('LANGCHAIN_TIMEOUT', 30000),
  },
});

export const aiPrompts = {
  system: `Bạn là một trợ lý AI chuyên về nông nghiệp tại Việt Nam. 
  Nhiệm vụ của bạn là cung cấp lời khuyên chính xác và hữu ích về:
  - Kỹ thuật canh tác và chăm sóc cây trồng
  - Quản lý đất và tưới tiêu
  - Phòng trừ sâu bệnh
  - Lịch thời vụ và mùa vụ
  - Quản lý trang trại và chi phí
  
  Hãy trả lời bằng tiếng Việt một cách thân thiện và dễ hiểu. 
  Nếu không chắc chắn, hãy đề xuất tham khảo chuyên gia.`,

  iotControl: `Bạn là hệ thống điều khiển IoT cho trang trại. 
  Phân tích dữ liệu cảm biến và đưa ra khuyến nghị hoặc điều khiển thiết bị.
  Luôn ưu tiên an toàn và hiệu quả.`,

  dataAnalysis: `Bạn là chuyên gia phân tích dữ liệu nông nghiệp.
  Phân tích dữ liệu trang trại và đưa ra insights hữu ích về:
  - Xu hướng năng suất
  - Chi phí và lợi nhuận
  - Hiệu quả sử dụng tài nguyên
  - Dự báo và khuyến nghị`,
} as const;
