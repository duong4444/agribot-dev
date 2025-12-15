import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';
import { LLMFallbackService } from './llm-fallback.service';
import { RagChunk } from '../entities/rag-chunk.entity';

export interface RAGRetrievalOptions {
  userId?: string;
  topK?: number;
  threshold?: number;
}

interface FootnoteReference {
  number: string;
  source: string;
  originalName: string;
  chunkIndex: number;
  similarity: number;
}

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

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly llmService: LLMFallbackService,
  ) {}

  async retrieve(
    query: string,
    options: RAGRetrievalOptions = {},
  ): Promise<RAGResult> {
    const startTime = Date.now();

    // STEP 1: Embed query
    this.logger.log(`Embedding query: "${query}"`);
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    // STEP 2: Vector search
    this.logger.log('Performing vector search');
    this.logger.debug(`Query embedding dimensions: ${queryEmbedding.length}`);
    this.logger.debug(`First 5 values: [${queryEmbedding.slice(0, 5).join(', ')}]`);
    
    // Dynamic threshold based on query complexity
    const dynamicThreshold = this.calculateDynamicThreshold(query);
    console.log("1.options.threshold: ", options.threshold);
    console.log("2.dynamicThreshold: ", dynamicThreshold);
    
    const finalThreshold = options.threshold || dynamicThreshold;
    console.log("3.finalThreshold: ", finalThreshold);
    
    const chunks = await this.vectorStore.similaritySearch(queryEmbedding, {
      topK: options.topK || 5,
      threshold: finalThreshold,
      userId: options.userId,
    });

    const retrievalTime = Date.now() - startTime;

    // STEP 2.5: Early exit if no chunks or low quality
    if (chunks.length === 0) {
      this.logger.log('No chunks found - returning low confidence');
      return {
        answer: 'Xin lỗi, tôi không tìm thấy thông tin liên quan trong tài liệu.',
        confidence: 0,
        sources: [],
        retrievalTime,
        synthesisTime: 0,
      };
    }
    // kma - ngưỡng trung bình các chunk match phải >= 0.5 thì mới gọi synthesize
    // Check average similarity BEFORE calling LLM
    const avgSimilarity = chunks.reduce((sum, c) => sum + (c.similarity || 0), 0) / chunks.length;
    console.log("avgSimilarity: ",avgSimilarity);
    
    const minRequiredSimilarity = 0.5; // Threshold for meaningful retrieval
    
    if (avgSimilarity < minRequiredSimilarity) {
      this.logger.log(
        `Low average similarity (${avgSimilarity.toFixed(3)} < ${minRequiredSimilarity}) - ` +
        `skipping LLM synthesis to save cost`
      );
      console.log("TBC CHUNKS < 0.5 FALLBACK THẲNG LLM");
      
      return {
        answer: `Tài liệu hiện có không chứa thông tin liên quan đến "${query}". ` +
                `Vui lòng thử câu hỏi khác hoặc cung cấp thêm tài liệu.`,
        confidence: 0.2, // Low confidence to trigger Layer 3 fallback
        sources: chunks.map((chunk, idx) => ({
          id: chunk.id,
          content: chunk.content,
          similarity: chunk.similarity || 0,
          documentName: chunk.ragDocument?.originalName || 'Unknown',
          chunkIndex: chunk.chunkIndex,
        })),
        retrievalTime,
        synthesisTime: 0,
      };
    }

    // STEP 3: Synthesize answer (only if similarity is good enough)
    this.logger.log(
      `Good average similarity (${avgSimilarity.toFixed(3)}) - ` +
      `synthesizing answer from ${chunks.length} chunks`
    );
    console.log("ĐÃ PASS NGƯỠNG TRUNG BÌNH CỘNG NÊN GỌI LLM");
    
    const synthesisStart = Date.now();
    const answer = await this.synthesizeAnswer(query, chunks);
    const synthesisTime = Date.now() - synthesisStart;

    // STEP 4: Calculate confidence
    const confidence = this.calculateConfidence(chunks, answer);
    console.log("CONFIDENCE SAU KHI ĐÃ GỌI LLM VÌ PASS NGƯỠNG TBC: ",confidence);
    

    return {
      answer,
      confidence,
      sources: chunks.map((chunk, idx) => ({
        id: chunk.id,
        content: chunk.content,
        similarity: chunk.similarity || 0,
        documentName: chunk.ragDocument?.originalName || 'Unknown',
        chunkIndex: chunk.chunkIndex,
      })),
      retrievalTime,
      synthesisTime,
    };
  }

  private async synthesizeAnswer(
    query: string,
    chunks: RagChunk[],
  ): Promise<string> {
    // Create footnote mapping for academic-style citations
    const footnoteMapping = chunks.map<FootnoteReference>((chunk, idx) => {
      const source = chunk.ragDocument?.originalName || 'Unknown';
      const friendlySourceName = this.formatSourceName(source);
      const footnoteNumber = this.getFootnoteSymbol(idx + 1);
      return {
        number: footnoteNumber,
        source: friendlySourceName,
        originalName: source,
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity || 0,
      };
    });

    // Build context with footnote references
    const context = chunks
      .map((chunk, idx) => {
        const footnoteNumber = footnoteMapping[idx].number;
        return `[Tài liệu ${footnoteNumber}: ${footnoteMapping[idx].source}]\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    console.log("context RAG truyển vào LLM: ",context);
      

    // Build prompt
    const prompt = `
Bạn là trợ lý AI chuyên về nông nghiệp tại Việt Nam.

=== TÀI LIỆU THAM KHẢO ===
${context}

=== CÂU HỎI ===
${query}

=== LƯU Ý QUAN TRỌNG ===
Các tài liệu trên được tìm kiếm bằng semantic search (tìm kiếm theo ngữ nghĩa), do đó:
- Một số tài liệu có thể KHÔNG TRỰC TIẾP liên quan đến câu hỏi
- Một số tài liệu có thể nói về chủ đề TƯƠNG TỰ nhưng KHÔNG PHẢI chủ đề được hỏi
- Bạn CẦN CHỌN LỌC và CHỈ SỬ DỤNG thông tin ĐÚNG với câu hỏi
- CHÚ Ý TUYỆT ĐỐI KHÔNG CỐ GẮNG HIỂN THỊ DẠNG BẢNG

=== YÊU CẦU ===
1. ĐỌC KỸ câu hỏi để xác định CHÍNH XÁC chủ đề được hỏi
2. KIỂM TRA từng tài liệu xem có THỰC SỰ nói về chủ đề đó không
3. CHỈ SỬ DỤNG thông tin từ các tài liệu ĐÚNG chủ đề, BỎ QUA các tài liệu không liên quan
4. Nếu câu hỏi về một loại thông tin CỤ THỂ:
   - CHỈ trả lời về loại đó
   - KHÔNG trả lời về các loại thông tin khác dù chúng có trong tài liệu
5. Nếu KHÔNG có tài liệu nào thực sự nói về chủ đề được hỏi:
   - Nói rõ: "Tài liệu không có thông tin về [chủ đề cụ thể]"
   - KHÔNG tổng hợp thông tin từ các chủ đề khác
6. **ĐỊNH DẠNG**: Trả lời dạng Markdown với cấu trúc rõ ràng:
   - Dùng tiêu đề phụ (ví dụ: "## Thông tin chung", "## Tác dụng")
   - Dùng bullet "-" để liệt kê, mỗi bullet cách nhau một dòng
   - Giữ câu ngắn gọn, 1 ý chính mỗi dòng
7. **XỬ LÝ BẢNG OCR**: Khi gặp nội dung giống bảng bị méo do OCR (nhiều cột, khoảng trắng, số liệu):
   - CHỈ ĐƯỢC DÙNG dạng bullet "-" để liệt kê, mỗi bullet cách nhau một dòng
8. **FOOTNOTE CITATIONS**: Sử dụng superscript numbers cho trích dẫn academic-style:
   - VÍ DỤ: "Sâm Ngọc Linh là loài đặc hữu của Việt Nam ¹"
   - VÍ DỤ: "Phân bố tại dãy núi Ngọc Linh ²"
   - SỬ DỤNG: ¹, ², ³, ⁴, ⁵ (superscript numbers)
9. KHÔNG tự thêm mục "Nguồn tham khảo" ở cuối - hệ thống sẽ tự bổ sung

=== VÍ DỤ FOOTNOTE CITATIONS ===

=== TRẢ LỜI ===
`.trim();

    // Call LLM
    const response = await this.llmService.generateResponse(prompt, {
      reason: 'RAG synthesis',
      temperature: 0.3, // Low temperature for factual answers
    });

    const rawAnswer = response.answer.trim();

    // Only keep footnotes that are actually used in the answer.
    // Lưu ý: tránh case "¹" bị match bên trong "¹⁰".
    const superscriptDigits = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const usedFootnotes = footnoteMapping.filter(f => {
      const symbol = f.number;
      let index = rawAnswer.indexOf(symbol);

      while (index !== -1) {
        const beforeChar = index > 0 ? rawAnswer[index - 1] : '';
        const afterChar =
          index + symbol.length < rawAnswer.length
            ? rawAnswer[index + symbol.length]
            : '';

        const beforeIsSup = superscriptDigits.includes(beforeChar);
        const afterIsSup = superscriptDigits.includes(afterChar);

        // Chỉ chấp nhận nếu ký tự trước/sau KHÔNG phải là superscript digit,
        // tức là symbol không phải một phần của chuỗi superscript dài hơn.
        if (!beforeIsSup && !afterIsSup) {
          return true;
        }

        index = rawAnswer.indexOf(symbol, index + symbol.length);
      }

      return false;
    });

    const referenceSection = this.buildReferenceSection(usedFootnotes);
    const finalAnswer = [rawAnswer, referenceSection]
      .filter(Boolean)
      .join('\n\n');

    return finalAnswer;
  }

  /**
   * Format source name to be more user-friendly
   */
  private formatSourceName(originalName: string): string {
    if (!originalName || originalName === 'Unknown') {
      return 'Tài liệu không xác định';
    }

    // Remove file extensions for cleaner display
    const nameWithoutExt = originalName.replace(/\.(txt|pdf|docx?|md)$/i, '');
    
    // Convert underscores and hyphens to spaces
    const friendlyName = nameWithoutExt
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize first letter of each word for better readability
    const capitalizedName = friendlyName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return capitalizedName;
  }

  /**
   * Build standardized reference section appended to answers
   */
  private buildReferenceSection(footnotes: FootnoteReference[]): string {
    if (!footnotes.length) {
      return '';
    }

    const referenceLines = footnotes.map(
      f => `- ${f.number} ${f.originalName} (chunk ${f.chunkIndex})`,
    );

    // Cấu trúc Markdown:
    // ────────────────────────────────\n
    // Nguồn tham khảo:\n
    // - ¹ file1 (chunk..., ...%)\n
    // - ² file2 (chunk..., ...%)
    return [
      '────────────────────────────────',
      '',
      'Nguồn tham khảo:',
      '',
      ...referenceLines,
    ].join('\n');
  }

  /**
   * Get footnote symbol for academic-style citations
   */
  private getFootnoteSymbol(index: number): string {
    const symbols = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '¹⁰'];
    return symbols[index - 1] || `${index}`;
  }

  /**
   * Calculate dynamic threshold based on query characteristics
   */
  private calculateDynamicThreshold(query: string): number {
    const baseThreshold = 0.35;
    
    // Short specific queries need higher precision
    if (query.length < 30) {
      return Math.min(baseThreshold + 0.1, 0.5); // 0.5 max
    }
    
    // Complex analytical queries can use lower threshold  
    if (query.includes('so sánh') || query.includes('phân tích') || query.includes('mối quan hệ')) {
      return Math.max(baseThreshold - 0.1, 0.25); // 0.25 min
    }
    
    // Technical term queries need higher precision
    if (query.includes('hoạt chất') || query.includes('kỹ thuật') || query.includes('nguyên tắc')) {
      return Math.min(baseThreshold + 0.05, 0.5);
    }
    
    return baseThreshold;
  }

  private calculateConfidence(chunks: RagChunk[], answer: string): number {
    if (chunks.length === 0) return 0;

    // 1. Average similarity (most important factor)
    const avgSimilarity = chunks.reduce((sum, c) => sum + (c.similarity || 0), 0) / chunks.length;

    // 2. Number of chunks
    const countScore = Math.min(chunks.length / 5, 1);

    // 3. Answer length
    const answerLength = answer.length;
    const lengthScore = answerLength > 100 && answerLength < 2000 ? 1 : 0.7;

    // 4. Has citations (superscript footnotes)
    const hasCitations = /[¹²³⁴⁵⁶⁷⁸⁹]/.test(answer);
    const citationScore = hasCitations ? 1 : 0.5;

    // 5. Check if answer indicates "no information found" (as backup check)
    const noInfoPatterns = [
      /không\s+(có|tìm\s+thấy|cung\s+cấp)\s+thông\s+tin/i,
      /rất\s+tiếc.*không/i,
      /tài\s+liệu.*không.*đủ/i,
      /không\s+đề\s+cập/i,
      /chưa\s+có\s+thông\s+tin/i,
    ];
    
    const hasNoInfo = noInfoPatterns.some(pattern => pattern.test(answer));
    
    if (hasNoInfo) {
      this.logger.debug('Answer indicates no relevant information - lowering confidence');
      // Still return low confidence but not as aggressive since we already checked similarity
      return Math.min(avgSimilarity * 0.5, 0.3);
    }

    // Weighted average
    const confidence =
      avgSimilarity * 0.4 +
      countScore * 0.2 +
      lengthScore * 0.2 +
      citationScore * 0.2;

    this.logger.debug(
      `Confidence breakdown: ` +
      `similarity=${avgSimilarity.toFixed(3)} (${(avgSimilarity * 0.4).toFixed(3)}), ` +
      `count=${countScore.toFixed(3)} (${(countScore * 0.2).toFixed(3)}), ` +
      `length=${lengthScore.toFixed(3)} (${(lengthScore * 0.2).toFixed(3)}), ` +
      `citation=${citationScore.toFixed(3)} (${(citationScore * 0.2).toFixed(3)}) ` +
      `→ total=${confidence.toFixed(3)}`
    );

    return Math.min(confidence, 1);
  }
}
