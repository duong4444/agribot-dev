import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAITables1234567890123 implements MigrationInterface {
  name = 'CreateAITables1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Create documents table
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "filename" character varying NOT NULL,
        "originalName" character varying NOT NULL,
        "filepath" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "size" integer NOT NULL,
        "rawText" text,
        "processingStatus" character varying NOT NULL DEFAULT 'pending',
        "indexed" boolean NOT NULL DEFAULT false,
        "category" character varying,
        "tags" text,
        "language" character varying NOT NULL DEFAULT 'vi',
        "chunkCount" integer NOT NULL DEFAULT 0,
        "searchVector" tsvector,
        "userId" uuid,
        "processedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents" PRIMARY KEY ("id")
      )
    `);

    // Create document_chunks table
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

    // Create indexes for documents
    await queryRunner.query(
      `CREATE INDEX "idx_documents_filename" ON "documents" ("filename")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_documents_category" ON "documents" ("category")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_documents_status" ON "documents" ("processingStatus")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_documents_user" ON "documents" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_documents_fts" ON "documents" USING GIN ("searchVector")`
    );

    // Create indexes for document_chunks
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

    // Add foreign key
    await queryRunner.query(`
      ALTER TABLE "document_chunks" 
      ADD CONSTRAINT "FK_document_chunks_documentId" 
      FOREIGN KEY ("documentId") 
      REFERENCES "documents"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD CONSTRAINT "FK_documents_userId" 
      FOREIGN KEY ("userId") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);

    // Create triggers for automatic tsvector updates
    await queryRunner.query(`
      CREATE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.searchVector := 
          setweight(to_tsvector('vietnamese', coalesce(NEW.filename, '')), 'A') ||
          setweight(to_tsvector('vietnamese', coalesce(NEW.rawText, '')), 'B');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER documents_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "documents"
      FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();
    `);

    await queryRunner.query(`
      CREATE FUNCTION chunks_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.searchVector := to_tsvector('vietnamese', coalesce(NEW.content, ''));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER chunks_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "document_chunks"
      FOR EACH ROW EXECUTE FUNCTION chunks_search_vector_update();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS chunks_search_vector_trigger ON "document_chunks"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS chunks_search_vector_update()`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS documents_search_vector_trigger ON "documents"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS documents_search_vector_update()`);

    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "FK_documents_userId"`);
    await queryRunner.query(`ALTER TABLE "document_chunks" DROP CONSTRAINT IF EXISTS "FK_document_chunks_documentId"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_embedding"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_fts"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_index"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_document"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_fts"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_filename"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "document_chunks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`);
  }
}



