import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { EmbeddingService } from './embedding.service';
import { DEFAULT_AI_CONFIG } from '../constants';

export interface VectorSearchResult {
  chunk: DocumentChunk;
  score: number;
  distance?: number;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Semantic search using vector similarity
   */
  async search(
    query: string,
    options: {
      topK?: number;
      userId?: string;
      category?: string;
      minScore?: number;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const startTime = Date.now();
    const {
      topK = DEFAULT_AI_CONFIG.ragTopK,
      userId,
      category,
      minScore = 0.5,
    } = options;

    try {
      // 1. Generate query embedding
      const queryEmbedding = await this.embeddingService.embedSingle(query);

      // 2. Perform vector similarity search
      const results = await this.vectorSimilaritySearch(
        queryEmbedding,
        topK,
        userId,
        category
      );

      // 3. Filter by minimum score
      const filtered = results.filter(r => r.score >= minScore);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Vector search completed: ${filtered.length} results in ${processingTime}ms`
      );

      return filtered;
    } catch (error) {
      this.logger.error('Error in vector search:', error);
      return [];
    }
  }

  /**
   * Perform vector similarity search using pgvector
   */
  private async vectorSimilaritySearch(
    queryEmbedding: number[],
    limit: number,
    userId?: string,
    category?: string
  ): Promise<VectorSearchResult[]> {
    try {
      const queryBuilder = this.chunkRepo
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.document', 'document')
        .where('chunk.embedding IS NOT NULL');

      // Add filters
      if (userId) {
        queryBuilder.andWhere('document.userId = :userId', { userId });
      }

      if (category) {
        queryBuilder.andWhere('document.category = :category', { category });
      }

      // Vector similarity using cosine distance (pgvector)
      // Note: Requires pgvector extension installed
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      
      queryBuilder
        .addSelect(
          `1 - (chunk.embedding <=> '${embeddingStr}')`,
          'similarity_score'
        )
        .orderBy('chunk.embedding <=> :embedding', 'ASC')
        .setParameter('embedding', embeddingStr)
        .limit(limit);

      const chunks = await queryBuilder.getRawAndEntities();

      // Map results with scores
      return chunks.raw.map((raw: any, index: number) => ({
        chunk: chunks.entities[index],
        score: parseFloat(raw.similarity_score) || 0,
        distance: 1 - (parseFloat(raw.similarity_score) || 0),
      }));
    } catch (error) {
      // Fallback to in-memory cosine similarity if pgvector fails
      this.logger.warn('pgvector search failed, using fallback:', error.message);
      return this.fallbackSimilaritySearch(queryEmbedding, limit, userId, category);
    }
  }

  /**
   * Fallback similarity search (in-memory)
   */
  private async fallbackSimilaritySearch(
    queryEmbedding: number[],
    limit: number,
    userId?: string,
    category?: string
  ): Promise<VectorSearchResult[]> {
    const queryBuilder = this.chunkRepo
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.document', 'document')
      .where('chunk.embedding IS NOT NULL');

    if (userId) {
      queryBuilder.andWhere('document.userId = :userId', { userId });
    }

    if (category) {
      queryBuilder.andWhere('document.category = :category', { category });
    }

    const chunks = await queryBuilder.getMany();

    // Calculate similarity in-memory
    const results: VectorSearchResult[] = chunks
      .map(chunk => {
        if (!chunk.embedding) return null;

        const score = this.embeddingService.cosineSimilarity(
          queryEmbedding,
          chunk.embedding
        );

        return {
          chunk,
          score,
          distance: 1 - score,
        };
      })
      .filter((r): r is VectorSearchResult => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * Hybrid search: combine full-text and vector search
   */
  async hybridSearch(
    query: string,
    options: {
      topK?: number;
      userId?: string;
      category?: string;
      ftWeight?: number; // Full-text weight (0-1)
      vectorWeight?: number; // Vector weight (0-1)
    } = {}
  ): Promise<VectorSearchResult[]> {
    const {
      topK = DEFAULT_AI_CONFIG.ragTopK,
      userId,
      category,
      ftWeight = 0.3,
      vectorWeight = 0.7,
    } = options;

    // 1. Vector search
    const vectorResults = await this.search(query, {
      topK: topK * 2,
      userId,
      category,
      minScore: 0,
    });

    // 2. Full-text search
    const ftResults = await this.fullTextSearch(query, {
      topK: topK * 2,
      userId,
      category,
    });

    // 3. Combine scores
    const combinedMap = new Map<string, VectorSearchResult>();

    vectorResults.forEach(result => {
      combinedMap.set(result.chunk.id, {
        ...result,
        score: result.score * vectorWeight,
      });
    });

    ftResults.forEach(result => {
      const existing = combinedMap.get(result.chunk.id);
      if (existing) {
        existing.score += result.score * ftWeight;
      } else {
        combinedMap.set(result.chunk.id, {
          ...result,
          score: result.score * ftWeight,
        });
      }
    });

    // 4. Sort and limit
    return Array.from(combinedMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Full-text search (for hybrid)
   */
  private async fullTextSearch(
    query: string,
    options: {
      topK?: number;
      userId?: string;
      category?: string;
    }
  ): Promise<VectorSearchResult[]> {
    const { topK = 10, userId, category } = options;

    try {
      const queryBuilder = this.chunkRepo
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.document', 'document');

      if (userId) {
        queryBuilder.andWhere('document.userId = :userId', { userId });
      }

      if (category) {
        queryBuilder.andWhere('document.category = :category', { category });
      }

      queryBuilder
        .andWhere("chunk.searchVector @@ plainto_tsquery('vietnamese', :query)", {
          query,
        })
        .addSelect(
          "ts_rank(chunk.searchVector, plainto_tsquery('vietnamese', :query))",
          'rank_score'
        )
        .orderBy('rank_score', 'DESC')
        .limit(topK);

      const chunks = await queryBuilder.getRawAndEntities();

      return chunks.raw.map((raw: any, index: number) => ({
        chunk: chunks.entities[index],
        score: parseFloat(raw.rank_score) || 0,
      }));
    } catch (error) {
      this.logger.warn('Full-text search failed:', error.message);
      return [];
    }
  }
}



