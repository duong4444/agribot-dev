import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCropKnowledgeFTS1730900000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Fixing Crop Knowledge FTS functions...');

    // Drop existing functions if they exist
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS search_crop_knowledge_fts(text, uuid, integer, real) CASCADE;
      DROP FUNCTION IF EXISTS update_crop_chunk_search_vector() CASCADE;
      DROP FUNCTION IF EXISTS generate_crop_chunk_tsvector(text, text, text, text) CASCADE;
      DROP FUNCTION IF EXISTS normalize_vietnamese_text(text) CASCADE;
    `);

    console.log('✅ Dropped old functions');

    // 1. Create normalize function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION normalize_vietnamese_text(input_text text)
      RETURNS text AS $$
      BEGIN
        IF input_text IS NULL THEN
          RETURN '';
        END IF;
        
        RETURN lower(trim(input_text));
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    console.log('✅ Created normalize_vietnamese_text');

    // 2. Create tsvector generation function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generate_crop_chunk_tsvector(
        p_loai_cay text,
        p_tieu_de_chunk text,
        p_chu_de_lon text,
        p_noi_dung text
      )
      RETURNS tsvector AS $$
      DECLARE
        v_result tsvector;
      BEGIN
        v_result := 
          setweight(
            to_tsvector('simple', COALESCE(normalize_vietnamese_text(p_loai_cay), '')),
            'A'
          ) ||
          setweight(
            to_tsvector('simple', COALESCE(normalize_vietnamese_text(p_tieu_de_chunk), '')),
            'B'
          ) ||
          setweight(
            to_tsvector('simple', COALESCE(normalize_vietnamese_text(p_chu_de_lon), '')),
            'C'
          ) ||
          setweight(
            to_tsvector('simple', COALESCE(normalize_vietnamese_text(p_noi_dung), '')),
            'D'
          );
        
        RETURN v_result;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    console.log('✅ Created generate_crop_chunk_tsvector');

    // 3. Create trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_crop_chunk_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := generate_crop_chunk_tsvector(
          NEW.loai_cay,
          NEW.tieu_de_chunk,
          NEW.chu_de_lon,
          NEW.noi_dung
        );
        NEW.updated_at := now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Created update_crop_chunk_search_vector');

    // 4. Recreate trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_crop_chunk_search_vector ON crop_knowledge_chunks;
      
      CREATE TRIGGER trigger_update_crop_chunk_search_vector
      BEFORE INSERT OR UPDATE OF loai_cay, tieu_de_chunk, chu_de_lon, noi_dung
      ON crop_knowledge_chunks
      FOR EACH ROW
      EXECUTE FUNCTION update_crop_chunk_search_vector();
    `);

    console.log('✅ Created trigger');

    // 5. Create main search function with CORRECT return type
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION search_crop_knowledge_fts(
        search_query text,
        user_id uuid DEFAULT NULL,
        result_limit integer DEFAULT 10,
        min_rank real DEFAULT 0.01
      )
      RETURNS TABLE(
        chunk_id varchar,
        loai_cay varchar,
        chu_de_lon varchar,
        tieu_de_chunk varchar,
        noi_dung text,
        metadata jsonb,
        rank real,
        headline text
      ) AS $$
      DECLARE
        query tsquery;
        normalized_query text;
      BEGIN
        normalized_query := normalize_vietnamese_text(search_query);
        query := plainto_tsquery('simple', normalized_query);
        
        RETURN QUERY
        SELECT 
          ck.chunk_id,
          ck.loai_cay,
          ck.chu_de_lon,
          ck.tieu_de_chunk,
          ck.noi_dung,
          ck.metadata,
          ts_rank_cd(
            ck.search_vector, 
            query,
            32
          ) * 
          (
            CASE 
              WHEN lower(ck.loai_cay) LIKE '%' || lower(search_query) || '%' THEN 2.5
              WHEN lower(ck.tieu_de_chunk) LIKE '%' || lower(search_query) || '%' THEN 2.0
              WHEN lower(ck.chu_de_lon) LIKE '%' || lower(search_query) || '%' THEN 1.5
              ELSE 1.0
            END
          ) as rank,
          ts_headline(
            'simple',
            ck.noi_dung,
            query,
            'MaxWords=50, MinWords=25, ShortWord=3, HighlightAll=false'
          ) as headline
        FROM 
          crop_knowledge_chunks ck
        WHERE 
          ck.search_vector @@ query
          AND ck.status = 'active'
          AND (user_id IS NULL OR ck.user_id = user_id)
          AND ts_rank_cd(ck.search_vector, query) >= min_rank
        ORDER BY rank DESC
        LIMIT result_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Created search_crop_knowledge_fts');

    // 6. Update all existing chunks to regenerate search_vector
    await queryRunner.query(`
      UPDATE crop_knowledge_chunks
      SET updated_at = now()
      WHERE status = 'active';
    `);

    console.log('✅ Updated all chunks to regenerate search_vector');
    console.log('🎉 Crop Knowledge FTS fix completed!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS search_crop_knowledge_fts(text, uuid, integer, real) CASCADE;
      DROP FUNCTION IF EXISTS update_crop_chunk_search_vector() CASCADE;
      DROP FUNCTION IF EXISTS generate_crop_chunk_tsvector(text, text, text, text) CASCADE;
      DROP FUNCTION IF EXISTS normalize_vietnamese_text(text) CASCADE;
      DROP TRIGGER IF EXISTS trigger_update_crop_chunk_search_vector ON crop_knowledge_chunks;
    `);
  }
}
