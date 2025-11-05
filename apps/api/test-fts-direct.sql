-- Direct FTS Test Script
-- Test FTS functionality directly in PostgreSQL

\echo '=== Testing FTS Setup ==='
\echo ''

-- 1. Check if functions exist
\echo '1. Checking if functions exist...'
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'normalize_vietnamese_text',
  'generate_crop_chunk_tsvector',
  'update_crop_chunk_search_vector',
  'search_crop_knowledge_fts'
)
ORDER BY routine_name;

\echo ''
\echo '2. Checking chunks and search_vector status...'
SELECT 
  COUNT(*) as total_chunks,
  COUNT(search_vector) as chunks_with_vector,
  COUNT(*) - COUNT(search_vector) as chunks_missing_vector
FROM crop_knowledge_chunks;

\echo ''
\echo '3. Sample chunks with vector status...'
SELECT 
  chunk_id,
  loai_cay,
  tieu_de_chunk,
  search_vector IS NOT NULL as has_vector,
  CASE 
    WHEN search_vector IS NOT NULL THEN LENGTH(search_vector::text)
    ELSE 0
  END as vector_length
FROM crop_knowledge_chunks
LIMIT 5;

\echo ''
\echo '4. Testing search function with query: "bệnh loét bưởi"...'
SELECT 
  chunk_id,
  loai_cay,
  tieu_de_chunk,
  rank,
  LEFT(noi_dung, 100) as content_preview
FROM search_crop_knowledge_fts('bệnh loét bưởi', NULL, 5, 0.01);

\echo ''
\echo '5. Testing search function with query: "cách trị bệnh loét cho bưởi da xanh"...'
SELECT 
  chunk_id,
  loai_cay,
  tieu_de_chunk,
  rank,
  LEFT(noi_dung, 100) as content_preview
FROM search_crop_knowledge_fts('cách trị bệnh loét cho bưởi da xanh', NULL, 5, 0.01);

\echo ''
\echo '6. Manual LIKE search as fallback...'
SELECT 
  chunk_id,
  loai_cay,
  tieu_de_chunk,
  LEFT(noi_dung, 100) as content_preview
FROM crop_knowledge_chunks
WHERE 
  LOWER(loai_cay) LIKE '%bưởi%'
  AND (
    LOWER(tieu_de_chunk) LIKE '%loét%'
    OR LOWER(noi_dung) LIKE '%loét%'
  )
LIMIT 5;

\echo ''
\echo '=== Test Complete ==='
