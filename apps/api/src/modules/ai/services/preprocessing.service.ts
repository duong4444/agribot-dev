import { Injectable, Logger } from '@nestjs/common';
import { normalizeText, tokenize, removeVietnameseAccents } from '../utils';

export interface PreprocessingResult {
  original: string;
  normalized: string;
  tokens: string[];
  withoutAccents: string;
  cleaned: string;
}

@Injectable()
export class PreprocessingService {
  private readonly logger = new Logger(PreprocessingService.name);

  /**
   * Preprocess user query
   */
  preprocess(query: string): PreprocessingResult {
    const startTime = Date.now();

    // 1. Normalize text
    const normalized = normalizeText(query);

    // 2. Tokenize
    const tokens = tokenize(normalized);

    // 3. Remove accents (for fuzzy matching)
    const withoutAccents = removeVietnameseAccents(normalized);

    // 4. Clean (remove special characters but keep Vietnamese)
    const cleaned = this.cleanText(normalized);

    const processingTime = Date.now() - startTime;
    this.logger.debug(`Preprocessed query in ${processingTime}ms`);

    return {
      original: query,
      normalized,
      tokens,
      withoutAccents,
      cleaned,
    };
  }

  /**
   * Clean text - remove special characters
   */
  private cleanText(text: string): string {
    return text
      .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract question type
   */
  getQuestionType(query: string): 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'other' {
    const normalized = normalizeText(query);

    if (/^(cái\s*gì|gì|là\s*gì)/i.test(normalized)) return 'what';
    if (/(như\s*thế\s*nào|thế\s*nào|cách|làm\s*sao)/i.test(normalized)) return 'how';
    if (/(tại\s*sao|vì\s*sao|tại\s*vì)/i.test(normalized)) return 'why';
    if (/(khi\s*nào|bao\s*giờ|lúc\s*nào)/i.test(normalized)) return 'when';
    if (/(ở\s*đâu|đâu|nơi\s*nào)/i.test(normalized)) return 'where';
    if (/(ai|người\s*nào)/i.test(normalized)) return 'who';

    return 'other';
  }

  /**
   * Detect if query is a question
   */
  isQuestion(query: string): boolean {
    const normalized = normalizeText(query);
    
    // Check for question marks
    if (query.includes('?')) return true;

    // Check for question words
    const questionWords = [
      /^(cái\s*gì|gì|là\s*gì)/i,
      /(như\s*thế\s*nào|thế\s*nào|cách|làm\s*sao)/i,
      /(tại\s*sao|vì\s*sao)/i,
      /(khi\s*nào|bao\s*giờ)/i,
      /(ở\s*đâu|đâu)/i,
      /(ai|người\s*nào)/i,
      /(có|được|phải)/i,
    ];

    return questionWords.some(pattern => pattern.test(normalized));
  }

  /**
   * Detect if query is a command/imperative
   */
  isCommand(query: string): boolean {
    const normalized = normalizeText(query);

    const commandWords = [
      /^(bật|tắt|mở|đóng)/i,
      /^(tưới|phun)/i,
      /^(cho|hãy|làm)/i,
      /^(tạo|thêm|xóa|sửa)/i,
    ];

    return commandWords.some(pattern => pattern.test(normalized));
  }

  /**
   * Extract numerical values from query
   */
  extractNumbers(query: string): number[] {
    const numberPattern = /(\d+[\d,\.]*)/g;
    const matches = query.matchAll(numberPattern);
    
    const numbers: number[] = [];
    for (const match of matches) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }

    return numbers;
  }

  /**
   * Extract time expressions
   */
  extractTimeExpressions(query: string): string[] {
    const normalized = normalizeText(query);
    const timeExpressions: string[] = [];

    const timePatterns = [
      /hôm\s*nay/gi,
      /hôm\s*qua/gi,
      /ngày\s*mai/gi,
      /tuần\s*này/gi,
      /tuần\s*trước/gi,
      /tuần\s*sau/gi,
      /tháng\s*này/gi,
      /tháng\s*trước/gi,
      /tháng\s*\d+/gi,
      /năm\s*này/gi,
      /năm\s*\d{4}/gi,
    ];

    timePatterns.forEach(pattern => {
      const matches = normalized.matchAll(pattern);
      for (const match of matches) {
        timeExpressions.push(match[0]);
      }
    });

    return timeExpressions;
  }
}



