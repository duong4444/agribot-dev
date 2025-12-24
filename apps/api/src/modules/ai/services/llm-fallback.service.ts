import { Injectable, Logger } from '@nestjs/common';
import { LLMResult } from '../types';
import { GeminiService } from '../gemini.service';
import { PROMPT_TEMPLATES, DEFAULT_AI_CONFIG } from '../constants';

@Injectable()
export class LLMFallbackService {
  private readonly logger = new Logger(LLMFallbackService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Layer 3: Pure LLM Fallback
   * Used when no documents found or RAG confidence is low
   */
  async generateResponse(
    query: string,
    options: {
      reason?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<LLMResult> {
    const startTime = Date.now();
    const {
      reason = 'No relevant documents found',
      temperature = DEFAULT_AI_CONFIG.llmTemperature, // 0.7
      maxTokens = DEFAULT_AI_CONFIG.llmMaxTokens, // 4096
    } = options;

    this.logger.log(`Using LLM fallback - Reason: ${reason}`);

    try {
      // Build prompt
      const prompt = PROMPT_TEMPLATES.LLM_FALLBACK.replace('{query}', query);

      // Generate with Gemini
      const response = await this.geminiService.generateText(prompt, {
        temperature,
        maxTokens,
      });

      const processingTime = Date.now() - startTime;

      // Calculate confidence based on response quality
      const confidence = this.estimateConfidence(query, response);

      this.logger.log(
        `LLM fallback completed (confidence: ${confidence.toFixed(2)}) in ${processingTime}ms`
      );

      return {
        answer: response,
        model: DEFAULT_AI_CONFIG.llmModel,
        confidence,
        fallbackReason: reason,
      };
    } catch (error) {
      this.logger.error('Error in LLM fallback:', error);
      
      // Ultimate fallback
      return {
        answer: 'Xin lỗi, tôi không thể trả lời câu hỏi này lúc này. Vui lòng thử lại sau hoặc liên hệ với chuyên gia nông nghiệp.',
        model: DEFAULT_AI_CONFIG.llmModel,
        confidence: 0,
        fallbackReason: 'LLM error',
      };
    }
  }

  /**
   * Generate response with context (for business queries)
   */
  async generateWithContext(
    query: string,
    data: any,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const {
      temperature = 0.5, // Lower temperature for data explanation
      maxTokens = DEFAULT_AI_CONFIG.llmMaxTokens,
    } = options;

    try {
      // Format data for display
      const formattedData = typeof data === 'object' 
        ? JSON.stringify(data, null, 2)
        : String(data);

      // Build prompt
      const prompt = PROMPT_TEMPLATES.BUSINESS_QUERY_EXPLAIN
        .replace('{data}', formattedData)
        .replace('{query}', query);

      // Generate explanation
      const response = await this.geminiService.generateText(prompt, {
        temperature,
        maxTokens,
      });

      return response;
    } catch (error) {
      this.logger.error('Error generating context response:', error);
      
      // Return data without explanation
      return `Kết quả: ${typeof data === 'object' ? JSON.stringify(data) : data}`;
    }
  }

  /**
   * Estimate confidence based on response quality
   */
  private estimateConfidence(query: string, response: string): number {
    let confidence = DEFAULT_AI_CONFIG.llmFallbackThreshold;

    // Boost if response is substantial
    if (response.length > 100) {
      confidence += 0.1;
    }

    // Boost if response contains structured information
    if (response.includes('•') || response.includes('-') || response.includes('1.')) {
      confidence += 0.1;
    }

    // Boost if response seems to answer the question
    const queryWords = query.toLowerCase().split(/\s+/);
    const responseWords = response.toLowerCase().split(/\s+/);
    const overlap = queryWords.filter(word => 
      responseWords.some(rWord => rWord.includes(word) || word.includes(rWord))
    ).length;
    
    if (overlap > queryWords.length * 0.3) {
      confidence += 0.1;
    }

    // Penalty if response is too generic
    const genericPhrases = [
      'xin lỗi',
      'không biết',
      'không chắc',
      'có thể',
      'tùy thuộc',
    ];
    
    if (genericPhrases.some(phrase => response.toLowerCase().includes(phrase))) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * REMOVED: Check if should use LLM fallback (Layer 2 RAG disabled)
   * In 2-layer architecture, fallback is direct from Layer 1 to Layer 2 (LLM)
   */
  // shouldUseFallback(
  //   exactMatchFound: boolean,
  //   ragConfidence: number
  // ): boolean {
  //   if (exactMatchFound) return false;
  //   if (ragConfidence >= DEFAULT_AI_CONFIG.ragConfidenceThreshold) return false;
  //   return true;
  // }

  /**
   * Generate simple confirmation message
   */
  async generateConfirmation(action: string, details: any): Promise<string> {
    try {
      const prompt = `Tạo một câu xác nhận ngắn gọn cho hành động sau:
Hành động: ${action}
Chi tiết: ${JSON.stringify(details)}

Yêu cầu:
- Ngắn gọn, rõ ràng
- Bằng tiếng Việt
- Thân thiện

Xác nhận:`;

      return await this.geminiService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 100,
      });
    } catch (error) {
      // Fallback to simple message
      return `Đã ${action} thành công.`;
    }
  }
}



