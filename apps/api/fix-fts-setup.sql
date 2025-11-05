-- Fix FTS Setup Script
-- Run this if crop knowledge FTS is not working properly

\echo '=== Starting FTS Fix Script ==='

-- 1. Drop existing objects if they exist (clean slate)
\echo 'Step 1: Cleaning up existing objects...'

DROP TRIGGER IF EXISTS trigger_update_crop_chunk_search_vector ON crop_knowledge_chunks CASCADE;
DROP FUNCTION IF EXISTS update_crop_chunk_search_vector() CASCADE;
DROP FUNCTION IF EXISTS generate_crop_chunk_tsvector(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS search_crop_knowledge_fts(text, uuid, integer, real) CASCADE;
DROP FUNCTION IF EXISTS search_crop_by_name_and_topic(text, text, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS normalize_vietnamese_text(text) CASCADE;

-- 2. Recreate normalize function
\echo 'Step 2: Creating normalize_vietnamese_text function...'

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

-- 3. Recreate tsvector generation function
\echo 'Step 3: Creating generate_crop_chunk_tsvector function...'

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

-- 4. Recreate trigger function
\echo 'Step 4: Creating update_crop_chunk_search_vector trigger function...'

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

-- 5. Recreate trigger
\echo 'Step 5: Creating trigger...'

CREATE TRIGGER trigger_update_crop_chunk_search_vector
BEFORE INSERT OR UPDATE OF loai_cay, tieu_de_chunk, chu_de_lon, noi_dung
ON crop_knowledge_chunks
FOR EACH ROW
EXECUTE FUNCTION update_crop_chunk_search_vector();

-- 6. Recreate main search function
\echo 'Step 6: Creating search_crop_knowledge_fts function...'

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
    AND (user_id IS NULL OR ck.user_id = user_id)
    AND ts_rank_cd(ck.search_vector, query) >= min_rank
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 7. Update all existing chunks to generate search_vector
\echo 'Step 7: Updating all chunks to generate search_vector...'

UPDATE crop_knowledge_chunks
SET updated_at = now()
WHERE status = 'active';

-- 8. Verify setup
\echo 'Step 8: Verifying setup...'

SELECT 
  COUNT(*) as total_chunks,
  COUNT(search_vector) as chunks_with_vector,
  COUNT(*) - COUNT(search_vector) as chunks_missing_vector
FROM crop_knowledge_chunks;

-- 9. Test search
\echo 'Step 9: Testing search with sample query...'

SELECT 
  chunk_id,
  loai_cay,
  tieu_de_chunk,
  rank
FROM search_crop_knowledge_fts('bệnh loét bưởi', NULL, 5, 0.01);

\echo '=== FTS Fix Script Completed ==='
