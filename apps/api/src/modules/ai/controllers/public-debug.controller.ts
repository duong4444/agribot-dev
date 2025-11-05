import { Controller, Get, Post, Query } from '@nestjs/common';
import { CropKnowledgeFTSService } from '../services/crop-knowledge-fts.service';

/**
 * Public Debug Controller (NO AUTH)
 * For testing FTS setup only - REMOVE IN PRODUCTION
 */
@Controller('public/debug')
export class PublicDebugController {
  constructor(
    private readonly cropKnowledgeFTS: CropKnowledgeFTSService,
  ) {}

  @Get('verify-fts')
  async verifyFTS() {
    const verification = await this.cropKnowledgeFTS.verifyFTSSetup();

    return {
      success: true,
      verification,
    };
  }

  @Post('rebuild-vectors')
  async rebuildVectors() {
    const result = await this.cropKnowledgeFTS.rebuildSearchVectors();

    return {
      success: true,
      message: 'Search vectors rebuilt',
      result,
    };
  }

  @Get('test-search')
  async testSearch(@Query('query') query?: string) {
    if (!query) {
      return {
        success: false,
        message: 'Query parameter required',
      };
    }

    const result = await this.cropKnowledgeFTS.searchCropKnowledge(
      query,
      undefined,
      {
        limit: 5,
        threshold: 0.5,
      },
    );

    return {
      success: true,
      query,
      result,
    };
  }

  @Get('chunks')
  async viewChunks(
    @Query('limit') limit?: string,
    @Query('crop') cropName?: string,
  ) {
    const chunks = await this.cropKnowledgeFTS.getAllChunks(
      parseInt(limit || '10'),
      cropName,
    );

    return {
      success: true,
      total: chunks.length,
      data: chunks,
    };
  }

  @Get('check-vectors')
  async checkVectors() {
    try {
      const repo = this.cropKnowledgeFTS['chunkRepo'];
      
      // Check if vectors exist and sample content
      const result = await repo.query(`
        SELECT 
          chunk_id,
          loai_cay,
          tieu_de_chunk,
          search_vector IS NOT NULL as has_vector,
          ts_debug('simple', normalize_vietnamese_text(loai_cay)) as normalized_crop,
          search_vector::text as vector_preview
        FROM crop_knowledge_chunks
        LIMIT 3
      `);

      return {
        success: true,
        samples: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('test-direct-query')
  async testDirectQuery(@Query('query') query?: string) {
    if (!query) {
      return {
        success: false,
        message: 'Query parameter required',
      };
    }

    try {
      // Test normalization
      const normalized = await this.cropKnowledgeFTS['chunkRepo'].query(
        `SELECT normalize_vietnamese_text($1) as normalized`,
        [query],
      );

      // Test tsquery
      const tsquery = await this.cropKnowledgeFTS['chunkRepo'].query(
        `SELECT plainto_tsquery('simple', normalize_vietnamese_text($1)) as query`,
        [query],
      );

      // Test calling the PostgreSQL function directly
      const result = await this.cropKnowledgeFTS['chunkRepo'].query(
        `SELECT * FROM search_crop_knowledge_fts($1, $2, $3, $4)`,
        [query, null, 5, 0.01],
      );

      return {
        success: true,
        query,
        normalized: normalized[0].normalized,
        tsquery: tsquery[0].query,
        resultsCount: result.length,
        results: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Post('force-fix-fts')
  async forceFixFTS() {
    try {
      const repo = this.cropKnowledgeFTS['chunkRepo'];

      // Enable unaccent extension for Vietnamese text
      await repo.query(`CREATE EXTENSION IF NOT EXISTS unaccent;`);

      // Drop and recreate all functions
      await repo.query(`
        DROP FUNCTION IF EXISTS search_crop_knowledge_fts(text, uuid, integer, real) CASCADE;
        DROP FUNCTION IF EXISTS update_crop_chunk_search_vector() CASCADE;
        DROP FUNCTION IF EXISTS generate_crop_chunk_tsvector(text, text, text, text) CASCADE;
        DROP FUNCTION IF EXISTS normalize_vietnamese_text(text) CASCADE;
      `);

      // Create normalize function with unaccent for Vietnamese
      await repo.query(`
        CREATE OR REPLACE FUNCTION normalize_vietnamese_text(input_text text)
        RETURNS text AS $$
        BEGIN
          IF input_text IS NULL THEN RETURN ''; END IF;
          -- Remove Vietnamese diacritics and convert to lowercase
          RETURN unaccent(lower(trim(input_text)));
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
      `);

      await repo.query(`
        CREATE OR REPLACE FUNCTION generate_crop_chunk_tsvector(
          p_loai_cay text, p_tieu_de_chunk text, p_chu_de_lon text, p_noi_dung text
        )
        RETURNS tsvector AS $$
        BEGIN
          RETURN 
            setweight(to_tsvector('simple', COALESCE(normalize_vietnamese_text(p_loai_cay), '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(normalize_vietnamese_text(p_tieu_de_chunk), '')), 'B') ||
            setweight(to_tsvector('simple', COALESCE(normalize_vietnamese_text(p_chu_de_lon), '')), 'C') ||
            setweight(to_tsvector('simple', COALESCE(normalize_vietnamese_text(p_noi_dung), '')), 'D');
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
      `);

      await repo.query(`
        CREATE OR REPLACE FUNCTION update_crop_chunk_search_vector()
        RETURNS trigger AS $$
        BEGIN
          NEW.search_vector := generate_crop_chunk_tsvector(NEW.loai_cay, NEW.tieu_de_chunk, NEW.chu_de_lon, NEW.noi_dung);
          NEW.updated_at := now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await repo.query(`
        DROP TRIGGER IF EXISTS trigger_update_crop_chunk_search_vector ON crop_knowledge_chunks;
        CREATE TRIGGER trigger_update_crop_chunk_search_vector
        BEFORE INSERT OR UPDATE OF loai_cay, tieu_de_chunk, chu_de_lon, noi_dung
        ON crop_knowledge_chunks
        FOR EACH ROW EXECUTE FUNCTION update_crop_chunk_search_vector();
      `);

      await repo.query(`
        CREATE OR REPLACE FUNCTION search_crop_knowledge_fts(
          search_query text, user_id uuid DEFAULT NULL, result_limit integer DEFAULT 10, min_rank real DEFAULT 0.01
        )
        RETURNS TABLE(chunk_id text, loai_cay text, chu_de_lon text, tieu_de_chunk text, 
                      noi_dung text, metadata jsonb, rank real, headline text) AS $$
        DECLARE 
          query tsquery; 
          normalized_query text;
          words text[];
        BEGIN
          normalized_query := normalize_vietnamese_text(search_query);
          
          -- Split into words and create OR query for better recall
          words := string_to_array(normalized_query, ' ');
          words := array_remove(words, '');
          
          -- Create OR query from words
          IF array_length(words, 1) > 0 THEN
            query := to_tsquery('simple', array_to_string(words, ' | '));
          ELSE
            query := plainto_tsquery('simple', normalized_query);
          END IF;
          
          RETURN QUERY
          SELECT 
            ck.chunk_id::text, 
            ck.loai_cay::text, 
            ck.chu_de_lon::text, 
            ck.tieu_de_chunk::text, 
            ck.noi_dung::text, 
            ck.metadata,
            (ts_rank_cd(ck.search_vector, query, 32) * 
            (CASE 
              -- Strong boost for key phrases in title (e.g., "benh loet", "sau vo bua")
              WHEN normalize_vietnamese_text(ck.tieu_de_chunk) LIKE '%benh loet%' 
                   AND normalize_vietnamese_text(search_query) LIKE '%benh loet%' THEN 10.0
              WHEN normalize_vietnamese_text(ck.tieu_de_chunk) LIKE '%sau vo bua%' 
                   AND normalize_vietnamese_text(search_query) LIKE '%sau vo bua%' THEN 10.0
              -- Boost for crop type match
              WHEN lower(ck.loai_cay) LIKE '%' || lower(search_query) || '%' THEN 2.5
              -- Boost for any word in title
              WHEN lower(ck.tieu_de_chunk) LIKE '%' || lower(search_query) || '%' THEN 2.0
              -- Boost for topic match
              WHEN lower(ck.chu_de_lon) LIKE '%' || lower(search_query) || '%' THEN 1.5
              ELSE 1.0
            END))::real as rank,
            ts_headline('simple', ck.noi_dung, query, 'MaxWords=50, MinWords=25')::text as headline
          FROM crop_knowledge_chunks ck
          WHERE ck.search_vector @@ query AND ck.status = 'active'
            AND (search_crop_knowledge_fts.user_id IS NULL OR ck.user_id::text = search_crop_knowledge_fts.user_id::text)
            AND ts_rank_cd(ck.search_vector, query) >= min_rank
          ORDER BY rank DESC LIMIT result_limit;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Rebuild vectors - force trigger by updating actual content columns
      await repo.query(`
        UPDATE crop_knowledge_chunks 
        SET loai_cay = loai_cay, 
            tieu_de_chunk = tieu_de_chunk,
            chu_de_lon = chu_de_lon,
            noi_dung = noi_dung
        WHERE status = 'active'
      `);

      return {
        success: true,
        message: 'FTS functions recreated and vectors rebuilt',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }
}
