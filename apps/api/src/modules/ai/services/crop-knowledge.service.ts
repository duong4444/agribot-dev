import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus, DocumentCategory } from '../entities/document.entity';
import { CropKnowledgeChunk } from '../entities/crop-knowledge-chunk.entity';
import { MarkdownChunkingService } from './markdown-chunking.service';

/**
 * Crop Knowledge Service
 * 
 * Handles upload, processing, and management of crop knowledge documents
 */

export interface UploadResult {
  documentId: string;
  filename: string;
  chunksCreated: number;
  cropType: string;
  topics: string[];
  processingTime: number;
}

@Injectable()
export class CropKnowledgeService {
  private readonly logger = new Logger(CropKnowledgeService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(CropKnowledgeChunk)
    private readonly chunkRepo: Repository<CropKnowledgeChunk>,
    private readonly chunkingService: MarkdownChunkingService,
  ) {}

  /**
   * Upload and process crop knowledge markdown file
   */
  async uploadCropKnowledge(params: {
    filename: string;
    content: string;
    userId: string;
    category?: string;
    tags?: string[];
  }): Promise<UploadResult> {
    const startTime = Date.now();
    const { filename, content, userId, category, tags } = params;

    this.logger.log(`Uploading crop knowledge: ${filename}`);

    try {
      // 1. Parse markdown to chunks
      const chunks = await this.chunkingService.parseMarkdownToChunks(
        filename,
        content,
      );

      if (chunks.length === 0) {
        throw new BadRequestException('No valid chunks could be extracted from the file');
      }

      // 2. Validate chunks
      const validation = this.chunkingService.validateChunks(chunks);
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid chunks: ${validation.issues.join(', ')}`,
        );
      }

      // 3. Create document record
      const document = await this.documentRepo.save({
        filename,
        originalName: filename,
        filepath: `uploads/crop_knowledge/${filename}`,
        mimeType: 'text/markdown',
        size: content.length,
        rawText: content,
        userId,
        category: DocumentCategory.CROP_CARE,
        tags: tags || [],
        processingStatus: DocumentStatus.PROCESSING,
        chunkCount: chunks.length,
      });

      // 4. Save chunks to database
      const chunkEntities = chunks.map(chunk => ({
        chunkId: chunk.id,
        loaiCay: chunk.loai_cay,
        nguon: chunk.nguon,
        chuDeLon: chunk.chu_de_lon,
        tieuDeChunk: chunk.tieu_de_chunk,
        noiDung: chunk.noi_dung,
        thuTu: chunk.thu_tu,
        metadata: chunk.metadata,
        documentId: document.id,
        userId,
        status: 'active' as const,
      }));

      await this.chunkRepo.save(chunkEntities);

      // 5. Update document status
      await this.documentRepo.update(document.id, {
        processingStatus: DocumentStatus.COMPLETED,
        processedAt: new Date(),
        indexed: true,
      });

      // 6. Get unique topics
      const topics = [...new Set(chunks.map(c => c.chu_de_lon))];

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Successfully uploaded ${filename}: ${chunks.length} chunks in ${processingTime}ms`,
      );

      return {
        documentId: document.id,
        filename,
        chunksCreated: chunks.length,
        cropType: chunks[0].loai_cay,
        topics,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Failed to upload ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Preview chunks without saving
   */
  async previewMarkdownChunks(
    filename: string,
    content: string,
  ): Promise<{
    chunks: any[];
    preview: string;
    validation: { valid: boolean; issues: string[] };
  }> {
    const chunks = await this.chunkingService.parseMarkdownToChunks(
      filename,
      content,
    );

    const validation = this.chunkingService.validateChunks(chunks);
    const preview = this.chunkingService.generatePreview(chunks);

    return {
      chunks: chunks.map(c => ({
        id: c.id,
        loai_cay: c.loai_cay,
        chu_de_lon: c.chu_de_lon,
        tieu_de_chunk: c.tieu_de_chunk,
        noi_dung_preview: c.noi_dung.substring(0, 150) + '...',
        metadata: c.metadata,
      })),
      preview,
      validation,
    };
  }

  /**
   * List all crop knowledge documents
   */
  async listCropKnowledge(userId?: string): Promise<any[]> {
    const queryBuilder = this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.category = :category', { category: DocumentCategory.CROP_CARE })
      .andWhere('doc.processingStatus = :status', { status: DocumentStatus.COMPLETED });

    if (userId) {
      queryBuilder.andWhere('doc.userId = :userId', { userId });
    }

    const documents = await queryBuilder.getMany();

    // Get chunk counts
    const documentIds = documents.map(d => d.id);
    const chunkCounts = await this.chunkRepo
      .createQueryBuilder('chunk')
      .select('chunk.documentId', 'documentId')
      .addSelect('COUNT(*)', 'count')
      .where('chunk.documentId IN (:...ids)', { ids: documentIds })
      .groupBy('chunk.documentId')
      .getRawMany();

    const countMap = chunkCounts.reduce((acc, item) => {
      acc[item.documentId] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    return documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      cropType: doc.filename.replace(/\.(md|markdown)$/i, '').replace(/_/g, ' '),
      chunkCount: countMap[doc.id] || doc.chunkCount || 0,
      uploadedAt: doc.createdAt,
      status: doc.processingStatus,
    }));
  }

  /**
   * Get document details with chunks
   */
  async getCropKnowledgeDetails(documentId: string): Promise<any> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    const chunks = await this.chunkRepo.find({
      where: { documentId },
      order: { thuTu: 'ASC' },
    });

    // Group chunks by topic
    const groupedChunks = chunks.reduce((acc, chunk) => {
      if (!acc[chunk.chuDeLon]) {
        acc[chunk.chuDeLon] = [];
      }
      acc[chunk.chuDeLon].push({
        id: chunk.chunkId,
        title: chunk.tieuDeChunk,
        contentPreview: chunk.noiDung.substring(0, 200) + '...',
        order: chunk.thuTu,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return {
      document: {
        id: document.id,
        filename: document.filename,
        cropType: document.filename.replace(/\.(md|markdown)$/i, '').replace(/_/g, ' '),
        uploadedAt: document.createdAt,
        status: document.processingStatus,
      },
      chunks: {
        total: chunks.length,
        byTopic: groupedChunks,
      },
    };
  }

  /**
   * Delete crop knowledge document and its chunks
   */
  async deleteCropKnowledge(documentId: string): Promise<void> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    // Chunks will be deleted automatically due to CASCADE
    await this.documentRepo.remove(document);

    this.logger.log(`🗑️ Deleted crop knowledge: ${document.filename}`);
  }

  /**
   * Re-index document (re-process chunks)
   */
  async reindexCropKnowledge(documentId: string): Promise<void> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    this.logger.log(`🔄 Re-indexing: ${document.filename}`);

    // Delete existing chunks
    await this.chunkRepo.delete({ documentId });

    // Re-process
    const chunks = await this.chunkingService.parseMarkdownToChunks(
      document.filename,
      document.rawText,
    );

    // Save new chunks
    const chunkEntities = chunks.map(chunk => ({
      chunkId: chunk.id,
      loaiCay: chunk.loai_cay,
      nguon: chunk.nguon,
      chuDeLon: chunk.chu_de_lon,
      tieuDeChunk: chunk.tieu_de_chunk,
      noiDung: chunk.noi_dung,
      thuTu: chunk.thu_tu,
      metadata: chunk.metadata,
      documentId: document.id,
      userId: document.userId,
      status: 'active' as const,
    }));

    await this.chunkRepo.save(chunkEntities);

    this.logger.log(`✅ Re-indexed ${chunks.length} chunks`);
  }
}
