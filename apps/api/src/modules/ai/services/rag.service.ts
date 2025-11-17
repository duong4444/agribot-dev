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
    console.log("options.threshold: ", options.threshold);
    console.log("dynamicThreshold: ", dynamicThreshold);
    
    const finalThreshold = options.threshold || dynamicThreshold;
    console.log("finalThreshold: ", finalThreshold);
    
    const chunks = await this.vectorStore.similaritySearch(queryEmbedding, {
      topK: options.topK || 5,
      threshold: finalThreshold,
      userId: options.userId,
    });

    const retrievalTime = Date.now() - startTime;

    // STEP 2.5: Early exit if no chunks or low quality
    if (chunks.length === 0) {
      this.logger.log('❌ No chunks found - returning low confidence');
      return {
        answer: 'Xin lỗi, tôi không tìm thấy thông tin liên quan trong tài liệu.',
        confidence: 0,
        sources: [],
        retrievalTime,
        synthesisTime: 0,
      };
    }

    // Check average similarity BEFORE calling LLM
    const avgSimilarity = chunks.reduce((sum, c) => sum + (c.similarity || 0), 0) / chunks.length;
    const minRequiredSimilarity = 0.45; // Threshold for meaningful retrieval
    
    if (avgSimilarity < minRequiredSimilarity) {
      this.logger.log(
        `Low average similarity (${avgSimilarity.toFixed(3)} < ${minRequiredSimilarity}) - ` +
        `skipping LLM synthesis to save cost`
      );
      
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
    const synthesisStart = Date.now();
    const answer = await this.synthesizeAnswer(query, chunks);
    const synthesisTime = Date.now() - synthesisStart;

    // STEP 4: Calculate confidence
    const confidence = this.calculateConfidence(chunks, answer);

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
    // Build context from chunks
    const context = chunks
      .map((chunk, idx) => {
        const source = chunk.ragDocument?.originalName || 'Unknown';
        return `[Nguồn ${idx + 1}] (${source})\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    // Build prompt
    const prompt = `
Bạn là trợ lý AI chuyên về nông nghiệp tại Việt Nam.

=== TÀI LIỆU THAM KHẢO ===
${context}

=== CÂU HỎI ===
${query}

=== YÊU CẦU ===
1. Trả lời bằng tiếng Việt, rõ ràng và chi tiết
2. ĐỌC KỸ câu hỏi và CHỈ trả lời ĐÚNG về chủ đề được hỏi
3. Nếu câu hỏi về một loại sâu/bệnh CỤ THỂ, CHỈ trả lời về loại đó, KHÔNG trả lời về các loại khác
4. Nếu tài liệu KHÔNG có thông tin về chủ đề CỤ THỂ được hỏi, hãy nói rõ "Tài liệu không có thông tin về [chủ đề cụ thể]"
5. Trích dẫn nguồn bằng [Nguồn X] sau mỗi thông tin quan trọng
6. Cấu trúc câu trả lời dễ đọc (dùng bullet points nếu phù hợp)

VÍ DỤ:
- Nếu hỏi về "sâu đục thân" mà tài liệu chỉ có "câu cấu" → Trả lời: "Tài liệu không có thông tin về sâu đục thân"
- Nếu hỏi về "bệnh vàng lá" mà tài liệu chỉ có "bệnh đốm lá" → Trả lời: "Tài liệu không có thông tin về bệnh vàng lá"

=== TRẢ LỜI ===
`.trim();

    // Call LLM
    const response = await this.llmService.generateResponse(prompt, {
      reason: 'RAG synthesis',
      temperature: 0.3, // Low temperature for factual answers
    });

    return response.answer;
  }

  /**
   * Calculate dynamic threshold based on query characteristics
   */
  private calculateDynamicThreshold(query: string): number {
    const baseThreshold = 0.35;
    
    // Short specific queries need higher precision
    if (query.length < 30) {
      return Math.min(baseThreshold + 0.1, 0.5); // 0.45 max
    }
    
    // Complex analytical queries can use lower threshold  
    if (query.includes('so sánh') || query.includes('phân tích') || query.includes('mối quan hệ')) {
      return Math.max(baseThreshold - 0.1, 0.25); // 0.25 min
    }
    
    // Technical term queries need higher precision
    if (query.includes('hoạt chất') || query.includes('kỹ thuật') || query.includes('nguyên tắc')) {
      return Math.min(baseThreshold + 0.05, 0.45);
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

    // 4. Has citations
    const hasCitations = /\[Nguồn \d+\]/.test(answer);
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
