-- Check FTS Setup Script
-- Run this to verify crop knowledge FTS is properly configured

-- 1. Check if table exists
SELECT 
  'Table exists: ' || CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'crop_knowledge_chunks'
  ) THEN 'YES' ELSE 'NO' END as status;

-- 2. Check if search_vector column exists
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'crop_knowledge_chunks'
  AND column_name = 'search_vector';

-- 3. Check if functions exist
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

-- 4. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_crop_chunk_search_vector';

-- 5. Check if GIN index exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'crop_knowledge_chunks'
  AND indexname = 'idx_crop_knowledge_search_vector';

-- 6. Count chunks and check search_vector
SELECT 
  COUNT(*) as total_chunks,
  COUNT(search_vector) as chunks_with_vector,
  COUNT(*) - COUNT(search_vector) as chunks_missing_vector
FROM crop_knowledge_chunks;

-- 7. Sample search_vector content
SELECT 
  chunk_id,
  loai_cay,
  tieu_de_chunk,
  search_vector IS NOT NULL as has_vector,
  LENGTH(search_vector::text) as vector_length
FROM crop_knowledge_chunks
LIMIT 5;
