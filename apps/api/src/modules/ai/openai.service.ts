import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Import OpenAI (sẽ được install sau)
import OpenAI from 'openai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

export interface OpenAIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: any; // OpenAI instance
  private chatModel: any; // LangChain ChatOpenAI instance
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeOpenAI();
  }

  /**
   * Initialize OpenAI client and LangChain model
   */
  private async initializeOpenAI() {
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      console.log(apiKey);
      
      
      if (!apiKey) {
        this.logger.warn('OpenAI API key not found. Using mock responses.');
        return;
      }

      // Initialize OpenAI client
      this.openai = new OpenAI({ apiKey });

    //   Initialize LangChain ChatOpenAI
      this.chatModel = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
      });

      this.isConfigured = true;
      this.logger.log('OpenAI service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Generate response using OpenAI GPT
   */
  async generateResponse(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<OpenAIResponse> {
    if (!this.isConfigured) {
      return this.getMockResponse(prompt);
    }

    try {
      const startTime = Date.now();
      
      // Use LangChain for structured prompting
      const response = await this.generateWithLangChain(prompt, options);
      
      const processingTime = Date.now() - startTime;
      
      return {
        content: response.content,
        usage: response.usage,
        model: response.model || 'gpt-3.5-turbo',
        finishReason: response.finishReason || 'stop'
      };

    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      return this.getMockResponse(prompt);
    }
  }

  /**
   * Generate response using LangChain
   */
  private async generateWithLangChain(
    prompt: string,
    options?: any
  ): Promise<any> {
    // TODO: Implement LangChain integration
    const template = PromptTemplate.fromTemplate(prompt);
    const outputParser = new StringOutputParser();
    const chain = template.pipe(this.chatModel).pipe(outputParser);
    const result = await chain.invoke({});
    
    // For now, return mock response
    return this.getMockResponse(prompt);
  }

  /**
   * Generate agricultural-specific response
   */
  async generateAgriculturalResponse(
    userMessage: string,
    intent: string,
    entities: any,
    context?: string
  ): Promise<OpenAIResponse> {
    const prompt = this.createAgriculturalPrompt(userMessage, intent, entities, context);
    return this.generateResponse(prompt, {
      temperature: 0.7,
      maxTokens: 800,
      model: 'gpt-3.5-turbo'
    });
  }

  /**
   * Create specialized prompt for agricultural questions
   */
  private createAgriculturalPrompt(
    userMessage: string,
    intent: string,
    entities: any,
    context?: string
  ): string {
    const crop = entities.crops?.[0] || 'cây trồng';
    const timeRefs = entities.timeReferences || [];

    let basePrompt = `Bạn là một chuyên gia nông nghiệp AI với 20 năm kinh nghiệm tại Việt Nam. 
Bạn chuyên tư vấn về kỹ thuật trồng trọt, chăm sóc cây trồng và quản lý nông trại.

THÔNG TIN CÂU HỎI:
- Câu hỏi: "${userMessage}"
- Loại câu hỏi: ${intent}
- Cây trồng: ${crop}
- Thời gian: ${timeRefs.join(', ') || 'không xác định'}

YÊU CẦU TRẢ LỜI:
1. Trả lời bằng tiếng Việt, dễ hiểu
2. Cung cấp thông tin chính xác, thực tế
3. Đưa ra lời khuyên cụ thể, có thể áp dụng
4. Nếu có thể, đưa ra các bước thực hiện chi tiết
5. Cảnh báo về các rủi ro hoặc lưu ý quan trọng`;

    // Add context-specific instructions
    switch (intent) {
      case 'planting':
        basePrompt += `\n\nTẬP TRUNG VÀO:
- Kỹ thuật trồng chi tiết
- Thời vụ phù hợp
- Chuẩn bị đất và giống
- Mật độ và khoảng cách trồng
- Điều kiện môi trường tối ưu`;
        break;

      case 'care':
        basePrompt += `\n\nTẬP TRUNG VÀO:
- Chế độ chăm sóc hàng ngày
- Tưới nước và bón phân
- Phòng trừ sâu bệnh
- Cắt tỉa và tạo hình
- Theo dõi sự phát triển`;
        break;

      case 'harvest':
        basePrompt += `\n\nTẬP TRUNG VÀO:
- Thời điểm thu hoạch tối ưu
- Cách nhận biết khi thu hoạch
- Kỹ thuật thu hoạch
- Bảo quản sau thu hoạch
- Xử lý sản phẩm`;
        break;

      case 'soil':
        basePrompt += `\n\nTẬP TRUNG VÀO:
- Loại đất phù hợp
- Cải thiện chất lượng đất
- Độ pH và dinh dưỡng
- Xử lý đất trước khi trồng
- Duy trì độ phì nhiêu`;
        break;

      case 'weather':
        basePrompt += `\n\nTẬP TRUNG VÀO:
- Ảnh hưởng của thời tiết
- Biện pháp bảo vệ
- Thời vụ phù hợp
- Xử lý thời tiết bất lợi
- Dự báo và chuẩn bị`;
        break;

      case 'pest':
        basePrompt += `\n\nTẬP TRUNG VÀO:
- Nhận biết sâu bệnh
- Biện pháp phòng trừ
- Thuốc bảo vệ thực vật
- Phương pháp sinh học
- Xử lý khi bị nhiễm`;
        break;

      default:
        basePrompt += `\n\nTẬP TRUNG VÀO:
- Thông tin tổng quát về ${crop}
- Các vấn đề thường gặp
- Lời khuyên chung
- Hướng dẫn cơ bản`;
    }

    if (context) {
      basePrompt += `\n\nBỐI CẢNH BỔ SUNG: ${context}`;
    }

    basePrompt += `\n\nHãy trả lời một cách chuyên nghiệp và hữu ích:`;

    return basePrompt;
  }

  /**
   * Mock response when OpenAI is not available
   */
  private getMockResponse(prompt: string): OpenAIResponse {
    return {
      content: 'Tôi đang trong quá trình nâng cấp để sử dụng AI thực tế. Hiện tại tôi có thể trả lời các câu hỏi cơ bản về nông nghiệp. Vui lòng thử lại sau khi hệ thống được cập nhật.',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      model: 'mock-agricultural-ai',
      finishReason: 'stop'
    };
  }

  /**
   * Check if OpenAI is properly configured
   */
  isOpenAIConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    if (!this.isConfigured) {
      return ['mock-agricultural-ai'];
    }

    try {
      // TODO: Implement model listing
      // const models = await this.openai.models.list();
      // return models.data.map(model => model.id);
      
      return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
    } catch (error) {
      this.logger.error('Error fetching models:', error);
      return ['mock-agricultural-ai'];
    }
  }

  /**
   * Test OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const testResponse = await this.generateResponse('Test connection', {
        maxTokens: 10
      });
      
      return testResponse.content.length > 0;
    } catch (error) {
      this.logger.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}
