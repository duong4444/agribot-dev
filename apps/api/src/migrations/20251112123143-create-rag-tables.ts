import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRagTables20251112123143 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // Create rag_documents table
    await queryRunner.query(`
      CREATE TABLE rag_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        filepath VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50),
        tags TEXT[],
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        processing_status VARCHAR(20) DEFAULT 'pending',
        chunk_count INTEGER DEFAULT 0,
        embedding_generated BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      );
    `);

    // Create indexes for rag_documents
    await queryRunner.query(`
      CREATE INDEX idx_rag_documents_user_id ON rag_documents(user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_rag_documents_status ON rag_documents(processing_status);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_rag_documents_category ON rag_documents(category);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_rag_documents_created_at ON rag_documents(created_at DESC);
    `);

    // Create rag_chunks table
    await queryRunner.query(`
      CREATE TABLE rag_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rag_document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        start_position INTEGER NOT NULL,
        end_position INTEGER NOT NULL,
        embedding TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Add vector column using ALTER TABLE (pgvector type)
    await queryRunner.query(`
      ALTER TABLE rag_chunks 
      ALTER COLUMN embedding TYPE vector(768) 
      USING embedding::vector;
    `);

    // Create indexes for rag_chunks
    await queryRunner.query(`
      CREATE INDEX idx_rag_chunks_document_id ON rag_chunks(rag_document_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_rag_chunks_chunk_index ON rag_chunks(rag_document_id, chunk_index);
    `);

    // Create vector index (HNSW for best performance)
    await queryRunner.query(`
      CREATE INDEX idx_rag_chunks_embedding_hnsw 
      ON rag_chunks 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rag_chunks CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rag_documents CASCADE;`);
  }
}
