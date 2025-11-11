-- ============================================
-- DROP document_chunks TABLE
-- ============================================
-- Purpose: Remove Layer 2 RAG document chunks table completely
-- Author: AgriBot Development Team
-- Date: 2024-11-11
-- WARNING: This is a DESTRUCTIVE operation!
-- All data in document_chunks will be permanently deleted.
-- ============================================

-- Backup check (optional - comment out if not needed)
-- SELECT COUNT(*) as total_chunks FROM document_chunks;

BEGIN;

-- ========================================
-- 1. DROP TRIGGERS
-- ========================================
RAISE NOTICE 'Dropping triggers...';

DROP TRIGGER IF EXISTS trigger_update_chunk_search_vector ON document_chunks;
DROP TRIGGER IF EXISTS chunks_search_vector_trigger ON document_chunks;

-- ========================================
-- 2. DROP FUNCTIONS
-- ========================================
RAISE NOTICE 'Dropping functions...';

DROP FUNCTION IF EXISTS update_chunk_search_vector();
DROP FUNCTION IF EXISTS chunks_search_vector_update();

-- ========================================
-- 3. DROP FOREIGN KEYS
-- ========================================
RAISE NOTICE 'Dropping foreign keys...';

ALTER TABLE document_chunks DROP CONSTRAINT IF EXISTS FK_document_chunks_documentId;

-- ========================================
-- 4. DROP INDEXES
-- ========================================
RAISE NOTICE 'Dropping indexes...';

-- From CreateAITables migration
DROP INDEX IF EXISTS idx_chunks_embedding;
DROP INDEX IF EXISTS idx_chunks_fts;
DROP INDEX IF EXISTS idx_chunks_index;
DROP INDEX IF EXISTS idx_chunks_document;

-- From EnhanceFullTextSearch migration
DROP INDEX IF EXISTS idx_chunks_fts_gin;
DROP INDEX IF EXISTS idx_chunks_content_trgm;
DROP INDEX IF EXISTS idx_chunks_document_fts;

-- ========================================
-- 5. DROP TABLE
-- ========================================
RAISE NOTICE 'Dropping document_chunks table...';

DROP TABLE IF EXISTS document_chunks CASCADE;

COMMIT;

RAISE NOTICE '✅ Successfully dropped document_chunks table and all related objects!';

-- ========================================
-- VERIFICATION
-- ========================================
-- Check if table still exists (should return 0 rows)
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'document_chunks';

-- List remaining tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
