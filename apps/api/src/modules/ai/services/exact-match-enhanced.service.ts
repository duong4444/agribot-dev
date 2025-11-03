import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { ExactMatchResult } from '../types';
import { DEFAULT_AI_CONFIG } from '../constants';
import {
  calculateSimilarity,
  normalizeText,
  calculateBM25Score,
  cosineSimilarity,
  jaccardSimilarity,
} from '../utils/text.utils';

/**
 * Enhanced Exact Match Service with Advanced FTS
 *
 * Features:
 * - PostgreSQL Full-Text Search with Vietnamese support
 * - Multi-algorithm similarity scoring (Jaccard, Cosine, Levenshtein, BM25)
 * - Fuzzy matching fallback with trigram
 * - Query expansion and synonym support
 * - Result caching for performance
 * - Detailed logging and metrics
 */

interface SearchOptions {
  userId?: string;
  limit?: number;
  minScore?: number;
  useFuzzyFallback?: boolean;
  includeMetadata?: boolean;
}

interface ScoredChunk {
  chunk: DocumentChunk;
  scores: {
    ftsRank: number;
    similarity: number;
    jaccard: number;
    cosine: number;
    bm25: number;
    final: number;
  };
}

@Injectable()
export class ExactMatchEnhancedService {
  private readonly logger = new Logger(ExactMatchEnhancedService.name);
  private avgDocLength: number = 100; // Will be calculated dynamically

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
  ) {
    this.initializeAvgDocLength();
  }

  /**
   * Initialize average document length for BM25
   */
  private async initializeAvgDocLength(): Promise<void> {
    try {
      const result = await this.chunkRepo
        .createQueryBuilder('chunk')
        .select('AVG(chunk.tokenCount)', 'avgLength')
        .getRawOne();

      this.avgDocLength = result?.avgLength || 100;
      this.logger.log(
        `Average document length initialized: ${this.avgDocLength}`,
      );
    } catch (error) {
      this.logger.warn('Failed to calculate avg doc length, using default');
    }
  }

  /**
   * Main method: Find exact match with advanced FTS
   */
  async findExactMatch(
    query: string,
    userId?: string,
    options: SearchOptions = {},
  ): Promise<ExactMatchResult> {
    const startTime = Date.now();
    console.log('_exactMatchEnhanced_findExactMatch _ xử lý normalizeText');

    const normalizedQuery = normalizeText(query);
    console.log(
      '_exactMatchEnhanced_findExactMatch_ normalizedQuery: ',
      normalizedQuery,
    );

    this.logger.debug(`🔍 Searching for: "${query}"`);

    try {
      // Step 1: Try Full-Text Search with ranking
      // array of DocumentChunk with ftsRank
      const ftsResults = await this.fullTextSearchRanked(
        normalizedQuery,
        userId,
        options.limit || 10,
      );

      console.log(
        'exactMatchEnhanced_findExactMatch_ ftsResults: ',
        ftsResults,
      );

      if (ftsResults.length === 0) {
        // Step 2: Fallback to fuzzy search
        if (options.useFuzzyFallback !== false) {
          this.logger.debug('FTS returned no results, trying fuzzy search...');
          return await this.fuzzySearchFallback(
            normalizedQuery,
            userId,
            options,
          );
        }

        return {
          found: false,
          confidence: 0,
        };
      }

      // Step 3: Score all results with multiple algorithms
      const scoredChunks = await this.scoreChunks(ftsResults, normalizedQuery);

      // Step 4: Sort by final score
      scoredChunks.sort((a, b) => b.scores.final - a.scores.final);

      const topMatch = scoredChunks[0];
      const processingTime = Date.now() - startTime;

      // Log detailed scores
      this.logger.debug(
        `Top match scores - FTS: ${topMatch.scores.ftsRank.toFixed(3)}, ` +
          `Similarity: ${topMatch.scores.similarity.toFixed(3)}, ` +
          `Jaccard: ${topMatch.scores.jaccard.toFixed(3)}, ` +
          `Cosine: ${topMatch.scores.cosine.toFixed(3)}, ` +
          `BM25: ${topMatch.scores.bm25.toFixed(3)}, ` +
          `Final: ${topMatch.scores.final.toFixed(3)}`,
      );

      // Step 5: Check if confidence exceeds threshold
      if (
        topMatch.scores.final >=
        (options.minScore || DEFAULT_AI_CONFIG.exactMatchThreshold)
      ) {
        this.logger.log(
          `✅ Exact match found (score: ${topMatch.scores.final.toFixed(3)}) in ${processingTime}ms`,
        );

        return {
          found: true,
          content: topMatch.chunk.content,
          source: {
            documentId: topMatch.chunk.documentId,
            filename: topMatch.chunk.metadata?.documentFilename || 'Unknown',
            pageNumber: topMatch.chunk.pageNumber,
            chunkIndex: topMatch.chunk.chunkIndex,
          },
          confidence: topMatch.scores.final,
        };
      }

      // Not confident enough
      this.logger.debug(
        `❌ Best match score ${topMatch.scores.final.toFixed(3)} below threshold ${DEFAULT_AI_CONFIG.exactMatchThreshold}`,
      );

      return {
        found: false,
        confidence: topMatch.scores.final,
      };
    } catch (error) {
      this.logger.error('Error in exact match search:', error);
      return {
        found: false,
        confidence: 0,
      };
    }
  }

  /**
   * Full-Text Search with ts_rank scoring
   */
  private async fullTextSearchRanked(
    query: string,
    userId?: string,
    limit: number = 10,
  ): Promise<Array<DocumentChunk & { ftsRank: number }>> {
    console.log('fullTextSearchRanked called vì findExactMatch_enhanced gọi');
    /**
     * SELECT 
      chunk.*,
      ts_rank(chunk.searchVector, plainto_tsquery('vietnamese', :query)) as fts_rank
      FROM document_chunks chunk
      JOIN documents document ON chunk.documentId = document.id
      WHERE 
      chunk.searchVector @@ plainto_tsquery('vietnamese', :query)
      AND document.processingStatus = 'completed'
      AND document.userId = :userId
      ORDER BY fts_rank DESC
      LIMIT :limit
     */
    try {
      const queryBuilder = this.chunkRepo
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.document', 'document')
        .addSelect(
          "ts_rank(chunk.searchVector, plainto_tsquery('vietnamese', :query))",
          'fts_rank',
        )
        .where("chunk.searchVector @@ plainto_tsquery('vietnamese', :query)", {
          query,
        })
        .andWhere('document.processingStatus = :status', {
          status: 'completed',
        });

      // Add user filter
      if (userId) {
        queryBuilder.andWhere('document.userId = :userId', { userId });
      }

      // Order by rank and limit
      queryBuilder.orderBy('fts_rank', 'DESC').limit(limit);
      console.log('queryBuilder: ', queryBuilder);

      const results = await queryBuilder.getRawAndEntities();

      // Combine entities with FTS rank
      return results.entities.map((entity, index) => ({
        ...entity,
        ftsRank: parseFloat(results.raw[index]?.fts_rank || '0'),
      }));
    } catch (error) {
      this.logger.warn('FTS ranked search failed:', error.message);
      // Fallback to basic LIKE search
      return this.likeSearchWithRank(query, userId, limit);
    }
  }

  /**
   * Fallback: LIKE search with manual ranking
   */
  private async likeSearchWithRank(
    query: string,
    userId?: string,
    limit: number = 10,
  ): Promise<Array<DocumentChunk & { ftsRank: number }>> {
    const queryBuilder = this.chunkRepo
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.document', 'document')
      .where('chunk.content ILIKE :query', { query: `%${query}%` })
      .andWhere('document.processingStatus = :status', { status: 'completed' });

    if (userId) {
      queryBuilder.andWhere('document.userId = :userId', { userId });
    }

    const chunks = await queryBuilder.limit(limit).getMany();

    // Add manual rank based on position
    return chunks.map((chunk) => ({
      ...chunk,
      ftsRank:
        chunk.content.toLowerCase().indexOf(query.toLowerCase()) === 0
          ? 1.0
          : 0.5,
    }));
  }

  /**
   * Score chunks with multiple algorithms
   */
  private async scoreChunks(
    chunks: Array<DocumentChunk & { ftsRank: number }>,
    query: string,
  ): Promise<ScoredChunk[]> {
    return chunks.map((chunk) => {
      const content = normalizeText(chunk.content);
      const normalizedQuery = normalizeText(query);

      // Calculate different similarity scores
      const similarity = calculateSimilarity(normalizedQuery, content);
      const jaccard = jaccardSimilarity(normalizedQuery, content);
      const cosine = cosineSimilarity(normalizedQuery, content);
      const bm25 = calculateBM25Score(
        normalizedQuery,
        content,
        this.avgDocLength,
      );

      // Normalize BM25 score (typically 0-10 range)
      const normalizedBM25 = Math.min(bm25 / 10, 1);

      // Calculate final weighted score
      // FTS Rank: 30%, Similarity: 25%, Jaccard: 15%, Cosine: 15%, BM25: 15%
      const finalScore =
        chunk.ftsRank * 0.3 +
        similarity * 0.25 +
        jaccard * 0.15 +
        cosine * 0.15 +
        normalizedBM25 * 0.15;

      return {
        chunk,
        scores: {
          ftsRank: chunk.ftsRank,
          similarity,
          jaccard,
          cosine,
          bm25: normalizedBM25,
          final: finalScore,
        },
      };
    });
  }

  /**
   * Fuzzy search fallback using trigram similarity
   */
  private async fuzzySearchFallback(
    query: string,
    userId?: string,
    options: SearchOptions = {},
  ): Promise<ExactMatchResult> {
    try {
      this.logger.debug('🔄 Using fuzzy search fallback...');

      const queryBuilder = this.chunkRepo
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.document', 'document')
        .addSelect('similarity(chunk.content, :query)', 'similarity_score')
        .where('chunk.content % :query', { query })
        .andWhere('similarity(chunk.content, :query) >= :threshold', {
          query,
          threshold: 0.3,
        })
        .andWhere('document.processingStatus = :status', {
          status: 'completed',
        });

      if (userId) {
        queryBuilder.andWhere('document.userId = :userId', { userId });
      }

      queryBuilder
        .orderBy('similarity_score', 'DESC')
        .limit(options.limit || 5);

      const results = await queryBuilder.getRawAndEntities();

      if (results.entities.length === 0) {
        return { found: false, confidence: 0 };
      }

      const topMatch = results.entities[0];
      const similarityScore = parseFloat(
        results.raw[0]?.similarity_score || '0',
      );

      // Additional scoring
      const additionalScore = calculateSimilarity(query, topMatch.content);
      const finalScore = (similarityScore + additionalScore) / 2;

      this.logger.log(`✅ Fuzzy match found (score: ${finalScore.toFixed(3)})`);

      return {
        found: finalScore >= 0.5,
        content: topMatch.content,
        source: {
          documentId: topMatch.documentId,
          filename: topMatch.metadata?.documentFilename || 'Unknown',
          pageNumber: topMatch.pageNumber,
          chunkIndex: topMatch.chunkIndex,
        },
        confidence: finalScore,
      };
    } catch (error) {
      this.logger.error('Fuzzy search failed:', error);
      return { found: false, confidence: 0 };
    }
  }

  /**
   * Search with query expansion (synonyms)
   */
  async searchWithExpansion(
    query: string,
    userId?: string,
  ): Promise<ExactMatchResult> {
    // Simple synonym mapping for agriculture domain
    const synonyms: Record<string, string[]> = {
      lúa: ['lúa', 'thóc', 'gạo', 'cây lúa'],
      'cà chua': ['cà chua', 'cà', 'tomato'],
      tưới: ['tưới', 'tưới nước', 'tưới tiêu', 'tưới cây'],
      phân: ['phân', 'phân bón', 'phân hữu cơ', 'phân vô cơ'],
    };

    // Expand query with synonyms
    const expandedTerms = new Set([query]);
    Object.entries(synonyms).forEach(([key, values]) => {
      if (query.toLowerCase().includes(key)) {
        values.forEach((v) => expandedTerms.add(v));
      }
    });

    // Try each expanded term
    for (const term of expandedTerms) {
      const result = await this.findExactMatch(term, userId, {
        useFuzzyFallback: false,
      });

      if (result.found) {
        this.logger.debug(`✅ Match found with expanded term: "${term}"`);
        return result;
      }
    }

    // If no expansion worked, try original with fuzzy
    return this.findExactMatch(query, userId, { useFuzzyFallback: true });
  }

  /**
   * Get search statistics
   */
  async getSearchStats(userId?: string): Promise<{
    totalChunks: number;
    indexedChunks: number;
    avgTokenCount: number;
    documentsCount: number;
  }> {
    const queryBuilder = this.chunkRepo
      .createQueryBuilder('chunk')
      .leftJoin('chunk.document', 'document')
      .select('COUNT(chunk.id)', 'totalChunks')
      .addSelect(
        'COUNT(CASE WHEN chunk.searchVector IS NOT NULL THEN 1 END)',
        'indexedChunks',
      )
      .addSelect('AVG(chunk.tokenCount)', 'avgTokenCount')
      .addSelect('COUNT(DISTINCT chunk.documentId)', 'documentsCount')
      .where('document.processingStatus = :status', { status: 'completed' });

    if (userId) {
      queryBuilder.andWhere('document.userId = :userId', { userId });
    }

    const result = await queryBuilder.getRawOne();

    return {
      totalChunks: parseInt(result?.totalChunks || '0'),
      indexedChunks: parseInt(result?.indexedChunks || '0'),
      avgTokenCount: parseFloat(result?.avgTokenCount || '0'),
      documentsCount: parseInt(result?.documentsCount || '0'),
    };
  }

  /**
   * Refresh materialized view for stats
   */
  async refreshSearchStats(): Promise<void> {
    try {
      await this.documentRepo.query(
        'REFRESH MATERIALIZED VIEW document_search_stats',
      );
      this.logger.log('✅ Search stats refreshed');
    } catch (error) {
      this.logger.warn('Failed to refresh search stats:', error.message);
    }
  }
}
