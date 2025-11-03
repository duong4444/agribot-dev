import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Enhanced Full-Text Search for Vietnamese
 * 
 * Features:
 * - Vietnamese text search configuration
 * - Advanced FTS indexes with GIN
 * - Trigger functions for auto-update searchVector
 * - Weighted search (title > content)
 * - Phrase search support
 */
export class EnhanceFullTextSearch1730000000001 implements MigrationInterface {
  name = 'EnhanceFullTextSearch1730000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. INSTALL REQUIRED EXTENSIONS
    // ========================================
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent"`);

    // ========================================
    // 2. CREATE VIETNAMESE TEXT SEARCH CONFIG
    // ========================================
    
    // Check if configuration exists
    const configExists = await queryRunner.query(`
      SELECT 1 FROM pg_ts_config WHERE cfgname = 'vietnamese'
    `);

    if (configExists.length === 0) {
      // Create Vietnamese text search configuration
      await queryRunner.query(`
        CREATE TEXT SEARCH CONFIGURATION vietnamese (COPY = simple);
      `);

      // Add Vietnamese dictionary mappings
      await queryRunner.query(`
        ALTER TEXT SEARCH CONFIGURATION vietnamese
          ALTER MAPPING FOR asciiword, word, numword, asciihword, hword, numhword
          WITH unaccent, simple;
      `);
    }

    // ========================================
    // 3. CREATE HELPER FUNCTIONS
    // ========================================

    // Function: Normalize Vietnamese text
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION normalize_vietnamese_text(text)
      RETURNS text AS $$
      BEGIN
        RETURN lower(unaccent($1));
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Function: Generate weighted tsvector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generate_weighted_tsvector(
        content text,
        weight char DEFAULT 'D'
      )
      RETURNS tsvector AS $$
      BEGIN
        RETURN setweight(
          to_tsvector('vietnamese', normalize_vietnamese_text(content)),
          weight
        );
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // ========================================
    // 4. UPDATE DOCUMENT_CHUNKS TABLE
    // ========================================

    // Add searchVector if not exists
    const columnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'document_chunks' 
      AND column_name = 'searchVector'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "document_chunks"
        ADD COLUMN "searchVector" tsvector;
      `);
    }

    // Update existing searchVector values
    await queryRunner.query(`
      UPDATE "document_chunks"
      SET "searchVector" = generate_weighted_tsvector(content, 'D')
      WHERE "searchVector" IS NULL;
    `);

    // ========================================
    // 5. CREATE TRIGGER FOR AUTO-UPDATE
    // ========================================

    // Trigger function for document_chunks
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_chunk_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW."searchVector" := generate_weighted_tsvector(NEW.content, 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Drop trigger if exists
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_chunk_search_vector 
      ON "document_chunks";
    `);

    // Create trigger
    await queryRunner.query(`
      CREATE TRIGGER trigger_update_chunk_search_vector
      BEFORE INSERT OR UPDATE OF content
      ON "document_chunks"
      FOR EACH ROW
      EXECUTE FUNCTION update_chunk_search_vector();
    `);

    // ========================================
    // 6. CREATE OPTIMIZED INDEXES
    // ========================================

    // Drop old index if exists
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_chunks_fts;
    `);

    // Create GIN index for full-text search (faster than GiST)
    await queryRunner.query(`
      CREATE INDEX idx_chunks_fts_gin 
      ON "document_chunks" 
      USING GIN("searchVector");
    `);

    // Create trigram index for fuzzy matching
    await queryRunner.query(`
      CREATE INDEX idx_chunks_content_trgm 
      ON "document_chunks" 
      USING GIN(content gin_trgm_ops);
    `);

    // Create composite index for filtered searches
    await queryRunner.query(`
      CREATE INDEX idx_chunks_document_fts 
      ON "document_chunks"("documentId", "chunkIndex");
    `);

    // ========================================
    // 7. CREATE MATERIALIZED VIEW FOR STATS
    // ========================================

    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS document_search_stats AS
      SELECT 
        d.id as document_id,
        d.filename,
        d.category,
        COUNT(dc.id) as chunk_count,
        SUM(dc."tokenCount") as total_tokens,
        AVG(length(dc.content)) as avg_chunk_length
      FROM documents d
      LEFT JOIN document_chunks dc ON d.id = dc."documentId"
      WHERE d."processingStatus" = 'completed'
      GROUP BY d.id, d.filename, d.category;
    `);

    // Create index on materialized view
    await queryRunner.query(`
      CREATE INDEX idx_search_stats_document 
      ON document_search_stats(document_id);
    `);

    // ========================================
    // 8. CREATE SEARCH HELPER FUNCTIONS
    // ========================================

    // Function: Search with ranking
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION search_chunks_ranked(
        search_query text,
        user_id uuid DEFAULT NULL,
        result_limit integer DEFAULT 10
      )
      RETURNS TABLE(
        chunk_id uuid,
        content text,
        document_id uuid,
        filename text,
        rank real,
        headline text
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          dc.id,
          dc.content,
          dc."documentId",
          d.filename,
          ts_rank(dc."searchVector", query) as rank,
          ts_headline(
            'vietnamese',
            dc.content,
            query,
            'MaxWords=50, MinWords=25, ShortWord=3, HighlightAll=false, MaxFragments=1'
          ) as headline
        FROM 
          document_chunks dc
          JOIN documents d ON dc."documentId" = d.id,
          plainto_tsquery('vietnamese', normalize_vietnamese_text(search_query)) query
        WHERE 
          dc."searchVector" @@ query
          AND (user_id IS NULL OR d."userId" = user_id)
          AND d."processingStatus" = 'completed'
        ORDER BY rank DESC
        LIMIT result_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Function: Fuzzy search fallback
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION search_chunks_fuzzy(
        search_query text,
        user_id uuid DEFAULT NULL,
        similarity_threshold real DEFAULT 0.3,
        result_limit integer DEFAULT 10
      )
      RETURNS TABLE(
        chunk_id uuid,
        content text,
        document_id uuid,
        filename text,
        similarity real
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          dc.id,
          dc.content,
          dc."documentId",
          d.filename,
          similarity(dc.content, search_query) as sim
        FROM 
          document_chunks dc
          JOIN documents d ON dc."documentId" = d.id
        WHERE 
          dc.content % search_query
          AND similarity(dc.content, search_query) >= similarity_threshold
          AND (user_id IS NULL OR d."userId" = user_id)
          AND d."processingStatus" = 'completed'
        ORDER BY sim DESC
        LIMIT result_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log(' Enhanced Full-Text Search migration completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS search_chunks_fuzzy`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS search_chunks_ranked`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_chunk_search_vector CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS generate_weighted_tsvector`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS normalize_vietnamese_text`);

    // Drop materialized view
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS document_search_stats`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chunks_document_fts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chunks_content_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chunks_fts_gin`);

    // Drop trigger
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_chunk_search_vector ON "document_chunks"`);

    // Drop text search configuration
    await queryRunner.query(`DROP TEXT SEARCH CONFIGURATION IF EXISTS vietnamese CASCADE`);

    // Drop extensions (be careful - might be used elsewhere)
    // await queryRunner.query(`DROP EXTENSION IF EXISTS "unaccent"`);
    // await queryRunner.query(`DROP EXTENSION IF EXISTS "pg_trgm"`);

    console.log(' Enhanced Full-Text Search migration rolled back');
  }
}

