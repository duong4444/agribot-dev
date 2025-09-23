import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { LLMChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  createdAt: Date;
}

export interface KnowledgeSearchResult {
  content: string;
  metadata: {
    title: string;
    category: string;
    source: string;
    score: number;
  };
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private vectorStore: FaissStore | null = null;
  private embeddings: OpenAIEmbeddings;
  private llm: ChatOpenAI;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor(private configService: ConfigService) {
    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.configService.get('OPENAI_API_KEY'),
      modelName: 'text-embedding-3-small',
    });

    // Initialize LLM
    this.llm = new ChatOpenAI({
      openAIApiKey: this.configService.get('OPENAI_API_KEY'),
      modelName: 'gpt-3.5-turbo',
      temperature: 0.1,
    });

    // Initialize text splitter
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', ''],
    });
  }

  /**
   * Initialize knowledge base with agricultural data
   */
  async initializeKnowledgeBase(): Promise<void> {
    try {
      this.logger.log('Initializing knowledge base...');
      
      // Create sample agricultural knowledge documents
      const knowledgeDocuments = this.createAgriculturalKnowledge();
      
      // Convert to LangChain documents
      const documents = knowledgeDocuments.map(doc => new Document({
        pageContent: doc.content,
        metadata: {
          title: doc.title,
          category: doc.category,
          source: doc.source,
          tags: doc.tags.join(', '),
        }
      }));

      // Split documents into chunks
      const splitDocs = await this.textSplitter.splitDocuments(documents);
      
      // Create vector store
      this.vectorStore = await FaissStore.fromDocuments(
        splitDocs,
        this.embeddings
      );

      this.logger.log(`Knowledge base initialized with ${splitDocs.length} document chunks`);
    } catch (error) {
      this.logger.error('Error initializing knowledge base:', error);
      throw error;
    }
  }

  /**
   * Search knowledge base
   */
  async searchKnowledge(query: string, limit: number = 5): Promise<KnowledgeSearchResult[]> {
    try {
      if (!this.vectorStore) {
        await this.initializeKnowledgeBase();
      }

      // Perform similarity search
      const results = await this.vectorStore!.similaritySearchWithScore(query, limit);
      
      return results.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: {
          title: doc.metadata.title,
          category: doc.metadata.category,
          source: doc.metadata.source,
          score: score,
        }
      }));
    } catch (error) {
      this.logger.error('Error searching knowledge base:', error);
      return [];
    }
  }

  /**
   * Generate RAG response
   */
  async generateRAGResponse(query: string, context: string): Promise<string> {
    try {
      const promptTemplate = new PromptTemplate({
        template: `Bạn là một chuyên gia nông nghiệp AI với kiến thức sâu rộng về trồng trọt và chăm sóc cây trồng tại Việt Nam.

THÔNG TIN THAM KHẢO:
{context}

CÂU HỎI: {question}

YÊU CẦU:
- Trả lời dựa trên thông tin tham khảo ở trên
- Nếu thông tin không đủ, hãy nói rõ và đưa ra lời khuyên chung
- Trả lời ngắn gọn, súc tích (150-200 từ)
- Sử dụng tiếng Việt tự nhiên
- Tập trung vào thông tin thiết thực và có thể áp dụng

TRẢ LỜI:`,
        inputVariables: ['context', 'question'],
      });

      const chain = new LLMChain({
        llm: this.llm,
        prompt: promptTemplate,
      });

      const response = await chain.call({
        context: context,
        question: query,
      });

      return response.text;
    } catch (error) {
      this.logger.error('Error generating RAG response:', error);
      return 'Xin lỗi, tôi gặp lỗi khi tìm kiếm thông tin. Vui lòng thử lại.';
    }
  }

  /**
   * Add new knowledge document
   */
  async addKnowledgeDocument(document: KnowledgeDocument): Promise<void> {
    try {
      if (!this.vectorStore) {
        await this.initializeKnowledgeBase();
      }

      const langchainDoc = new Document({
        pageContent: document.content,
        metadata: {
          title: document.title,
          category: document.category,
          source: document.source,
          tags: document.tags.join(', '),
        }
      });

      const splitDocs = await this.textSplitter.splitDocuments([langchainDoc]);
      
      // Add to existing vector store
      await this.vectorStore!.addDocuments(splitDocs);
      
      this.logger.log(`Added new knowledge document: ${document.title}`);
    } catch (error) {
      this.logger.error('Error adding knowledge document:', error);
      throw error;
    }
  }

  /**
   * Create sample agricultural knowledge
   */
  private createAgriculturalKnowledge(): KnowledgeDocument[] {
    return [
      {
        id: '1',
        title: 'Kỹ thuật trồng lúa',
        content: `Kỹ thuật trồng lúa hiệu quả:

1. Chuẩn bị đất:
- Cày bừa kỹ, làm sạch cỏ dại
- Độ pH đất: 5.5-6.5
- Bón lót phân chuồng 20-30 tấn/ha

2. Gieo trồng:
- Mật độ: 40-50 kg giống/ha
- Khoảng cách: 20x20 cm
- Độ sâu gieo: 2-3 cm

3. Chăm sóc:
- Tưới nước: Giữ mực nước 3-5 cm
- Bón thúc: 3 lần (7, 21, 35 ngày sau gieo)
- Phòng trừ sâu bệnh: Theo dõi thường xuyên

4. Thu hoạch:
- Thời điểm: 85-90% hạt chín
- Phương pháp: Cắt bằng tay hoặc máy
- Bảo quản: Độ ẩm <14%`,
        category: 'Trồng trọt',
        tags: ['lúa', 'kỹ thuật', 'trồng trọt', 'cây lương thực'],
        source: 'Tài liệu nông nghiệp',
        createdAt: new Date(),
      },
      {
        id: '2',
        title: 'Cách trồng cà chua',
        content: `Hướng dẫn trồng cà chua:

1. Chuẩn bị:
- Đất tơi xốp, thoát nước tốt
- pH: 6.0-6.8
- Bón lót phân hữu cơ

2. Gieo hạt:
- Ươm trong khay 30-35 ngày
- Khi cây có 4-5 lá thật thì trồng
- Khoảng cách: 60x40 cm

3. Chăm sóc:
- Tưới nước đều đặn
- Làm giàn khi cây cao 30-40 cm
- Bón thúc NPK 16-16-8

4. Thu hoạch:
- 70-80 ngày sau trồng
- Thu hái khi quả chín đỏ
- Năng suất: 25-30 tấn/ha`,
        category: 'Rau củ',
        tags: ['cà chua', 'rau củ', 'trồng trọt', 'kỹ thuật'],
        source: 'Tài liệu nông nghiệp',
        createdAt: new Date(),
      },
      {
        id: '3',
        title: 'Phòng trừ sâu bệnh hại lúa',
        content: `Các loại sâu bệnh hại lúa chính:

1. Sâu cuốn lá:
- Triệu chứng: Lá bị cuốn, cây còi cọc
- Phòng trừ: Phun thuốc khi mật độ 20-30 con/m²
- Thuốc: Abamectin, Emamectin

2. Rầy nâu:
- Triệu chứng: Cây vàng, héo, chết
- Phòng trừ: Phun thuốc khi mật độ 3-5 con/tép
- Thuốc: Imidacloprid, Thiamethoxam

3. Bệnh đạo ôn:
- Triệu chứng: Vết bệnh hình thoi trên lá
- Phòng trừ: Phun thuốc khi phát hiện
- Thuốc: Tricyclazole, Isoprothiolane

4. Bệnh khô vằn:
- Triệu chứng: Vết bệnh màu nâu trên thân
- Phòng trừ: Vệ sinh đồng ruộng, phun thuốc
- Thuốc: Validamycin, Hexaconazole`,
        category: 'Bảo vệ thực vật',
        tags: ['sâu bệnh', 'lúa', 'phòng trừ', 'thuốc bảo vệ thực vật'],
        source: 'Tài liệu nông nghiệp',
        createdAt: new Date(),
      },
      {
        id: '4',
        title: 'Kỹ thuật bón phân cho cây trồng',
        content: `Nguyên tắc bón phân hiệu quả:

1. Bón phân cân đối:
- NPK: 100-80-60 kg/ha
- Bón theo nhu cầu của cây
- Phân tích đất để xác định lượng phân

2. Thời điểm bón:
- Bón lót: Trước khi trồng
- Bón thúc: Theo giai đoạn sinh trưởng
- Bón nuôi quả: Khi cây ra hoa, đậu quả

3. Phương pháp bón:
- Bón rải: Phân hữu cơ, phân lân
- Bón hố: Phân chuồng, phân xanh
- Bón lá: Phân vi lượng, kích thích sinh trưởng

4. Lưu ý:
- Không bón phân khi trời mưa
- Bón phân xa gốc cây
- Tưới nước sau khi bón phân`,
        category: 'Phân bón',
        tags: ['phân bón', 'NPK', 'kỹ thuật', 'chăm sóc cây'],
        source: 'Tài liệu nông nghiệp',
        createdAt: new Date(),
      },
      {
        id: '5',
        title: 'Quản lý nước tưới cho cây trồng',
        content: `Kỹ thuật tưới nước hiệu quả:

1. Nhu cầu nước của cây:
- Giai đoạn cây con: 2-3 lần/tuần
- Giai đoạn sinh trưởng: 1-2 lần/tuần
- Giai đoạn ra hoa, đậu quả: 3-4 lần/tuần

2. Phương pháp tưới:
- Tưới phun: Tiết kiệm nước, đều
- Tưới nhỏ giọt: Chính xác, hiệu quả
- Tưới rãnh: Phù hợp với cây trồng lớn

3. Thời điểm tưới:
- Sáng sớm: 6-8 giờ
- Chiều mát: 16-18 giờ
- Tránh tưới giữa trưa

4. Lượng nước tưới:
- Cây con: 5-10 lít/m²
- Cây trưởng thành: 15-20 lít/m²
- Cây ăn quả: 20-30 lít/m²

5. Lưu ý:
- Tưới đủ ẩm, không úng nước
- Theo dõi thời tiết
- Sử dụng nước sạch`,
        category: 'Tưới tiêu',
        tags: ['tưới nước', 'quản lý nước', 'kỹ thuật', 'chăm sóc'],
        source: 'Tài liệu nông nghiệp',
        createdAt: new Date(),
      },
    ];
  }
}
