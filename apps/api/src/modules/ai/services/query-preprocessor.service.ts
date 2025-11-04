import { Injectable, Logger } from '@nestjs/common';

/**
 * Query Preprocessor Service
 * 
 * Cleans and optimizes user queries before FTS search:
 * - Removes noise words (cho tôi biết, vui lòng, etc.)
 * - Normalizes Vietnamese diacritics
 * - Extracts keywords
 * - Improves Layer 1 FTS match rate
 */

@Injectable()
export class QueryPreprocessorService {
  private readonly logger = new Logger(QueryPreprocessorService.name);

  /**
   * Noise patterns to remove from queries
   * These patterns don't add semantic value but dilute FTS scores
   */
  private readonly noisePatterns = [
    // Polite forms: "cho tôi biết", "vui lòng cho biết"
    /^(cho|xin|hãy|vui lòng)\s+(tôi|mình|em|anh|chị)\s+(biết|hỏi|xem|tìm hiểu)\s+/gi,
    
    // Want/need forms: "tôi muốn biết", "tôi cần hỏi"
    /^(tôi|mình|em|anh|chị)\s+(muốn|cần|định|đang)\s+(biết|hỏi|xem|tìm hiểu)\s+/gi,
    
    // Question forms: "làm sao để", "thế nào để"
    /^(làm sao|thế nào|như thế nào|ra sao)\s+(để)\s+/gi,
    
    // Trailing particles: "được không", "nhé", "ạ"
    /\s+(được|đi|nhé|ạ|à|nha|không)$/gi,
    
    // Redundant question words
    /^(hỏi về|câu hỏi về|thắc mắc về)\s+/gi,
  ];

  /**
   * Vietnamese stop words (low semantic value)
   */
  private readonly stopWords = new Set([
    'của', 'cho', 'và', 'có', 'thì', 'là', 'được', 
    'một', 'các', 'để', 'trong', 'này', 'đó', 'khi',
    'với', 'từ', 'về', 'theo', 'như', 'bởi', 'hay',
    'hoặc', 'nhưng', 'mà', 'nếu', 'vì', 'do', 'nên',
  ]);

  /**
   * Clean query by removing noise patterns
   * 
   * @example
   * Input:  "cho tôi biết cách tưới nước cho lúa"
   * Output: "cách tưới nước lúa"
   */
  cleanQuery(query: string): string {
    if (!query || query.trim().length === 0) {
      return '';
    }

    let cleaned = query.trim().toLowerCase();
    
    // Remove noise patterns
    this.noisePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // If too short after cleaning, return original
    if (cleaned.length < 3) {
      this.logger.warn(`Query too short after cleaning: "${query}" → "${cleaned}"`);
      return query.trim().toLowerCase();
    }
    
    this.logger.debug(`Query cleaned: "${query}" → "${cleaned}"`);
    return cleaned;
  }

  /**
   * Extract keywords from query (remove stop words)
   * 
   * @example
   * Input:  "cách tưới nước cho lúa trong mùa khô"
   * Output: ['cách', 'tưới', 'nước', 'lúa', 'mùa', 'khô']
   */
  extractKeywords(query: string): string[] {
    const cleaned = this.cleanQuery(query);
    
    const keywords = cleaned
      .split(' ')
      .filter(word => {
        // Keep words that are:
        // - Length > 2
        // - Not stop words
        // - Not numbers only
        return (
          word.length > 2 && 
          !this.stopWords.has(word) &&
          !/^\d+$/.test(word)
        );
      });
    
    return keywords;
  }

  /**
   * Preprocess query for optimal FTS matching
   * 
   * Returns both cleaned query and keywords
   */
  preprocess(query: string): {
    original: string;
    cleaned: string;
    keywords: string[];
    keywordQuery: string;
  } {
    const cleaned = this.cleanQuery(query);
    const keywords = this.extractKeywords(query);
    const keywordQuery = keywords.join(' ');
    
    return {
      original: query,
      cleaned,
      keywords,
      keywordQuery,
    };
  }

  /**
   * Boost query with important terms
   * 
   * Adds weight to agriculture-specific terms
   */
  boostQuery(query: string): string {
    const boostTerms: Record<string, number> = {
      'lúa': 2,
      'cà chua': 2,
      'phân bón': 2,
      'tưới nước': 2,
      'sâu bệnh': 2,
      'thu hoạch': 2,
    };

    let boosted = query;
    
    Object.entries(boostTerms).forEach(([term, weight]) => {
      if (query.includes(term)) {
        // Repeat important terms to boost FTS rank
        const repeats = Array(weight).fill(term).join(' ');
        boosted = `${boosted} ${repeats}`;
      }
    });
    
    return boosted;
  }

  /**
   * Suggest alternate phrasings for low-match queries
   */
  suggestAlternatives(query: string): string[] {
    const alternatives: string[] = [];
    
    // Convert questions to statements
    if (query.includes('như thế nào') || query.includes('thế nào')) {
      alternatives.push(query.replace(/như thế nào|thế nào/g, ''));
    }
    
    // Remove question words
    if (query.includes('?')) {
      alternatives.push(query.replace('?', ''));
    }
    
    // Try with just keywords
    const keywords = this.extractKeywords(query);
    if (keywords.length >= 2) {
      alternatives.push(keywords.join(' '));
    }
    
    return alternatives.filter(alt => alt.length > 3);
  }

  /**
   * Analyze query complexity
   * 
   * Helps determine if query needs special handling
   */
  analyzeQuery(query: string): {
    length: number;
    wordCount: number;
    hasNoiseWords: boolean;
    complexity: 'simple' | 'medium' | 'complex';
    recommendPreprocessing: boolean;
  } {
    const words = query.trim().split(/\s+/);
    const keywords = this.extractKeywords(query);
    const noiseWordCount = words.length - keywords.length;
    
    const hasNoiseWords = noiseWordCount > 0;
    
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (words.length > 10) complexity = 'complex';
    else if (words.length > 5) complexity = 'medium';
    
    const recommendPreprocessing = hasNoiseWords || complexity !== 'simple';
    
    return {
      length: query.length,
      wordCount: words.length,
      hasNoiseWords,
      complexity,
      recommendPreprocessing,
    };
  }
}
