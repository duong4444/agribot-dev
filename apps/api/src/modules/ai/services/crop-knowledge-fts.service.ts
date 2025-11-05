import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CropKnowledgeChunk } from '../entities/crop-knowledge-chunk.entity';
import { ExactMatchResult } from '../types';
import { normalizeText } from '../utils/text.utils';

/**
 * Crop Knowledge FTS Service (Layer 1 - Refactored)
 * 
 * Optimized Full-Text Search với weighted fields:
 * - loai_cay (A): Highest priority - Crop type
 * - tieu_de_chunk (B): High priority - Section title  
 * - chu_de_lon (C): Medium priority - Main topic
 * - noi_dung (D): Default priority - Content
 * 
 * Features:
 * - Structural chunking từ markdown
 * - Weighted search với PostgreSQL FTS
 * - Exact match với high confidence
 * - Vietnamese text support
 */

interface SearchResult {
  chunkId: string;
  loaiCay: string;
  chuDeLon: string;
  tieuDeChunk: string;
  noiDung: string;
  metadata?: any;
  rank: number;
  headline?: string;
}

@Injectable()
export class CropKnowledgeFTSService {
  private readonly logger = new Logger(CropKnowledgeFTSService.name);
  private readonly CONFIDENCE_THRESHOLD = 0.5; // Lowered from 0.85 for better recall with unaccent

  constructor(
    @InjectRepository(CropKnowledgeChunk)
    private readonly chunkRepo: Repository<CropKnowledgeChunk>,
  ) {}

  /**
   * Main Layer 1 search - Fast exact match với FTS
   */
  async searchCropKnowledge(
    query: string,
    userId?: string,
    options?: {
      limit?: number;
      minRank?: number;
      threshold?: number;
    },
  ): Promise<ExactMatchResult> {
    const startTime = Date.now();
    const normalized = normalizeText(query);

    this.logger.log(`🔍 Layer 1 FTS: "${query}"`);

    try {
      // Execute weighted FTS search
      const results = await this.executeFTSSearch(
        query,
        userId,
        options?.limit || 10,
        options?.minRank || 0.01,
      );

      if (results.length === 0) {
        this.logger.debug('❌ No FTS results found');
        return { found: false, confidence: 0 };
      }

      // Get top match
      const topMatch = results[0];
      
      // Calculate confidence
      const confidence = this.calculateConfidence(topMatch, query);

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `Top match: ${topMatch.loaiCay} - ${topMatch.tieuDeChunk} ` +
        `(rank: ${topMatch.rank.toFixed(4)}, confidence: ${confidence.toFixed(3)})`,
      );

      // Check threshold
      const threshold = options?.threshold || this.CONFIDENCE_THRESHOLD;
      
      if (confidence >= threshold) {
        this.logger.log(
          `✅ Layer 1 exact match found (confidence: ${confidence.toFixed(3)}) in ${processingTime}ms`,
        );

        return {
          found: true,
          content: this.formatAnswer(topMatch),
          source: {
            documentId: topMatch.chunkId,
            filename: topMatch.loaiCay + '.md',
            chunkIndex: 0,
          },
          confidence,
          metadata: {
            loai_cay: topMatch.loaiCay,
            chu_de_lon: topMatch.chuDeLon,
            tieu_de_chunk: topMatch.tieuDeChunk,
            rank: topMatch.rank,
            processingTime,
          },
        };
      }

      this.logger.debug(
        `❌ Confidence ${confidence.toFixed(3)} below threshold ${threshold}`,
      );

      return {
        found: false,
        confidence,
        metadata: {
          topMatch: {
            loai_cay: topMatch.loaiCay,
            tieu_de_chunk: topMatch.tieuDeChunk,
            rank: topMatch.rank,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error in crop knowledge FTS:', error);
      return { found: false, confidence: 0 };
    }
  }

  /**
   * Execute FTS search using PostgreSQL function
   */
  private async executeFTSSearch(
    query: string,
    userId?: string,
    limit: number = 10,
    minRank: number = 0.001, // Lower min rank for better recall
  ): Promise<SearchResult[]> {
    try {
      this.logger.debug(
        `Executing FTS: query="${query}", userId=${userId}, limit=${limit}, minRank=${minRank}`,
      );

      const results = await this.chunkRepo.query(
        `
        SELECT 
          chunk_id as "chunkId",
          loai_cay as "loaiCay",
          chu_de_lon as "chuDeLon",
          tieu_de_chunk as "tieuDeChunk",
          noi_dung as "noiDung",
          metadata,
          rank,
          headline
        FROM search_crop_knowledge_fts($1, $2, $3, $4)
        `,
        [query, userId || null, limit, minRank],
      );

      this.logger.debug(`FTS returned ${results.length} results`);
      return results;
    } catch (error) {
      this.logger.error(
        `FTS search failed for query "${query}": ${error.message}`,
      );
      this.logger.error(`Error stack: ${error.stack}`);
      
      // Check if function exists
      this.logger.warn(
        'Falling back to TypeORM search. Please verify PostgreSQL function exists.',
      );
      
      return this.fallbackSearch(query, userId, limit);
    }
  }

  /**
   * Fallback search using TypeORM
   */
  private async fallbackSearch(
    query: string,
    userId?: string,
    limit: number = 10,
  ): Promise<SearchResult[]> {
    this.logger.log(`🔄 Fallback search activated for: "${query}"`);
    
    const normalized = normalizeText(query);
    const keywords = normalized.split(' ').filter(w => w.length > 2);
    
    this.logger.debug(`Fallback keywords: [${keywords.join(', ')}]`);

    const queryBuilder = this.chunkRepo
      .createQueryBuilder('chunk')
      .select([
        'chunk.chunkId',
        'chunk.loaiCay',
        'chunk.chuDeLon',
        'chunk.tieuDeChunk',
        'chunk.noiDung',
        'chunk.metadata',
      ])
      .where('chunk.status = :status', { status: 'active' });

    // Add keyword conditions
    if (keywords.length > 0) {
      const conditions = keywords.map((_, index) => 
        `(LOWER(chunk.loaiCay) LIKE :keyword${index} OR ` +
        `LOWER(chunk.tieuDeChunk) LIKE :keyword${index} OR ` +
        `LOWER(chunk.chuDeLon) LIKE :keyword${index} OR ` +
        `LOWER(chunk.noiDung) LIKE :keyword${index})`
      ).join(' AND ');

      const parameters: Record<string, string> = {};
      keywords.forEach((keyword, index) => {
        parameters[`keyword${index}`] = `%${keyword.toLowerCase()}%`;
      });

      queryBuilder.andWhere(`(${conditions})`, parameters);
    }

    if (userId) {
      queryBuilder.andWhere('chunk.user_id::text = :userId', { userId });
    }

    queryBuilder.limit(limit);

    const chunks = await queryBuilder.getMany();

    // Calculate simple rank based on keyword matches
    return chunks.map(chunk => {
      let rank = 0;
      keywords.forEach(keyword => {
        const kw = keyword.toLowerCase();
        if (chunk.loaiCay.toLowerCase().includes(kw)) rank += 3;
        if (chunk.tieuDeChunk.toLowerCase().includes(kw)) rank += 2;
        if (chunk.chuDeLon.toLowerCase().includes(kw)) rank += 1.5;
        if (chunk.noiDung.toLowerCase().includes(kw)) rank += 1;
      });

      return {
        chunkId: chunk.chunkId,
        loaiCay: chunk.loaiCay,
        chuDeLon: chunk.chuDeLon,
        tieuDeChunk: chunk.tieuDeChunk,
        noiDung: chunk.noiDung,
        metadata: chunk.metadata,
        rank: rank / keywords.length, // Normalize
        headline: chunk.noiDung.substring(0, 100) + '...',
      };
    }).sort((a, b) => b.rank - a.rank);
  }

  /**
   * Calculate confidence score with improved phrase matching
   */
  private calculateConfidence(
    result: SearchResult,
    query: string,
  ): number {
    // Base confidence from rank (normalize to 0-1)
    let confidence = Math.min(result.rank * 0.5, 1.0);

    // Normalize both query and result for comparison (remove diacritics)
    const queryNormalized = normalizeText(query);
    const queryWords = queryNormalized.split(' ').filter(w => w.length > 2);

    // Extract key phrases (2-word combinations)
    const keyPhrases: string[] = [];
    for (let i = 0; i < queryWords.length - 1; i++) {
      keyPhrases.push(`${queryWords[i]} ${queryWords[i + 1]}`);
    }

    // Boost for crop type match
    if (result.loaiCay) {
      const cropNormalized = normalizeText(result.loaiCay);
      
      // Exact match
      if (queryNormalized.includes(cropNormalized) || cropNormalized.includes(queryNormalized)) {
        confidence *= 1.5;
      }
      // Partial match
      else if (queryWords.some(word => cropNormalized.includes(word))) {
        confidence *= 1.2;
      }
    }

    // Boost for title match - PRIORITIZE PHRASE MATCHES
    if (result.tieuDeChunk) {
      const titleNormalized = normalizeText(result.tieuDeChunk);
      
      // Check for exact phrase matches (e.g., "benh loet")
      let phraseMatchCount = 0;
      for (const phrase of keyPhrases) {
        if (titleNormalized.includes(phrase)) {
          phraseMatchCount++;
          confidence *= 2.0; // Strong boost for phrase match
        }
      }
      
      // If no phrase match, check individual words
      if (phraseMatchCount === 0) {
        const matchCount = queryWords.filter(word => 
          titleNormalized.includes(word)
        ).length;
        
        if (matchCount > 0) {
          confidence *= (1 + matchCount * 0.1); // Lower boost for individual words
        }
      }
    }

    // Boost for topic match
    if (result.chuDeLon) {
      const topicNormalized = normalizeText(result.chuDeLon);
      
      if (queryWords.some(word => topicNormalized.includes(word))) {
        confidence *= 1.1;
      }
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Format answer from search result
   */
  private formatAnswer(result: SearchResult): string {
    const parts: string[] = [];

    // Add header with crop and section info
    parts.push(`**${result.loaiCay} - ${result.tieuDeChunk}**\n`);
    
    if (result.chuDeLon && result.chuDeLon !== result.tieuDeChunk) {
      parts.push(`*Chủ đề: ${result.chuDeLon}*\n\n`);
    }

    // Add main content
    parts.push(result.noiDung);

    // Add metadata if available
    if (result.metadata?.nguon) {
      parts.push(`\n\n_Nguồn: ${result.metadata.nguon}_`);
    }

    return parts.join('');
  }

  /**
   * Search by exact crop name and topic
   */
  async searchByCropAndTopic(
    cropName: string,
    topicKeywords: string,
    userId?: string,
    limit: number = 10,
  ): Promise<SearchResult[]> {
    try {
      const results = await this.chunkRepo.query(
        `
        SELECT 
          chunk_id as "chunkId",
          loai_cay as "loaiCay",
          chu_de_lon as "chuDeLon",
          tieu_de_chunk as "tieuDeChunk",
          noi_dung as "noiDung",
          rank
        FROM search_crop_by_name_and_topic($1, $2, $3, $4)
        `,
        [cropName, topicKeywords, userId || null, limit],
      );

      return results;
    } catch (error) {
      this.logger.error('Search by crop and topic failed:', error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getCropKnowledgeStats(): Promise<{
    crops: Array<{
      cropName: string;
      topicCount: number;
      chunkCount: number;
      avgContentLength: number;
      lastUpdated: Date;
    }>;
    totalChunks: number;
  }> {
    try {
      const stats = await this.chunkRepo.query(`
        SELECT 
          crop_name as "cropName",
          topic_count as "topicCount",
          chunk_count as "chunkCount",
          avg_content_length as "avgContentLength",
          last_updated as "lastUpdated"
        FROM crop_knowledge_statistics
      `);

      const totalChunks = stats.reduce(
        (sum: number, crop: any) => sum + parseInt(crop.chunkCount),
        0,
      );

      return { crops: stats, totalChunks };
    } catch (error) {
      this.logger.error('Failed to get stats:', error);
      return { crops: [], totalChunks: 0 };
    }
  }

  /**
   * Get all chunks (for debugging)
   */
  async getAllChunks(
    limit: number = 20,
    cropName?: string,
  ): Promise<any[]> {
    try {
      const queryBuilder = this.chunkRepo
        .createQueryBuilder('chunk')
        .select([
          'chunk.id',
          'chunk.chunkId',
          'chunk.loaiCay',
          'chunk.chuDeLon',
          'chunk.tieuDeChunk',
          'chunk.noiDung',
          'chunk.thuTu',
          'chunk.status',
          'chunk.metadata',
          'chunk.createdAt',
        ])
        .orderBy('chunk.loaiCay', 'ASC')
        .addOrderBy('chunk.thuTu', 'ASC')
        .limit(limit);

      if (cropName) {
        queryBuilder.where('LOWER(chunk.loaiCay) LIKE :cropName', {
          cropName: `%${cropName.toLowerCase()}%`,
        });
      }

      const chunks = await queryBuilder.getMany();

      return chunks.map(chunk => ({
        id: chunk.id,
        chunk_id: chunk.chunkId,
        loai_cay: chunk.loaiCay,
        chu_de_lon: chunk.chuDeLon,
        tieu_de_chunk: chunk.tieuDeChunk,
        noi_dung_preview: chunk.noiDung.substring(0, 150) + '...',
        noi_dung_full: chunk.noiDung,
        thu_tu: chunk.thuTu,
        status: chunk.status,
        metadata: chunk.metadata,
        created_at: chunk.createdAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get all chunks:', error);
      return [];
    }
  }

  /**
   * Verify FTS setup (check if functions and indexes exist)
   */
  async verifyFTSSetup(): Promise<{
    functionsExist: boolean;
    indexExists: boolean;
    chunksWithVector: number;
    chunksMissingVector: number;
    details: any;
  }> {
    try {
      // Check if function exists
      const functionCheck = await this.chunkRepo.query(`
        SELECT COUNT(*) as count
        FROM information_schema.routines
        WHERE routine_name = 'search_crop_knowledge_fts'
      `);

      const functionsExist = parseInt(functionCheck[0].count) > 0;

      // Check if GIN index exists
      const indexCheck = await this.chunkRepo.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = 'crop_knowledge_chunks'
          AND indexname = 'idx_crop_knowledge_search_vector'
      `);

      const indexExists = parseInt(indexCheck[0].count) > 0;

      // Check search_vector status
      const vectorCheck = await this.chunkRepo.query(`
        SELECT 
          COUNT(*) as total_chunks,
          COUNT(search_vector) as chunks_with_vector,
          COUNT(*) - COUNT(search_vector) as chunks_missing_vector
        FROM crop_knowledge_chunks
      `);

      return {
        functionsExist,
        indexExists,
        chunksWithVector: parseInt(vectorCheck[0].chunks_with_vector),
        chunksMissingVector: parseInt(vectorCheck[0].chunks_missing_vector),
        details: {
          functionCheck: functionCheck[0],
          indexCheck: indexCheck[0],
          vectorCheck: vectorCheck[0],
        },
      };
    } catch (error) {
      this.logger.error('Failed to verify FTS setup:', error);
      throw error;
    }
  }

  /**
   * Rebuild search vectors for all chunks
   */
  async rebuildSearchVectors(): Promise<{
    updated: number;
    failed: number;
  }> {
    try {
      this.logger.log('🔄 Rebuilding search vectors for all chunks...');

      // Update all chunks to trigger the search_vector update
      const result = await this.chunkRepo.query(`
        UPDATE crop_knowledge_chunks
        SET updated_at = now()
        WHERE status = 'active'
      `);

      this.logger.log(`✅ Rebuilt search vectors for ${result[1]} chunks`);

      return {
        updated: result[1] || 0,
        failed: 0,
      };
    } catch (error) {
      this.logger.error('Failed to rebuild search vectors:', error);
      throw error;
    }
  }

  /**
   * Debug search
   */
  async debugSearch(query: string, limit: number = 5): Promise<string> {
    const results = await this.executeFTSSearch(query, undefined, limit, 0);

    let output = `🔍 Debug Search: "${query}"\n`;
    output += `📊 Found ${results.length} results\n\n`;

    results.forEach((result, index) => {
      output += `[${index + 1}] Rank: ${result.rank.toFixed(4)}\n`;
      output += `    🌾 Loại cây: ${result.loaiCay}\n`;
      output += `    📚 Chủ đề: ${result.chuDeLon}\n`;
      output += `    📝 Tiêu đề: ${result.tieuDeChunk}\n`;
      output += `    💬 Nội dung: ${result.noiDung.substring(0, 100)}...\n\n`;
    });

    return output;
  }
}
