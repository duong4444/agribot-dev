-- ============================================
-- DROP FARM & IOT TABLES
-- Run this in PostgreSQL (agri_chatbot database)
-- ============================================

-- Drop tables in order (child → parent)
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS device_commands CASCADE;
DROP TABLE IF EXISTS sensors CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS crops CASCADE;
DROP TABLE IF EXISTS farms CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS devices_type_enum CASCADE;
DROP TYPE IF EXISTS devices_status_enum CASCADE;
DROP TYPE IF EXISTS sensors_type_enum CASCADE;
DROP TYPE IF EXISTS sensors_status_enum CASCADE;
DROP TYPE IF EXISTS device_commands_status_enum CASCADE;
DROP TYPE IF EXISTS activities_type_enum CASCADE;
DROP TYPE IF EXISTS activities_status_enum CASCADE;
DROP TYPE IF EXISTS crops_type_enum CASCADE;
DROP TYPE IF EXISTS crops_status_enum CASCADE;
DROP TYPE IF EXISTS farms_type_enum CASCADE;
DROP TYPE IF EXISTS farms_status_enum CASCADE;
DROP TYPE IF EXISTS expenses_category_enum CASCADE;

-- Verify remaining tables
SELECT 'Remaining tables:' as info;
\dt

-- Expected result: Only these tables should remain
-- - users
-- - conversations
-- - messages
-- - documents
-- - rag_documents
-- - rag_chunks
-- - crop_knowledge_chunks
-- - migrations
