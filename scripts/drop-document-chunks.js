const { Client } = require('pg');
require('dotenv').config();

async function dropDocumentChunksTable() {
  console.log('🗑️  Starting to drop document_chunks table...\n');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'agri_chatbot',
  });

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Database connected!\n');

    // ========================================
    // 1. DROP TRIGGERS
    // ========================================
    console.log('📌 Step 1: Dropping triggers...');
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_chunk_search_vector ON document_chunks;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS chunks_search_vector_trigger ON document_chunks;
    `);
    console.log('   ✓ Triggers dropped\n');

    // ========================================
    // 2. DROP FUNCTIONS
    // ========================================
    console.log('📌 Step 2: Dropping functions...');
    
    await client.query(`
      DROP FUNCTION IF EXISTS update_chunk_search_vector() CASCADE;
    `);
    
    await client.query(`
      DROP FUNCTION IF EXISTS chunks_search_vector_update() CASCADE;
    `);
    console.log('   ✓ Functions dropped\n');

    // ========================================
    // 3. DROP FOREIGN KEYS
    // ========================================
    console.log('📌 Step 3: Dropping foreign keys...');
    
    await client.query(`
      ALTER TABLE document_chunks 
      DROP CONSTRAINT IF EXISTS "FK_document_chunks_documentId";
    `);
    console.log('   ✓ Foreign keys dropped\n');

    // ========================================
    // 4. DROP INDEXES
    // ========================================
    console.log('📌 Step 4: Dropping indexes...');
    
    // From CreateAITables migration
    await client.query(`DROP INDEX IF EXISTS idx_chunks_embedding;`);
    await client.query(`DROP INDEX IF EXISTS idx_chunks_fts;`);
    await client.query(`DROP INDEX IF EXISTS idx_chunks_index;`);
    await client.query(`DROP INDEX IF EXISTS idx_chunks_document;`);
    
    // From EnhanceFullTextSearch migration
    await client.query(`DROP INDEX IF EXISTS idx_chunks_fts_gin;`);
    await client.query(`DROP INDEX IF EXISTS idx_chunks_content_trgm;`);
    await client.query(`DROP INDEX IF EXISTS idx_chunks_document_fts;`);
    console.log('   ✓ All indexes dropped\n');

    // ========================================
    // 5. DROP TABLE
    // ========================================
    console.log('📌 Step 5: Dropping document_chunks table...');
    
    await client.query(`DROP TABLE IF EXISTS document_chunks CASCADE;`);
    console.log('   ✓ Table dropped\n');

    // ========================================
    // 6. VERIFICATION
    // ========================================
    console.log('📌 Step 6: Verifying...');
    
    const tableCheck = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'document_chunks';
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('   ✓ Verified: document_chunks table does not exist\n');
    } else {
      console.log('   ⚠️  Warning: document_chunks table still exists!\n');
    }

    // List remaining tables
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    console.log('📊 Remaining tables in database:');
    tables.rows.forEach((row) => {
      console.log(`   - ${row.tablename}`);
    });

    await client.end();

    console.log('\n✅ Successfully dropped document_chunks table and all related objects!');
    console.log('\n📝 Next steps:');
    console.log('   1. Delete entity: apps/api/src/modules/ai/entities/document-chunk.entity.ts');
    console.log('   2. Delete/refactor services that use DocumentChunk');
    console.log('   3. Refactor AIOrchestrator to skip Layer 2 RAG');
    console.log('   4. Update frontend components');
    console.log('\n✅ DONE!\n');

  } catch (error) {
    console.error('❌ Error dropping document_chunks table:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    await client.end();
    process.exit(1);
  }
}

// Run the script
dropDocumentChunksTable();
