-- Setup Crop Knowledge Refactor với Weighted FTS
-- Run this script directly in PostgreSQL

-- ========================================
-- 1. CREATE NEW TABLE FOR CROP KNOWLEDGE CHUNKS
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "crop_knowledge_chunks" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "chunk_id" varchar NOT NULL UNIQUE,
  "loai_cay" varchar NOT NULL,
  "nguon" varchar NOT NULL,
  "chu_de_lon" varchar NOT NULL,
  "tieu_de_chunk" varchar NOT NULL,
  "noi_dung" text NOT NULL,
  "thu_tu" integer NOT NULL,
  "search_vector" tsvector,
  "metadata" jsonb,
  "document_id" uuid,
  "user_id" uuid,
  "status" varchar DEFAULT 'active',
  "version" integer DEFAULT 1,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now(),
  CONSTRAINT "PK_crop_knowledge_chunks" PRIMARY KEY ("id")
);

-- ========================================
-- 2. CREATE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS "idx_crop_knowledge_loai_cay" 
ON "crop_knowledge_chunks" ("loai_cay");

CREATE INDEX IF NOT EXISTS "idx_crop_knowledge_chu_de" 
ON "crop_knowledge_chunks" ("chu_de_lon");

CREATE INDEX IF NOT EXISTS "idx_crop_knowledge_search_vector" 
ON "crop_knowledge_chunks" USING GIN ("search_vector");

CREATE INDEX IF NOT EXISTS "idx_crop_knowledge_composite" 
ON "crop_knowledge_chunks" ("loai_cay", "chu_de_lon", "tieu_de_chunk");

CREATE INDEX IF NOT EXISTS "idx_chunk_id_unique" 
ON "crop_knowledge_chunks" ("chunk_id");

-- ========================================
-- 3. CREATE VIETNAMESE TEXT NORMALIZATION FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION normalize_vietnamese_text(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN '';
  END IF;
  
  -- Basic normalization: lowercase and trim
  RETURN lower(trim(input_text));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- 4. CREATE WEIGHTED TSVECTOR GENERATION FUNCTION
-- ========================================

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
  -- Combine all fields with different weights
  -- A: loai_cay (highest priority - crop type)
  -- B: tieu_de_chunk (high priority - section title)
  -- C: chu_de_lon (medium priority - main topic)
  -- D: noi_dung (default priority - content)
  
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

-- ========================================
-- 5. CREATE TRIGGER FOR AUTO-UPDATE SEARCH VECTOR
-- ========================================

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

CREATE TRIGGER trigger_update_crop_chunk_search_vector
BEFORE INSERT OR UPDATE OF loai_cay, tieu_de_chunk, chu_de_lon, noi_dung
ON "crop_knowledge_chunks"
FOR EACH ROW
EXECUTE FUNCTION update_crop_chunk_search_vector();

-- ========================================
-- 6. CREATE MAIN SEARCH FUNCTION
-- ========================================

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
  -- Normalize query
  normalized_query := normalize_vietnamese_text(search_query);
  
  -- Convert to tsquery
  query := plainto_tsquery('simple', normalized_query);
  
  RETURN QUERY
  SELECT 
    ck.chunk_id,
    ck.loai_cay,
    ck.chu_de_lon,
    ck.tieu_de_chunk,
    ck.noi_dung,
    ck.metadata,
    -- Calculate rank with boosting
    ts_rank_cd(
      ck.search_vector, 
      query,
      32 -- Normalize by document length
    ) * 
    -- Boost if query matches crop type or title exactly
    (
      CASE 
        WHEN lower(ck.loai_cay) LIKE '%' || lower(search_query) || '%' THEN 2.5
        WHEN lower(ck.tieu_de_chunk) LIKE '%' || lower(search_query) || '%' THEN 2.0
        WHEN lower(ck.chu_de_lon) LIKE '%' || lower(search_query) || '%' THEN 1.5
        ELSE 1.0
      END
    ) as rank,
    -- Generate headline
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
    AND (
      search_crop_knowledge_fts.user_id IS NULL 
      OR ck.user_id::text = search_crop_knowledge_fts.user_id::text
    )
    AND ts_rank_cd(ck.search_vector, query) >= min_rank
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. CREATE FUNCTION FOR EXACT CROP SEARCH
-- ========================================

CREATE OR REPLACE FUNCTION search_crop_by_name_and_topic(
  crop_name text,
  topic_keywords text,
  user_id uuid DEFAULT NULL,
  result_limit integer DEFAULT 10
)
RETURNS TABLE(
  chunk_id varchar,
  loai_cay varchar,
  chu_de_lon varchar,
  tieu_de_chunk varchar,
  noi_dung text,
  rank real
) AS $$
DECLARE
  query tsquery;
  combined_query text;
BEGIN
  -- Combine crop name and topic
  combined_query := normalize_vietnamese_text(crop_name || ' ' || topic_keywords);
  query := plainto_tsquery('simple', combined_query);
  
  RETURN QUERY
  SELECT 
    ck.chunk_id,
    ck.loai_cay,
    ck.chu_de_lon,
    ck.tieu_de_chunk,
    ck.noi_dung,
    ts_rank_cd(ck.search_vector, query, 32) * 
    -- Heavy boost for exact crop match
    (CASE 
      WHEN lower(ck.loai_cay) = lower(crop_name) THEN 3.0
      WHEN lower(ck.loai_cay) LIKE '%' || lower(crop_name) || '%' THEN 2.0
      ELSE 0.5
    END) as rank
  FROM 
    crop_knowledge_chunks ck
  WHERE 
    ck.search_vector @@ query
    AND ck.status = 'active'
    AND lower(ck.loai_cay) LIKE '%' || lower(crop_name) || '%'
    AND (
      search_crop_by_name_and_topic.user_id IS NULL 
      OR ck.user_id::text = search_crop_by_name_and_topic.user_id::text
    )
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. CREATE STATISTICS VIEW
-- ========================================

CREATE OR REPLACE VIEW crop_knowledge_statistics AS
SELECT 
  loai_cay as crop_name,
  COUNT(DISTINCT chu_de_lon) as topic_count,
  COUNT(*) as chunk_count,
  AVG(length(noi_dung)) as avg_content_length,
  MAX(created_at) as last_updated,
  MIN(created_at) as first_added
FROM crop_knowledge_chunks
WHERE status = 'active'
GROUP BY loai_cay
ORDER BY chunk_count DESC;

-- ========================================
-- 9. INSERT MIGRATION RECORD
-- ========================================

INSERT INTO migrations (timestamp, name) 
VALUES (1730800000002, 'CropKnowledgeRefactor1730800000002')
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'Crop Knowledge FTS setup completed!' as message;
