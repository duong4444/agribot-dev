import { Injectable, Logger } from '@nestjs/common';
import { RAGResult, RAGContext, DocumentChunk } from '../types';
import { VectorSearchService } from './vector-search.service';
import { GeminiService } from '../gemini.service';
import { DEFAULT_AI_CONFIG, PROMPT_TEMPLATES } from '../constants';

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private readonly vectorSearch: VectorSearchService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * Layer 2: RAG - Retrieve and Generate
   */
  async retrieve(
    query: string,
    options: {
      userId?: string;
      category?: string;
      topK?: number;
      useHybrid?: boolean;
    } = {}
  ): Promise<RAGResult> {
    const startTime = Date.now();
    const {
      userId,
      category,
      topK = DEFAULT_AI_CONFIG.ragTopK,
      useHybrid = true,
    } = options;

    try {
      // 1. Retrieve relevant chunks
      const searchResults = useHybrid
        ? await this.vectorSearch.hybridSearch(query, {
            topK,
            userId,
            category,
          })
        : await this.vectorSearch.search(query, {
            topK,
            userId,
            category,
          });

      if (searchResults.length === 0) {
        return {
          found: false,
          context: {
            chunks: [],
            totalRetrieved: 0,
            query,
          },
          confidence: 0,
          sources: [],
        };
      }

      // 2. Build context from chunks
      const chunks: DocumentChunk[] = searchResults.map(r => ({
        id: r.chunk.id,
        content: r.chunk.content,
        metadata: {
          documentId: r.chunk.documentId,
          filename: r.chunk.metadata?.documentFilename || 'Unknown',
          pageNumber: r.chunk.pageNumber,
          chunkIndex: r.chunk.chunkIndex,
        },
        score: r.score,
      }));

      const context: RAGContext = {
        chunks,
        totalRetrieved: chunks.length,
        query,
      };

      // 3. Generate answer using LLM
      const answer = await this.generateAnswer(query, chunks);

      // 4. Calculate confidence
      const avgScore =
        searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length;
      const confidence = Math.min(avgScore * 1.2, 1.0); // Boost a bit

      // 5. Extract unique sources
      const sourcesMap = new Map<string, any>();
      searchResults.forEach(r => {
        const docId = r.chunk.documentId;
        if (!sourcesMap.has(docId)) {
          sourcesMap.set(docId, {
            documentId: docId,
            filename: r.chunk.metadata?.documentFilename || 'Unknown',
            relevanceScore: r.score,
          });
        } else {
          // Update with higher score
          const existing = sourcesMap.get(docId)!;
          if (r.score > existing.relevanceScore) {
            existing.relevanceScore = r.score;
          }
        }
      });

      const sources = Array.from(sourcesMap.values()).sort(
        (a, b) => b.relevanceScore - a.relevanceScore
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `RAG completed: ${chunks.length} chunks, confidence ${confidence.toFixed(2)} in ${processingTime}ms`
      );

      return {
        found: true,
        answer,
        context,
        confidence,
        sources,
      };
    } catch (error) {
      this.logger.error('Error in RAG retrieval:', error);
      return {
        found: false,
        context: {
          chunks: [],
          totalRetrieved: 0,
          query,
        },
        confidence: 0,
        sources: [],
      };
    }
  }

  /**
   * Generate answer from retrieved chunks using LLM
   */
  private async generateAnswer(
    query: string,
    chunks: DocumentChunk[]
  ): Promise<string> {
    // Build context from chunks
    const contextText = chunks
      .map((chunk, index) => {
        const source = chunk.metadata?.filename || 'Unknown';
        const page = chunk.metadata?.pageNumber
          ? ` (Trang ${chunk.metadata.pageNumber})`
          : '';
        return `[${index + 1}] Nguồn: ${source}${page}\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    // Build prompt
    const prompt = PROMPT_TEMPLATES.RAG_SYNTHESIS
      .replace('{context}', contextText)
      .replace('{query}', query);

    try {
      // Use Gemini to synthesize answer
      const response = await this.geminiService.generateText(prompt, {
        temperature: 0.3, // Lower temperature for more factual responses
        maxTokens: DEFAULT_AI_CONFIG.llmMaxTokens,
      });

      return response;
    } catch (error) {
      this.logger.error('Error generating answer with LLM:', error);
      
      // Fallback: return top chunk content
      if (chunks.length > 0) {
        return `Dựa vào tài liệu:\n\n${chunks[0].content}\n\n(Lưu ý: Câu trả lời chưa được tổng hợp bởi AI)`;
      }

      throw error;
    }
  }

  /**
   * Check if RAG should be used based on confidence
   */
  shouldUseRAG(confidence: number): boolean {
    return confidence >= DEFAULT_AI_CONFIG.ragConfidenceThreshold;
  }

  /**
   * Get context summary
   */
  getContextSummary(context: RAGContext): string {
    const uniqueSources = new Set(
      context.chunks.map(c => c.metadata?.filename || 'Unknown')
    );

    return `Tìm thấy ${context.chunks.length} đoạn văn bản từ ${uniqueSources.size} tài liệu.`;
  }
}



