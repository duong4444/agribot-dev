-- Fix FTS Boost Logic
-- Run this with: psql -U your_user -d agri_chatbot -f fix-fts-boost.sql

DROP FUNCTION IF EXISTS search_crop_knowledge_fts(text, varchar, integer, real, text) CASCADE;

CREATE OR REPLACE FUNCTION public.search_crop_knowledge_fts(
  search_query text,
  p_user_id varchar DEFAULT NULL,
  result_limit integer DEFAULT 10,
  min_rank real DEFAULT 0.01,
  crop_filter text DEFAULT NULL
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
)
LANGUAGE plpgsql AS $$
DECLARE
  query tsquery;
  normalized_query text;
  normalized_crop_filter text;
  query_words text[];
  word text;
  or_query text;
BEGIN
  normalized_query := normalize_vietnamese_text(search_query);
  
  IF crop_filter IS NOT NULL THEN
    normalized_crop_filter := normalize_vietnamese_text(crop_filter);
  END IF;
  
  query_words := string_to_array(normalized_query, ' ');
  or_query := '';
  
  FOREACH word IN ARRAY query_words LOOP
    IF length(word) > 2 THEN
      IF or_query = '' THEN
        or_query := word;
      ELSE
        or_query := or_query || ' | ' || word;
      END IF;
    END IF;
  END LOOP;
  
  IF or_query = '' THEN
    query := plainto_tsquery('simple', normalized_query);
  ELSE
    query := to_tsquery('simple', or_query);
  END IF;
  
  RETURN QUERY
  SELECT 
    ck.chunk_id,
    ck.loai_cay,
    ck.chu_de_lon,
    ck.tieu_de_chunk,
    ck.noi_dung,
    ck.metadata,
    (
      ts_rank_cd(ck.search_vector, query, 32)
      *
      -- FIXED: Check if search_query contains field (not vice versa)
      CASE 
        WHEN lower(search_query) LIKE '%' || lower(ck.loai_cay) || '%' THEN 2.5
        WHEN lower(search_query) LIKE '%' || lower(ck.tieu_de_chunk) || '%' THEN 2.0
        WHEN lower(search_query) LIKE '%' || lower(ck.chu_de_lon) || '%' THEN 1.5
        ELSE 1.0
      END
      *
      CASE 
        WHEN position(normalized_query IN normalize_vietnamese_text(ck.tieu_de_chunk)) > 0 
        THEN 10.0
        ELSE 1.0
      END
    )::real AS rank,
    ts_headline('simple', ck.noi_dung, query, 'MaxWords=50, MinWords=25, ShortWord=3, HighlightAll=false') AS headline
  FROM crop_knowledge_chunks ck
  WHERE 
    ck.search_vector @@ query
    AND ck.status = 'active'
    AND (p_user_id IS NULL OR ck.user_id = p_user_id)
    AND ts_rank_cd(ck.search_vector, query) >= min_rank
    AND (crop_filter IS NULL OR normalize_vietnamese_text(ck.loai_cay) LIKE '%' || normalized_crop_filter || '%')
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$;

-- Verify the function was created
SELECT 'Function search_crop_knowledge_fts has been updated successfully!' AS status;
