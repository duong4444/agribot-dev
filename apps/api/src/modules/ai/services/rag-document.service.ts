import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagDocument, RagDocumentStatus } from '../entities/rag-document.entity';
import { RagChunk } from '../entities/rag-chunk.entity';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { TextExtractionService } from './text-extraction.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface CreateRagDocumentDto {
  category?: string;
  tags?: string[];
}

@Injectable()
export class RagDocumentService {
  private readonly logger = new Logger(RagDocumentService.name);
  private readonly uploadDir = process.env.RAG_UPLOAD_PATH || './uploads/rag';

  constructor(
    @InjectRepository(RagDocument)
    private readonly ragDocumentRepo: Repository<RagDocument>,
    @InjectRepository(RagChunk)
    private readonly ragChunkRepo: Repository<RagChunk>,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
    private readonly textExtractionService: TextExtractionService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload và xử lý RAG document
   */
  async uploadAndProcess(
    file: Express.Multer.File,
    dto: CreateRagDocumentDto,
    userId: string,
  ): Promise<RagDocument> {
    // Validate file type (.txt and .pdf)
    const allowedMimeTypes = ['text/plain', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only .txt and .pdf files are supported');
    }

    this.logger.log(`Uploading RAG document: ${file.originalname}`);

    // 1. Save file
    const filename = `${randomUUID()}_${file.originalname}`;
    const filepath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    // 2. Extract content based on file type
    let content: string;
    if (file.mimetype === 'application/pdf') {
      this.logger.log('Extracting text from PDF...');
      content = await this.textExtractionService.extractText(filepath);
    } else {
      // Text file
      content = file.buffer.toString('utf-8');
    }
    // lấy content từ file sau đó save vào rag_documents

    // 3. Create document record
    const document = this.ragDocumentRepo.create({
      filename,
      originalName: file.originalname,
      filepath,
      content,
      category: dto.category,
      tags: dto.tags || [],
      userId,
      processingStatus: RagDocumentStatus.PROCESSING,
      metadata: {
        fileSize: file.size,
        language: 'vi',
        embeddingModel: 'dangvantuan/vietnamese-document-embedding',
        chunkingStrategy: 'sentence-based',
      },
    });

    const savedDocument = await this.ragDocumentRepo.save(document);
    this.logger.log(`Created RAG document: ${savedDocument.id}`);

    // 4. Process async
    this.processDocumentAsync(savedDocument.id, content);

    return savedDocument;
  }

  /**
   * Process document: chunk + embed + save
   */
  private async processDocumentAsync(documentId: string, content: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing RAG document ${documentId}`);

      // STEP 1: Chunking
      this.logger.log('Chunking document...');
      const chunks = await this.chunkingService.chunkDocument(content, {
        maxChunkSize: 2000, // Increased for long-context model (8096 tokens support)
        overlapSentences: 5, // High overlap (25% of ~20 sentences per chunk) for maximum context preservation
        minChunkSize: 200,
      });

      this.logger.log(`Created ${chunks.length} chunks`);

      // STEP 2: Generate embeddings (batch)
      this.logger.log('Generating embeddings...');
      const embeddings = await this.embeddingService.generateEmbeddingsBatch(
        chunks.map(c => c.content),
        32, // batch size
      );

      this.logger.log(`Generated ${embeddings.length} embeddings`);

      // STEP 3: Save chunks to database
      this.logger.log('Saving chunks to database...');
      
      // Save chunks one by one to handle vector conversion properly
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const embedding = embeddings[idx];
        
        // Convert embedding array to pgvector format string
        const embeddingStr = `[${embedding.join(',')}]`;
        
        // Use raw query to insert with proper vector type
        await this.ragChunkRepo.query(
          `INSERT INTO rag_chunks 
           (rag_document_id, content, chunk_index, start_position, end_position, embedding, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6::vector, $7)`,
          [
            documentId,
            chunk.content,
            idx,
            chunk.startPosition,
            chunk.endPosition,
            embeddingStr,
            JSON.stringify({
              tokens: chunk.tokens,
              language: 'vi',
            }),
          ],
        );
      }
      
      this.logger.log(`Saved ${chunks.length} chunks to database`);

      // STEP 4: Update document status
      await this.ragDocumentRepo.update(documentId, {
        processingStatus: RagDocumentStatus.COMPLETED,
        chunkCount: chunks.length,
        embeddingGenerated: true,
        processedAt: new Date(),
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ RAG document ${documentId} processed in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Error processing RAG document ${documentId} after ${processingTime}ms:`, error);

      await this.ragDocumentRepo.update(documentId, {
        processingStatus: RagDocumentStatus.FAILED,
      });
    }
  }

  /**
   * List RAG documents
   */
  async findAll(userId?: string): Promise<RagDocument[]> {
    const query = this.ragDocumentRepo.createQueryBuilder('doc');

    if (userId) {
      query.where('doc.userId = :userId', { userId });
    }

    return query
      .orderBy('doc.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get document by ID
   */
  async findById(id: string): Promise<RagDocument | null> {
    return this.ragDocumentRepo.findOne({ where: { id } });
  }

  /**
   * Delete document and all chunks
   */
  async delete(id: string): Promise<boolean> {
    const document = await this.findById(id);
    if (!document) return false;

    // Delete file
    try {
      if (fs.existsSync(document.filepath)) {
        fs.unlinkSync(document.filepath);
      }
    } catch (error) {
      this.logger.warn(`Cannot delete file: ${document.filepath}`, error);
    }

    // Delete document (chunks will be cascade deleted)
    await this.ragDocumentRepo.delete(id);

    this.logger.log(`Deleted RAG document: ${id}`);
    return true;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    byStatus: Record<string, number>;
  }> {
    const [totalDocuments, totalChunks, statusStats] = await Promise.all([
      this.ragDocumentRepo.count(),
      this.ragChunkRepo.count(),
      this.ragDocumentRepo
        .createQueryBuilder('doc')
        .select('doc.processingStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('doc.processingStatus')
        .getRawMany(),
    ]);

    const byStatus = statusStats.reduce((acc, item) => {
      acc[item.status.toUpperCase()] = parseInt(item.count);
      return acc;
    }, {});

    return {
      totalDocuments,
      totalChunks,
      byStatus,
    };
  }
}
