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
      cropFilter?: string; // Filter by specific crop type
    },
  ): Promise<ExactMatchResult> {
    const startTime = Date.now();
    this.logger.log(`Searching for: "${query}"`);

    // ✅ Check if query is asking for elaboration/more details
    if (this.isElaborationQuery(query)) {
      this.logger.log('⚠️ Elaboration query detected - skipping FTS, let LLM handle');
      return { 
        found: false, 
        confidence: 0, 
        metadata: { reason: 'elaboration_query' } 
      };
    }

    // Layer 1: Heading-based Search (High-precision)
    console.log("-------------------SEARCH BẰNG HEADING-----------------------");
    
    const headingMatchResults = await this.searchByHeadings(query, options?.cropFilter);
    console.log("------------kqua trả về của searchByHeadings-------------------: ",headingMatchResults);
    
    if (headingMatchResults) {
      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Layer 1 heading match found in ${processingTime}ms`,
      );

      const topMatch = headingMatchResults[0];

      return {
        found: true,
        content: this.formatMultipleAnswers(headingMatchResults),
        source: {
          documentId: topMatch.chunkId,
          filename: topMatch.loaiCay + '.md',
          chunkIndex: 0, // Not applicable for multi-chunk
        },
        confidence: 1.0, // Heading match is always high confidence
        metadata: {
          loai_cay: topMatch.loaiCay,
          chu_de_lon: topMatch.chuDeLon,
          tieu_de_chunk: topMatch.tieuDeChunk,
          match_type: 'heading_match',
          matched_chunks: headingMatchResults.length,
          processingTime,
        },
      };
    }

    this.logger.debug('==================No heading match, falling back to Layer 2 FTS===================');
    // Layer 2: Full-Text Search (Fallback for general queries)
    try {
      // BẢN CHẤT LÀ GỌI HÀM search_crop_knowledge_fts _ psql function
      const results = await this.executeFTSSearch(
        query,
        userId,
        options?.limit || 10,
        options?.minRank || 0.01,
        options?.cropFilter,
      );

      if (results.length === 0) {
        this.logger.debug('No FTS results found');
        return { found: false, confidence: 0 };
      }

      // Re-rank results based on disease/pest keyword matches in title
      const diseaseKeywords = this.extractDiseaseKeywords(query);
      const { results: rerankedResults, hasMatch } = this.rerankByTitleMatch(results, diseaseKeywords);
      if (diseaseKeywords.length > 0) {
        this.logger.debug(`🔄 Re-ranking with disease keywords: [${diseaseKeywords.join(', ')}]`);
      }

      // If user asked about specific disease but no title matched → fallback to LLM
      if (diseaseKeywords.length > 0 && !hasMatch) {
        this.logger.debug(`⚠️ Disease "${diseaseKeywords.join(', ')}" not found in KB - falling back to LLM`);
        return { 
          found: false, 
          confidence: 0, 
          metadata: { reason: 'disease_not_in_kb', diseaseKeywords }
        };
      }

      const topMatch = rerankedResults[0];
      const confidence = this.calculateConfidence(topMatch, query);
      console.log("confidence của FTS: ",confidence);
      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `FTS top match: ${topMatch.loaiCay} - ${topMatch.tieuDeChunk} ` +
        `(rank: ${topMatch.rank.toFixed(4)}, confidence: ${confidence.toFixed(3)})`,
      );

      const threshold = options?.threshold || this.CONFIDENCE_THRESHOLD;
      console.log("threshold của FTS: ",threshold);
      
      
      if (confidence >= threshold) {
        this.logger.log(
          `---------------------Layer 2 FTS match found (confidence: ${confidence.toFixed(3)}) in ${processingTime}ms-----------------`,
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
            match_type: 'fts_match',
            processingTime,
          },
        };
      }

      this.logger.debug(
        `=====❌ FTS confidence ${confidence.toFixed(3)} below threshold ${threshold}======`,
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
    cropFilter?: string, // Optional crop type filter
  ): Promise<SearchResult[]> {
    console.log("...........................FULL-TEXT SEARCH TỚI CHƠI..................................");
    
    try {
      this.logger.debug(
        `______________Executing FTS: query="${query}", userId=${userId}, limit=${limit}, minRank=${minRank}, cropFilter=${cropFilter || 'none'}`,
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
        FROM search_crop_knowledge_fts($1, $2, $3, $4, $5)
        `,
        [query, userId || null, limit, minRank, cropFilter || null],
      );
      console.log("==========================================================");
      console.log("==========results trong FTS!heading: ",results);
      console.log("==========================================================");
      
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
    console.log("-----------FALLBACK VÌ FTS KO CÓ KẾT QUẢ-----------");
    
    this.logger.log(`Fallback search activated for: "${query}"`);
    
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

    // ✅ NEW: Apply heuristic relevance penalty
    const relevanceScore = this.calculateRelevanceScore(query, result);
    
    if (relevanceScore === 0) {
      // Complete mismatch (e.g., time period conflict) → Return 0 immediately
      this.logger.debug(
        `❌ Relevance score is 0 (complete mismatch) - returning confidence 0`
      );
      return 0;
    } else if (relevanceScore < 0.4) {
      // Low relevance → Heavy penalty
      confidence *= 0.5;
      this.logger.debug(
        `⚠️ Low relevance score (${relevanceScore.toFixed(2)}) - penalizing confidence by 50%`
      );
    } else if (relevanceScore < 0.6) {
      // Medium relevance → Moderate penalty
      confidence *= 0.8;
      this.logger.debug(
        `⚠️ Medium relevance score (${relevanceScore.toFixed(2)}) - penalizing confidence by 20%`
      );
    } else {
      // High relevance → No penalty
      this.logger.debug(
        `✅ High relevance score (${relevanceScore.toFixed(2)}) - no penalty`
      );
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
   * Format a list of answers for a main topic match
   */
  private formatMultipleAnswers(results: SearchResult[]): string {
    if (!results || results.length === 0) {
      return '';
    }

    console.log("result: ",results);
    
    console.log("result.length: ",results.length);
    

    // If only one result, use the single format
    if (results.length === 1) {
      return this.formatAnswer(results[0]);
    }

    const parts: string[] = [];
    const firstResult = results[0];

    // Main header for the entire topic
    parts.push(`**${firstResult.loaiCay} - ${firstResult.chuDeLon}**\n\n`);
    console.log("parts: ",parts);
    

    // Append each sub-chunk
    results.forEach(result => {
      // Sub-header for the chunk
      parts.push(`**${result.tieuDeChunk}**\n`);
      // Content
      parts.push(result.noiDung + '\n\n');
    });

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

  /**
   * Search by headings (Layer 1)
   * @returns SearchResult[] if a match is found, otherwise null
   */
  private async searchByHeadings(
    query: string,
    cropFilter?: string,
  ): Promise<SearchResult[] | null> {
    const normalizedQuery = normalizeText(query);
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
    // [cho, tôi, thông, tin, cây, phê]
    this.logger.log(`🔍 Heading search - Query: "${query}" → Normalized: "${normalizedQuery}"`);
    this.logger.log(`📝 Query words (>2 chars): [${queryWords.join(', ')}]`);

    // 1. Check for a match with a main topic (chu_de_lon)
    // Strategy: Find all unique topics and score them
    const queryBuilder = this.chunkRepo
      .createQueryBuilder('chunk')
      .where('chunk.status = :status', { status: 'active' });
    // SELECT * FROM crop_knowledge_chunks WHERE status = 'active'
    // console.log("queryBuilder_searchByHeading_chuaCropFilter: ",queryBuilder);
    //WHERE status = 'active' AND LOWER(loai_cay) LIKE LOWER('%cà phê%')
    if (cropFilter) {
      // Use LOWER for case-insensitive match instead of normalize_vietnamese_text
      queryBuilder.andWhere('LOWER(chunk.loai_cay) LIKE LOWER(:cropFilter)', {
        cropFilter: `%${cropFilter}%`
      });
    }
    
    const allChunks = await queryBuilder.getMany();
    console.log("ALLCHUNKS LÀ CÁC ROW TRONG crop_knowledge_chunks mà có loai_cay = |crop_name - NER|");
    
    // tức là các row trong crop_knowledge_chunks mà có loai_cay = "crop_name - NER" 
    // lấy tất cả chunk của cây cà phê

    this.logger.log(`📚 Found ${allChunks.length} total chunks to analyze`);

    // Get unique topics with their match scores
    const topicScores = new Map<string, { loaiCay: string; chuDeLon: string; score: number; matchedWords: string[] }>();

    for (const chunk of allChunks) {
      // TOPIC CỤ THỂ ỨNG VS CÂY CỤ THỂ
      const topicKey = `${chunk.loaiCay}::${chunk.chuDeLon}`;
      // ex: Cà Phê::1. Thông tin chung về Cây Cà Phê
      console.log("topicKey: ",topicKey);
      
      // Skip if already processed this topic
      if (topicScores.has(topicKey)) continue;

      const normalizedTopic = normalizeText(chunk.chuDeLon);
      // Extract significant words (ignore numbers and short words)
      const topicWords = normalizedTopic
        .split(' ')
        .filter(w => w.length > 2 && !/^\d+$/.test(w)); // Ignore pure numbers like "4"
      
      this.logger.log(`🔎 Analyzing topic: "${chunk.chuDeLon}" → normalized: "${normalizedTopic}" → words: [${topicWords.join(', ')}]`);

      // Calculate match score
      const matchedWords: string[] = [];
      let matchCount = 0;
      // [phòng, trừ, sâu, bệnh, hại, chính]
      // [cho, tôi, thông, tin, cây, phê]
      for (const topicWord of topicWords) {
        const isMatched = queryWords.some(qw => qw.includes(topicWord) || topicWord.includes(qw));
        if (isMatched) {
          matchCount++;
          matchedWords.push(topicWord);
        }
      }

      // Score = percentage of topic words matched
      // SỐ TỪ (topicWords MATCH VS queryWord) / tổng số topicWord
      const score = topicWords.length > 0 ? matchCount / topicWords.length : 0;

      // BOOST: If query contains disease keywords, boost disease-related topics
      let adjustedScore = score;
      const asciiQuery = this.removeAccents(normalizedQuery);
      const isQueryAboutDisease = asciiQuery.includes('benh') || 
                                   asciiQuery.includes('phong') || 
                                   asciiQuery.includes('tri');
      
      if (isQueryAboutDisease) {
        const topicAscii = this.removeAccents(normalizedTopic);
        const isDiseaseRelatedTopic = topicAscii.includes('benh') || 
                                      topicAscii.includes('phong tru') || 
                                      topicAscii.includes('sau hai') ||
                                      topicAscii.includes('sau benh');
        if (isDiseaseRelatedTopic) {
          adjustedScore += 0.4; // Significant boost for disease-related topics
          this.logger.debug(`🏥 Boosting disease topic "${chunk.chuDeLon}" by +0.4`);
        }
      }

      if (adjustedScore > 0) {
        topicScores.set(topicKey, {
          loaiCay: chunk.loaiCay,
          chuDeLon: chunk.chuDeLon,
          score: adjustedScore,
          matchedWords,
        });
        
        this.logger.log(
          `📊 Topic: "${chunk.chuDeLon}" | Score: ${(adjustedScore * 100).toFixed(0)}% | ` +
          `Matched: [${matchedWords.join(', ')}] / [${topicWords.join(', ')}]`
        );
      }
    }

    // Find best matching topic (score >= 0.7 means at least 70% of topic words matched)
    const HEADING_MATCH_THRESHOLD = 0.7; // 70% match threshold
    let bestMatch: { loaiCay: string; chuDeLon: string; score: number } | null = null;
    
    for (const [_, topicData] of topicScores) {
      if (topicData.score >= HEADING_MATCH_THRESHOLD) {
        if (!bestMatch || topicData.score > bestMatch.score || 
            (topicData.score === bestMatch.score && topicData.chuDeLon.length < bestMatch.chuDeLon.length)) {
          // Prefer higher score, or shorter topic names if score is equal (more specific)
          bestMatch = topicData;
        }
      }
    }

    if (bestMatch) {
      this.logger.log(`✅ Found main topic match: "${bestMatch.chuDeLon}" (${(bestMatch.score * 100).toFixed(0)}% match)`);
      
      // Return all chunks for that main topic, ordered correctly
      const chunks = await this.chunkRepo
        .createQueryBuilder('chunk')
        .where('chunk.loai_cay = :loaiCay', { loaiCay: bestMatch.loaiCay })
        .andWhere('chunk.chu_de_lon = :chuDeLon', { chuDeLon: bestMatch.chuDeLon })
        .orderBy('chunk.thuTu', 'ASC')
        .getMany();
      // SELECT * FROM crop_knowledge_chunks AS chunk
      // WHERE chunk.loai_cay = 'Cà Phê'
      // AND chunk.chu_de_lon = '5. Phòng trừ Sâu bệnh hại chính'
      // ORDER BY chunk.thu_tu ASC
      
      this.logger.log(`📦 Returning ${chunks.length} chunks for topic "${bestMatch.chuDeLon}"`);
      
      return chunks.map(c => ({
        chunkId: c.chunkId,
        loaiCay: c.loaiCay,
        chuDeLon: c.chuDeLon,
        tieuDeChunk: c.tieuDeChunk,
        noiDung: c.noiDung,
        metadata: c.metadata,
        rank: 1.0,
      }));
    }
    
    this.logger.log(`❌❌❌❌❌❌ No main topic match found (no topic with score >= ${(HEADING_MATCH_THRESHOLD * 100).toFixed(0)}%)`);

    // 2. If no main topic match, check for a sub-topic match (tieu_de_chunk)
    const subTopicQueryBuilder = this.chunkRepo
      .createQueryBuilder('chunk')
      .where('LOWER(chunk.tieu_de_chunk) = LOWER(:normalizedQuery)', { normalizedQuery });
    
    // SELECT * FROM crop_knowledge_chunks AS chunk
    // WHERE LOWER(chunk.tieu_de_chunk) = LOWER('nguon goc va phan loai ca phe')
    // AND LOWER(chunk.loai_cay) LIKE LOWER('%cà phê%')
    if (cropFilter) {
      subTopicQueryBuilder.andWhere('LOWER(chunk.loai_cay) LIKE LOWER(:cropFilter)', {
        cropFilter: `%${cropFilter}%`
      });
    }
    
    const subTopicMatch = await subTopicQueryBuilder.getOne();
    console.log("subTopicMatch: ",subTopicMatch);
    

    if (subTopicMatch) {
      this.logger.debug(`Found sub-topic match: "${subTopicMatch.tieuDeChunk}"`);
      // Return just this single chunk
      return [{
        chunkId: subTopicMatch.chunkId,
        loaiCay: subTopicMatch.loaiCay,
        chuDeLon: subTopicMatch.chuDeLon,
        tieuDeChunk: subTopicMatch.tieuDeChunk,
        noiDung: subTopicMatch.noiDung,
        metadata: subTopicMatch.metadata,
        rank: 1.0, // Assign a default high rank for heading match
      }];
    }

    // 3. No heading match found
    return null;
  }

  /**
   * Known disease/pest names for accurate matching
   */
  private readonly KNOWN_DISEASES = [
    // Bệnh phổ biến (multi-word first for priority matching)
    'thoi re', 'thoi goc', 'gi sat', 'nam hong', 'phan trang', 
    'than thu', 'chay la', 'dom la', 'vang la', 'heo xanh',
    // Single word diseases
    'loet', 'greening', 'tristeza', 'mosaic', 'phytophthora',
  ];

  private readonly KNOWN_PESTS = [
    // Sâu hại
    've bua', 'duc than', 'duc qua', 'cuon la', 'xanh da',
    // Nhện
    'do', 'vang',
    // Rầy
    'chong canh', 'mem', 'nau',
  ];

  private readonly STOPWORDS = [
    'cay', 'o', 'cho', 'tren', 'cua', 've', 'voi', 'la', 'va', 'co',
    'duoc', 'den', 'tu', 'nhu', 'khi', 'trong', 'ngoai', 'sau', 'truoc'
  ];

  /**
   * Extract disease/pest keywords from query for re-ranking
   * Uses known diseases dictionary for accurate matching
   */
  private extractDiseaseKeywords(query: string): string[] {
    const normalizedQuery = normalizeText(query);
    const asciiQuery = this.removeAccents(normalizedQuery);
    const keywords: string[] = [];
    
    this.logger.debug(`🔍 extractDiseaseKeywords: query="${query}" → ascii="${asciiQuery}"`);
    
    // 1. Check for known diseases first (priority matching)
    for (const disease of this.KNOWN_DISEASES) {
      if (asciiQuery.includes(`benh ${disease}`) || asciiQuery.includes(disease)) {
        keywords.push(disease);
        this.logger.debug(`🎯 Matched known disease: "${disease}"`);
        break; // Only one disease per query
      }
    }
    
    // 2. Fallback: extract single word after "bệnh" if no known disease found
    if (keywords.length === 0) {
      const benhMatch = asciiQuery.match(/benh\s+(\w+)/i);
      if (benhMatch) {
        const extracted = benhMatch[1];
        // Filter out stopwords
        if (!this.STOPWORDS.includes(extracted)) {
          keywords.push(extracted);
          this.logger.debug(`🎯 Extracted disease (fallback): "${extracted}"`);
        } else {
          this.logger.debug(`⚠️ Skipped stopword: "${extracted}"`);
        }
      }
    }
    
    // 3. Check for pests: "sâu X", "nhện X", "rầy X"
    const pestPatterns = [
      { pattern: /sau\s+(\w+(?:\s+\w+)?)/i, prefix: 'sau' },
      { pattern: /nhen\s+(\w+)/i, prefix: 'nhen' },
      { pattern: /ray\s+(\w+(?:\s+\w+)?)/i, prefix: 'ray' },
    ];
    
    for (const { pattern, prefix } of pestPatterns) {
      const match = asciiQuery.match(pattern);
      if (match) {
        const pestName = match[1];
        // Check if it's a known pest or filter stopwords
        const fullPest = `${prefix} ${pestName}`;
        if (this.KNOWN_PESTS.some(p => pestName.includes(p) || fullPest.includes(p))) {
          keywords.push(fullPest);
          this.logger.debug(`🎯 Matched known pest: "${fullPest}"`);
        } else if (!this.STOPWORDS.includes(pestName.split(' ')[0])) {
          keywords.push(fullPest);
          this.logger.debug(`🎯 Extracted pest: "${fullPest}"`);
        }
      }
    }
    
    return keywords;
  }

  /**
   * Simple accent removal helper (inline)
   */
  private removeAccents(text: string): string {
    const AccentsMap: Record<string, string> = {
      'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
      'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
      'ì|í|ị|ỉ|ĩ': 'i',
      'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
      'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
      'ỳ|ý|ỵ|ỷ|ỹ': 'y',
      'đ': 'd',
    };

    let result = text;
    Object.keys(AccentsMap).forEach(key => {
      const regex = new RegExp(key, 'g');
      result = result.replace(regex, AccentsMap[key]);
    });

    return result;
  }

  /**
   * Re-rank FTS results by boosting chunks with disease/pest keywords in title
   * Returns { results, hasMatch } to indicate if any title matched
   */
  private rerankByTitleMatch(
    results: SearchResult[],
    diseaseKeywords: string[],
  ): { results: SearchResult[], hasMatch: boolean } {
    if (diseaseKeywords.length === 0) {
      return { results, hasMatch: true }; // No disease query, proceed normally
    }
    
    let anyTitleMatched = false;
    
    const reranked = results.map(result => {
      // Convert title to ASCII for comparison
      const titleAscii = this.removeAccents(normalizeText(result.tieuDeChunk));
      // Also check chuDeLon (main topic)
      const topicAscii = this.removeAccents(normalizeText(result.chuDeLon));
      let rankBoost = 0;
      
      for (const keyword of diseaseKeywords) {
        // Use word boundary regex to avoid false positives (e.g., "lo" matching "loại")
        const keywordRegex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
        
        if (keywordRegex.test(titleAscii)) {
          rankBoost = Math.max(rankBoost, 2.0); // Full match in title
          anyTitleMatched = true;
          this.logger.debug(`📈 Boosting "${result.tieuDeChunk}" +2.0 (matched: "${keyword}" in "${titleAscii}")`);
        } else if (topicAscii.includes('benh') || topicAscii.includes('phong tru') || topicAscii.includes('sau hai')) {
          // Boost disease/pest topic even if not exact match
          const keywordWords = keyword.split(' ');
          const partialMatch = keywordWords.some(w => {
            if (w.length <= 2) return false;
            const wordRegex = new RegExp(`\\b${w}\\b`, 'i');
            return wordRegex.test(titleAscii) || wordRegex.test(topicAscii);
          });
          if (partialMatch) {
            rankBoost = Math.max(rankBoost, 1.5); // Topic + partial match
            anyTitleMatched = true;
            this.logger.debug(`📈 Boosting "${result.tieuDeChunk}" +1.5 (disease topic + partial match)`);
          }
        } else {
          // Check partial match (any word from keyword)
          const keywordWords = keyword.split(' ');
          const partialMatch = keywordWords.some(w => {
            if (w.length <= 2) return false;
            const wordRegex = new RegExp(`\\b${w}\\b`, 'i');
            return wordRegex.test(titleAscii);
          });
          if (partialMatch) {
            rankBoost = Math.max(rankBoost, 1.0); // Partial match
          }
        }
      }
      
      return {
        ...result,
        rank: result.rank + rankBoost,
      };
    }).sort((a, b) => b.rank - a.rank);
    
    if (!anyTitleMatched) {
      this.logger.debug(`⚠️ Disease keywords [${diseaseKeywords.join(', ')}] not found in any title - will fallback to LLM`);
    }
    
    return { results: reranked, hasMatch: anyTitleMatched };
  }

  /**
   * Calculate relevance score using heuristic approach (no LLM)
   * Returns score 0.0-1.0 based on keyword overlap and query type matching
   */
  private calculateRelevanceScore(query: string, result: SearchResult): number {
    let score = 0;
    
    // 1. Extract keywords from query and result
    const queryKeywords = this.extractKeywords(query);
    const titleKeywords = this.extractKeywords(result.tieuDeChunk);
    const contentKeywords = this.extractKeywords(result.noiDung);
    
    // 2. Calculate title overlap (high weight: 0.5)
    const titleOverlap = this.calculateOverlap(queryKeywords, titleKeywords);
    score += titleOverlap * 0.5;
    
    // 3. Calculate content overlap (medium weight: 0.3)
    const contentOverlap = this.calculateOverlap(queryKeywords, contentKeywords);
    score += contentOverlap * 0.3;
    
    // 4. Check query type matching (weight: 0.2)
    const queryType = this.detectQueryType(query);
    const contentMatchesType = this.contentMatchesQueryType(result.noiDung, queryType);
    score += contentMatchesType ? 0.2 : 0;
    
    return Math.min(score, 1.0);
  }

  /**
   * Extract meaningful keywords from text (remove stopwords)
   */
  private extractKeywords(text: string): string[] {
    const normalized = normalizeText(text);
    const words = normalized.split(/\s+/);
    
    // Vietnamese stopwords
    const stopwords = new Set([
      'cua', 'la', 'va', 'thi', 'cho', 'den', 'tu', 'trong', 'nhu', 'voi',
      'co', 'ma', 'hay', 'khi', 'se', 'da', 'duoc', 'cac', 'mot', 'nhung',
      'nay', 'do', 'o', 'ra', 'sau', 'truoc', 'giua', 'tren', 'duoi',
    ]);
    
    return words
      .filter(w => w.length > 2 && !stopwords.has(w))
      .filter((w, i, arr) => arr.indexOf(w) === i); // unique
  }

  /**
   * Calculate overlap ratio between two keyword sets
   */
  private calculateOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0) return 0;
    
    const set2 = new Set(keywords2);
    const matchCount = keywords1.filter(k => set2.has(k)).length;
    
    return matchCount / keywords1.length;
  }

  /**
   * Detect query type based on question words
   */
  private detectQueryType(query: string): string {
    const normalized = normalizeText(query);
    
    // Time/duration questions
    if (/thoi gian|bao lau|khi nao|ngay|thang|nam/.test(normalized)) {
      return 'time';
    }
    
    // Quantity questions
    if (/bao nhieu|so luong|mat do|lieu luong/.test(normalized)) {
      return 'quantity';
    }
    
    // Method/how-to questions
    if (/cach|lam the nao|ky thuat|phuong phap/.test(normalized)) {
      return 'method';
    }
    
    // Location questions
    if (/o dau|noi nao|khu vuc/.test(normalized)) {
      return 'location';
    }
    
    // Reason questions
    if (/tai sao|vi sao|ly do|nguyen nhan/.test(normalized)) {
      return 'reason';
    }
    
    return 'general';
  }

  /**
   * Check if content can answer the query type
   */
  private contentMatchesQueryType(content: string, queryType: string): boolean {
    const normalized = normalizeText(content);
    
    switch (queryType) {
      case 'time':
        // Content should mention time-related terms
        return /ngay|thang|nam|tuan|thoi gian|giai doan/.test(normalized);
      
      case 'quantity':
        // Content should have numbers or quantity terms
        return /\d+|kg|lit|tan|met|cm|phan tram/.test(normalized);
      
      case 'method':
        // Content should describe steps or methods
        return /buoc|cach|ky thuat|phuong phap|thuc hien/.test(normalized);
      
      case 'location':
        // Content should mention locations
        return /vung|khu vuc|noi|dia diem|tinh|huyen/.test(normalized);
      
      case 'reason':
        // Content should explain reasons
        return /vi|do|nguyen nhan|gay ra|dan den|lam cho/.test(normalized);
      
      default:
        return true; // General queries match anything
    }
  }

  /**
   * Detect if query is asking for elaboration/more details
   * These queries should skip FTS and go to LLM for better explanations
   */
  private isElaborationQuery(query: string): boolean {
    const normalized = normalizeText(query);
    this.logger.debug(`🔍 Checking elaboration query: "${query}" → normalized: "${normalized}"`);
    
    const elaborationPatterns = [
      /(nói|noi|biết|biet|tin|liệu|lieu)\s*(cụ|cu)\s*(thể|the)\s*(hơn|hon)/i,    // "nói/biết/tin/liệu cụ thể hơn" or just "cụ thể hơn" if handled carefully, but let's allow verb-noun combos or just context
      /(cụ|cu)\s*(thể|the)\s*(hơn|hon)/i,                        // Catch-all for "cụ thể hơn" (very strong signal)
      /(giải|giai)\s*(thích|thich)\s*(rõ|ro)\s*(hơn|hon)/i,     // "giải thích rõ hơn"
      /(chi|chỉ)\s*(tiết|tiet)\s*(hơn|hon)/i,                   // "chi tiết hơn"
      /(mở|mo)\s*(rộng|rong)\s*(thêm|them)/i,                   // "mở rộng thêm"
      /(rõ|ro)\s*(ràng|rang)\s*(hơn|hon)/i,                     // "rõ ràng hơn"
      /(đầy|day)\s*(đủ|du)\s*(hơn|hon)/i,                       // "đầy đủ hơn"
      /(hãy|hay|vui\s*lòng|vui\s*long|xin).*(giải|giai)\s*(thích|thich)/i,  // "hãy giải thích"
      /(hãy|hay|vui\s*lòng|vui\s*long|xin).*(nói|noi).*(thêm|them)/i,       // "hãy nói thêm"
      /(cho|chỉ|chi)\s*(tôi|toi)\s*(biết|biet)\s*(thêm|them)/i,  // "cho tôi biết thêm"
      /(thêm|them)\s*(thông|thong)\s*(tin)/i,                   // "thêm thông tin"
    ];
    
    for (const pattern of elaborationPatterns) {
      if (pattern.test(normalized)) {
        this.logger.debug(`🎯 Matched elaboration pattern: ${pattern.source}`);
        return true;
      }
    }
    
    this.logger.debug(`❌ No elaboration pattern matched`);
    return false;
  }
}
