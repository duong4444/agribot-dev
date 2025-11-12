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
    
    const chunks = await this.vectorStore.similaritySearch(queryEmbedding, {
      topK: options.topK || 5,
      threshold: options.threshold || 0.3, // Lowered for testing
      userId: options.userId,
    });

    if (chunks.length === 0) {
      return {
        answer: 'Xin lỗi, tôi không tìm thấy thông tin liên quan trong tài liệu.',
        confidence: 0,
        sources: [],
        retrievalTime: Date.now() - startTime,
        synthesisTime: 0,
      };
    }

    const retrievalTime = Date.now() - startTime;

    // STEP 3: Synthesize answer (no reranking)
    this.logger.log(`Synthesizing answer from ${chunks.length} chunks`);
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
2. CHỈ sử dụng thông tin từ các tài liệu trên
3. Trích dẫn nguồn bằng [Nguồn X] sau mỗi thông tin quan trọng
4. Nếu tài liệu không đủ thông tin, hãy nói rõ phần nào còn thiếu
5. Cấu trúc câu trả lời dễ đọc (dùng bullet points nếu phù hợp)
6. KHÔNG bịa đặt thông tin không có trong tài liệu

=== TRẢ LỜI ===
`.trim();

    // Call LLM
    const response = await this.llmService.generateResponse(prompt, {
      reason: 'RAG synthesis',
      temperature: 0.3, // Low temperature for factual answers
    });

    return response.answer;
  }

  private calculateConfidence(chunks: RagChunk[], answer: string): number {
    if (chunks.length === 0) return 0;

    // 1. Average similarity
    const avgSimilarity = chunks.reduce((sum, c) => sum + (c.similarity || 0), 0) / chunks.length;

    // 2. Number of chunks
    const countScore = Math.min(chunks.length / 5, 1);

    // 3. Answer length
    const answerLength = answer.length;
    const lengthScore = answerLength > 100 && answerLength < 2000 ? 1 : 0.7;

    // 4. Has citations
    const hasCitations = /\[Nguồn \d+\]/.test(answer);
    const citationScore = hasCitations ? 1 : 0.5;

    // Weighted average
    const confidence =
      avgSimilarity * 0.4 +
      countScore * 0.2 +
      lengthScore * 0.2 +
      citationScore * 0.2;

    return Math.min(confidence, 1);
  }
}
