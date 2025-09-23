import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';

export interface GeminiResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
  safetyRatings?: any[];
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeGemini();
  }

  /**
   * Initialize Gemini AI client and model
   */
  private async initializeGemini() {
    try {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      
      if (!apiKey) {
        this.logger.warn('Gemini API key not found. Using mock responses.');
        return;
      }

      // Initialize Google Generative AI
      this.genAI = new GoogleGenerativeAI(apiKey);

      // Initialize Gemini model with configuration
      const generationConfig: GenerationConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
      };

      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig 
      });

      this.isConfigured = true;
      this.logger.log('Gemini service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Gemini service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Generate response using Gemini AI
   */
  async generateResponse(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<GeminiResponse> {
    if (!this.isConfigured) {
      return this.getMockResponse(prompt);
    }

    try {
      const startTime = Date.now();
      
      // Generate content using Gemini
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const processingTime = Date.now() - startTime;
      
      return {
        content: text,
        usage: {
          promptTokens: this.estimateTokens(prompt),
          completionTokens: this.estimateTokens(text),
          totalTokens: this.estimateTokens(prompt) + this.estimateTokens(text)
        },
        model: 'gemini-1.5-flash',
        finishReason: 'stop',
        safetyRatings: (response as any).safetyRatings || []
      };

    } catch (error) {
      this.logger.error('Gemini API error:', error);
      return this.getMockResponse(prompt);
    }
  }

  /**
   * Generate agricultural-specific response using Gemini
   */
  async generateAgriculturalResponse(
    userMessage: string,
    intent: string,
    entities: any,
    context?: string
  ): Promise<GeminiResponse> {
    const prompt = this.createAgriculturalPrompt(userMessage, intent, entities, context);
    return this.generateResponse(prompt, {
      temperature: 0.7,
      maxTokens: 300, // Giảm từ 800 xuống 300 tokens để response ngắn hơn
      model: 'gemini-1.5-flash'
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

    let basePrompt = `Bạn là chuyên gia nông nghiệp AI tại Việt Nam. Trả lời NGẮN GỌN, SÚC TÍCH trong 150-200 từ.

THÔNG TIN:
- Câu hỏi: "${userMessage}"
- Loại: ${intent}
- Cây trồng: ${crop}
- Thời gian: ${timeRefs.join(', ') || 'không xác định'}

YÊU CẦU:
1. Trả lời bằng tiếng Việt, dễ hiểu
2. Tối đa 200 từ, chia 2-3 đoạn ngắn
3. Sử dụng bullet points khi cần
4. Tập trung vào thông tin thiết yếu nhất
5. Đưa ra lời khuyên thực tế, có thể áp dụng ngay`;

    // Add context-specific instructions
    switch (intent) {
      case 'planting':
        basePrompt += `\n\nTẬP TRUNG VÀO: thời vụ, chuẩn bị đất, mật độ trồng. Nêu 3-4 điểm quan trọng nhất.`;
        break;

      case 'care':
        basePrompt += `\n\nTẬP TRUNG VÀO: tưới nước, bón phân, phòng bệnh. Nêu 3-4 biện pháp chính.`;
        break;

      case 'harvest':
        basePrompt += `\n\nTẬP TRUNG VÀO: thời điểm thu hoạch, cách thu hoạch. Nêu 2-3 điểm quan trọng.`;
        break;

      case 'soil':
        basePrompt += `\n\nTẬP TRUNG VÀO: loại đất phù hợp, độ pH, cải thiện đất. Nêu 3 điểm chính.`;
        break;

      case 'weather':
        basePrompt += `\n\nTẬP TRUNG VÀO: ảnh hưởng thời tiết, biện pháp bảo vệ. Nêu 2-3 điểm quan trọng.`;
        break;

      case 'pest':
        basePrompt += `\n\nTẬP TRUNG VÀO: nhận biết sâu bệnh, biện pháp phòng trừ. Nêu 3-4 điểm chính.`;
        break;

      default:
        basePrompt += `\n\nTẬP TRUNG VÀO: thông tin tổng quát về ${crop}. Nêu 3-4 điểm quan trọng nhất.`;
        break;
    }

    if (context) {
      basePrompt += `\n\nBỐI CẢNH BỔ SUNG: ${context}`;
    }

    basePrompt += `\n\nHãy trả lời một cách chuyên nghiệp và hữu ích:`;

    return basePrompt;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for Vietnamese
    return Math.ceil(text.length / 4);
  }

  /**
   * Mock response when Gemini is not available
   */
  private getMockResponse(prompt: string): GeminiResponse {
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
   * Check if Gemini is properly configured
   */
  isGeminiConfigured(): boolean {
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
      // Gemini models available
      return [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.0-pro'
      ];
    } catch (error) {
      this.logger.error('Error fetching models:', error);
      return ['mock-agricultural-ai'];
    }
  }

  /**
   * Test Gemini connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const testResponse = await this.generateResponse(
        'Test connection - trả lời ngắn gọn'
      );
      
      return testResponse.content.length > 0;
    } catch (error) {
      this.logger.error('Gemini connection test failed:', error);
      return false;
    }
  }

  /**
   * Generate content with safety settings
   */
  async generateContentWithSafety(
    prompt: string,
    safetySettings?: any
  ): Promise<GeminiResponse> {
    if (!this.isConfigured) {
      return this.getMockResponse(prompt);
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        safetySettings: safetySettings || [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ]
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        usage: {
          promptTokens: this.estimateTokens(prompt),
          completionTokens: this.estimateTokens(text),
          totalTokens: this.estimateTokens(prompt) + this.estimateTokens(text)
        },
        model: 'gemini-1.5-flash',
        finishReason: 'stop',
        safetyRatings: (response as any).safetyRatings || []
      };

    } catch (error) {
      this.logger.error('Gemini safety content generation error:', error);
      return this.getMockResponse(prompt);
    }
  }
}
