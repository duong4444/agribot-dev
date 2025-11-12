import { AppDataSource } from '../src/database/data-source';

async function enablePgVector() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    
    console.log('Enabling pgvector extension...');
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
    
    console.log('✅ pgvector extension enabled successfully!');
    
    // Verify
    const result = await AppDataSource.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);
    
    if (result.length > 0) {
      console.log('✅ Verified: pgvector extension is installed');
    } else {
      console.log('❌ Warning: pgvector extension not found');
    }
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

enablePgVector();
