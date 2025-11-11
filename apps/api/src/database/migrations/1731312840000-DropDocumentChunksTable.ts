import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Drop document_chunks table
 * 
 * Purpose: Remove Layer 2 RAG document chunks table completely
 * This will drop all related triggers, functions, indexes, and the table itself
 * 
 * WARNING: This is a destructive operation!
 * All data in document_chunks will be permanently deleted.
 */
export class DropDocumentChunksTable1731312840000 implements MigrationInterface {
  name = 'DropDocumentChunksTable1731312840000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🗑️  Starting to drop document_chunks table and related objects...');

    // ========================================
    // 1. DROP TRIGGERS
    // ========================================
    console.log('Dropping triggers...');
    
    // Drop trigger from EnhanceFullTextSearch migration
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_chunk_search_vector ON "document_chunks";
    `);
    
    // Drop trigger from CreateAITables migration
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS chunks_search_vector_trigger ON "document_chunks";
    `);

    // ========================================
    // 2. DROP FUNCTIONS
    // ========================================
    console.log('Dropping functions...');
    
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_chunk_search_vector();
    `);
    
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS chunks_search_vector_update();
    `);

    // ========================================
    // 3. DROP FOREIGN KEYS
    // ========================================
    console.log('Dropping foreign keys...');
    
    await queryRunner.query(`
      ALTER TABLE "document_chunks" 
      DROP CONSTRAINT IF EXISTS "FK_document_chunks_documentId";
    `);

    // ========================================
    // 4. DROP INDEXES
    // ========================================
    console.log('Dropping indexes...');
    
    // From CreateAITables migration
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_embedding"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_fts"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_index"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_document"`);
    
    // From EnhanceFullTextSearch migration
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_fts_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_content_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_document_fts"`);

    // ========================================
    // 5. DROP TABLE
    // ========================================
    console.log('Dropping document_chunks table...');
    
    await queryRunner.query(`DROP TABLE IF EXISTS "document_chunks" CASCADE;`);

    console.log('✅ Successfully dropped document_chunks table and all related objects!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️  Rolling back: Recreating document_chunks table...');

    // Recreate document_chunks table
    await queryRunner.query(`
      CREATE TABLE "document_chunks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "chunkIndex" integer NOT NULL,
        "pageNumber" integer,
        "startPosition" integer,
        "endPosition" integer,
        "tokenCount" integer NOT NULL,
        "embedding" vector(768),
        "searchVector" tsvector,
        "metadata" jsonb,
        "documentId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_chunks" PRIMARY KEY ("id")
      )
    `);

    // Recreate indexes
    await queryRunner.query(
      `CREATE INDEX "idx_chunks_document" ON "document_chunks" ("documentId")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_chunks_index" ON "document_chunks" ("chunkIndex")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_chunks_fts" ON "document_chunks" USING GIN ("searchVector")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_chunks_embedding" ON "document_chunks" USING ivfflat ("embedding" vector_cosine_ops)`
    );

    // Recreate foreign key
    await queryRunner.query(`
      ALTER TABLE "document_chunks" 
      ADD CONSTRAINT "FK_document_chunks_documentId" 
      FOREIGN KEY ("documentId") 
      REFERENCES "documents"("id") 
      ON DELETE CASCADE
    `);

    // Recreate trigger function
    await queryRunner.query(`
      CREATE FUNCTION chunks_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.searchVector := to_tsvector('vietnamese', coalesce(NEW.content, ''));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    // Recreate trigger
    await queryRunner.query(`
      CREATE TRIGGER chunks_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "document_chunks"
      FOR EACH ROW EXECUTE FUNCTION chunks_search_vector_update();
    `);

    console.log('✅ Rollback completed: document_chunks table restored!');
  }
}
