import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { ExactMatchResult } from '../types';
import { DEFAULT_AI_CONFIG } from '../constants';
import { calculateSimilarity, normalizeText } from '../utils';

@Injectable()
export class ExactMatchService {
  private readonly logger = new Logger(ExactMatchService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
  ) {}

  /**
   * Layer 1: Try to find exact match in documents
   * Uses Full-Text Search + similarity check
   */
  async findExactMatch(query: string, userId?: string): Promise<ExactMatchResult> {
    const startTime = Date.now();
    const normalizedQuery = normalizeText(query);

    try {
      // 1. Full-text search on chunks
      const chunks = await this.fullTextSearch(normalizedQuery, userId);

      if (chunks.length === 0) {
        return {
          found: false,
          confidence: 0,
        };
      }

      // 2. Calculate similarity scores
      const scoredChunks = chunks.map(chunk => ({
        chunk,
        similarity: calculateSimilarity(normalizedQuery, chunk.content),
      }));

      // 3. Sort by similarity
      scoredChunks.sort((a, b) => b.similarity - a.similarity);

      const topMatch = scoredChunks[0];

      // 4. Check if confidence exceeds threshold
      if (topMatch.similarity >= DEFAULT_AI_CONFIG.exactMatchThreshold) {
        const processingTime = Date.now() - startTime;
        this.logger.log(
          `Exact match found (similarity: ${topMatch.similarity.toFixed(2)}) in ${processingTime}ms`
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
          confidence: topMatch.similarity,
        };
      }

      // Not confident enough
      return {
        found: false,
        confidence: topMatch.similarity,
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
   * Full-text search using Postgres tsvector
   */
  private async fullTextSearch(
    query: string,
    userId?: string,
    limit: number = 10
  ): Promise<DocumentChunk[]> {
    try {
      const queryBuilder = this.chunkRepo
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.document', 'document');

      // Add user filter if provided
      if (userId) {
        queryBuilder.where('document.userId = :userId', { userId });
      }

      // Full-text search
      queryBuilder
        .andWhere("chunk.searchVector @@ plainto_tsquery('vietnamese', :query)", {
          query,
        })
        .orderBy("ts_rank(chunk.searchVector, plainto_tsquery('vietnamese', :query))", 'DESC')
        .limit(limit);

      return await queryBuilder.getMany();
    } catch (error) {
      // Fallback to LIKE search if FTS fails
      this.logger.warn('FTS failed, using LIKE fallback:', error.message);
      return this.likeSearch(query, userId, limit);
    }
  }

  /**
   * Fallback LIKE search
   */
  private async likeSearch(
    query: string,
    userId?: string,
    limit: number = 10
  ): Promise<DocumentChunk[]> {
    const queryBuilder = this.chunkRepo
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.document', 'document')
      .where('chunk.content ILIKE :query', { query: `%${query}%` });

    if (userId) {
      queryBuilder.andWhere('document.userId = :userId', { userId });
    }

    return queryBuilder.limit(limit).getMany();
  }

  /**
   * Search by document metadata
   */
  async searchByMetadata(filters: {
    category?: string;
    tags?: string[];
    filename?: string;
    userId?: string;
  }): Promise<Document[]> {
    const queryBuilder = this.documentRepo.createQueryBuilder('doc');

    if (filters.category) {
      queryBuilder.andWhere('doc.category = :category', {
        category: filters.category,
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('doc.tags && :tags', { tags: filters.tags });
    }

    if (filters.filename) {
      queryBuilder.andWhere('doc.filename ILIKE :filename', {
        filename: `%${filters.filename}%`,
      });
    }

    if (filters.userId) {
      queryBuilder.andWhere('doc.userId = :userId', { userId: filters.userId });
    }

    queryBuilder.andWhere('doc.processingStatus = :status', {
      status: 'completed',
    });

    return queryBuilder.getMany();
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(userId?: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
    indexed: number;
    categories: Record<string, number>;
  }> {
    const queryBuilder = this.documentRepo.createQueryBuilder('doc');

    if (userId) {
      queryBuilder.where('doc.userId = :userId', { userId });
    }

    const documents = await queryBuilder.getMany();
    const totalChunks = await this.chunkRepo.count({
      where: userId ? { document: { userId } } : {},
    });

    const categories: Record<string, number> = {};
    documents.forEach(doc => {
      if (doc.category) {
        categories[doc.category] = (categories[doc.category] || 0) + 1;
      }
    });

    return {
      totalDocuments: documents.length,
      totalChunks,
      indexed: documents.filter(d => d.indexed).length,
      categories,
    };
  }
}



