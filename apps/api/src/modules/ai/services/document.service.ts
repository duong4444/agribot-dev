import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Document, DocumentStatus, DocumentCategory } from '../entities/document.entity';
// REMOVED: import { DocumentChunk } from '../entities/document-chunk.entity';
import { CropKnowledgeChunk } from '../entities/crop-knowledge-chunk.entity';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto, ChunkQueryDto } from '../dto/document.dto';
import { TextExtractionService } from './text-extraction.service';
// REMOVED: import { ChunkingService } from './chunking.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly uploadDir = process.env.UPLOAD_PATH || './uploads';

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    // REMOVED: @InjectRepository(DocumentChunk) private readonly chunkRepo
    @InjectRepository(CropKnowledgeChunk)
    private readonly cropKnowledgeChunkRepo: Repository<CropKnowledgeChunk>,
    private readonly textExtraction: TextExtractionService,
    // REMOVED: private readonly chunking: ChunkingService,
  ) {
    // Tạo thư mục upload nếu chưa có
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload và xử lý tài liệu
   */
  async uploadAndProcess(
    file: Express.Multer.File,
    createDocumentDto: CreateDocumentDto,
  ): Promise<Document> {
    const startTime = Date.now();
    
    // Ensure filename is properly encoded in UTF-8 and sanitized
    let originalName = file.originalname;
    try {
      // Try to fix encoding if it's corrupted
      if (originalName.includes('?')) {
        const buffer = Buffer.from(originalName, 'latin1');
        originalName = buffer.toString('utf8');
      }
    } catch (error) {
      this.logger.warn('Could not fix filename encoding:', error);
    }
    
    // Sanitize filename to prevent path traversal
    originalName = this.sanitizeFilename(originalName);
    
    this.logger.log(`Bắt đầu xử lý file: ${originalName}`);

    // 1. Lưu file vào disk
    const filename = `${randomUUID()}_${originalName}`;
    const filepath = path.join(this.uploadDir, filename);
    
    try {
      fs.writeFileSync(filepath, file.buffer);
      this.logger.log(`Đã lưu file: ${filepath}`);
    } catch (error) {
      throw new BadRequestException(`Lỗi lưu file: ${error.message}`);
    }

    // 2. Tạo document record
    const document = this.documentRepo.create({
      filename,
      originalName,
      filepath,
      mimeType: file.mimetype,
      size: file.size,
      category: createDocumentDto.category,
      tags: createDocumentDto.tags || [],
      language: createDocumentDto.language || 'vi',
      processingStatus: DocumentStatus.PROCESSING,
      indexed: false,
      chunkCount: 0,
    });

    const savedDocument = await this.documentRepo.save(document);
    this.logger.log(`Đã tạo document record: ${savedDocument.id}`);

    // 3. Xử lý bất đồng bộ
    this.processDocumentAsync(savedDocument.id, filepath);

    return savedDocument;
  }

  /**
   * Xử lý tài liệu bất đồng bộ
   */
  private async processDocumentAsync(documentId: string, filepath: string): Promise<void> {
    const startTime = Date.now(); // FIX: Track start time properly
    
    try {
      this.logger.log(`Bắt đầu xử lý bất đồng bộ: ${documentId}`);

      // 1. Extract text từ file với timeout
      const extractionTimeout = 5 * 60 * 1000; // 5 minutes
      const rawText = await Promise.race([
        this.textExtraction.extractText(filepath),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Text extraction timeout')), extractionTimeout)
        )
      ]);
      
      this.logger.log(`Đã extract text: ${rawText.length} ký tự`);

      // Validate extracted text
      if (!rawText || rawText.trim().length < 10) {
        throw new Error('Extracted text is empty or too short');
      }

      // 2. Cập nhật rawText
      await this.documentRepo.update(documentId, { rawText });

      // REMOVED: Chunking logic (Layer 2 RAG disabled)
      // 3. Cập nhật trạng thái thành công (without chunks)
      const processingTime = Date.now() - startTime;
      await this.documentRepo.update(documentId, {
        processingStatus: DocumentStatus.COMPLETED,
        indexed: true,
        chunkCount: 0, // No chunks created in 2-layer architecture
        processedAt: new Date(),
      });

      this.logger.log(
        `✅ Document ${documentId} processed (text extracted only, no chunking) in ${processingTime}ms`
      );

      this.logger.log(`✅ Hoàn thành xử lý document ${documentId} trong ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Lỗi xử lý document ${documentId} sau ${processingTime}ms:`, error);
      
      // Cập nhật trạng thái lỗi với error message
      await this.documentRepo.update(documentId, {
        processingStatus: DocumentStatus.FAILED,
        // TODO: Add errorMessage field to entity
      });

      // TODO: Send notification to admin về failed processing
    }
  }

  /**
   * Lấy danh sách tài liệu với filter và phân trang
   */
  async findAll(query: DocumentQueryDto): Promise<{
    documents: Document[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search, category, status, language, tags, sortBy = 'createdAt', sortOrder = 'DESC', indexedOnly } = query;
    
    const queryBuilder = this.documentRepo.createQueryBuilder('document');

    // Filters
    if (search) {
      queryBuilder.andWhere(
        '(document.originalName ILIKE :search OR document.filename ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere('document.category = :category', { category });
    }

    if (status) {
      queryBuilder.andWhere('document.processingStatus = :status', { status });
    }

    if (language) {
      queryBuilder.andWhere('document.language = :language', { language });
    }

    if (indexedOnly) {
      queryBuilder.andWhere('document.indexed = :indexed', { indexed: true });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('document.tags && :tags', { tags });
    }

    // Sorting
    queryBuilder.orderBy(`document.${sortBy}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [documents, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      documents,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Lấy tài liệu theo ID
   */
  async findById(id: string): Promise<Document | null> {
    return this.documentRepo.findOne({ where: { id } });
  }

  /**
   * REMOVED: Get document chunks (Layer 2 RAG disabled)
   */
  // async getDocumentChunks(documentId: string, query: ChunkQueryDto) {
  //   throw new BadRequestException('Document chunks feature is disabled in 2-layer architecture');
  // }

  /**
   * Cập nhật tài liệu
   */
  async update(id: string, updateDto: UpdateDocumentDto): Promise<Document | null> {
    const document = await this.findById(id);
    if (!document) return null;

    await this.documentRepo.update(id, updateDto);
    return this.findById(id);
  }

  /**
   * Xóa tài liệu và tất cả chunks
   */
  async delete(id: string): Promise<boolean> {
    const document = await this.findById(id);
    if (!document) return false;

    // Xóa file vật lý
    try {
      if (fs.existsSync(document.filepath)) {
        fs.unlinkSync(document.filepath);
        this.logger.log(`Đã xóa file: ${document.filepath}`);
      }
    } catch (error) {
      this.logger.warn(`Không thể xóa file: ${document.filepath}`, error);
    }

    // REMOVED: Chunk deletion (no chunks in 2-layer architecture)
    // Xóa document
    await this.documentRepo.delete(id);
    
    this.logger.log(`Đã xóa document: ${id}`);
    return true;
  }

  /**
   * REMOVED: Reprocess document (Layer 2 RAG disabled)
   * In 2-layer architecture, documents only need text extraction, no chunking
   */
  async reprocess(id: string): Promise<Document | null> {
    const document = await this.findById(id);
    if (!document) return null;

    // REMOVED: Chunk deletion (no chunks created)
    // Cập nhật trạng thái
    await this.documentRepo.update(id, {
      processingStatus: DocumentStatus.PROCESSING,
      indexed: false,
      chunkCount: 0,
    });

    // Xử lý lại (text extraction only)
    this.processDocumentAsync(id, document.filepath);

    return this.findById(id);
  }

  /**
   * Thống kê tài liệu
   */
  async getStats(): Promise<{
    totalDocuments: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    totalChunks: number;
    avgChunksPerDocument: number;
    totalSize: number;
  }> {
    const [
      totalDocuments,
      statusStats,
      categoryStats,
      totalChunks,
      sizeStats,
    ] = await Promise.all([
      this.documentRepo.count(),
      this.documentRepo
        .createQueryBuilder('document')
        .select('document.processingStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('document.processingStatus')
        .getRawMany(),
      this.documentRepo
        .createQueryBuilder('document')
        .select('document.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .groupBy('document.category')
        .getRawMany(),
      this.cropKnowledgeChunkRepo.count(), // Count from Layer 1 FTS chunks (crop_knowledge_chunks)
      this.documentRepo
        .createQueryBuilder('document')
        .select('SUM(document.size)', 'totalSize')
        .getRawOne(),
    ]);

    const byStatus = statusStats.reduce((acc, item) => {
      // Convert lowercase status to UPPERCASE to match frontend enum
      acc[item.status.toUpperCase()] = parseInt(item.count);
      return acc;
    }, {});

    const byCategory = categoryStats.reduce((acc, item) => {
      // Convert to UPPERCASE for consistency (frontend may expect UPPERCASE keys)
      acc[item.category.toUpperCase()] = parseInt(item.count);
      return acc;
    }, {});

    return {
      totalDocuments,
      byStatus,
      byCategory,
      totalChunks,
      avgChunksPerDocument: totalDocuments > 0 ? totalChunks / totalDocuments : 0,
      totalSize: parseInt(sizeStats.totalSize) || 0,
    };
  }

  /**
   * Xóa nhiều tài liệu
   */
  async bulkDelete(ids: string[]): Promise<{ deletedCount: number; errors: string[] }> {
    let deletedCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const success = await this.delete(id);
        if (success) {
          deletedCount++;
        } else {
          errors.push(`Không tìm thấy document: ${id}`);
        }
      } catch (error) {
        errors.push(`Lỗi xóa document ${id}: ${error.message}`);
      }
    }

    return { deletedCount, errors };
  }

  /**
   * Sanitize filename to prevent path traversal and other security issues
   */
  private sanitizeFilename(filename: string): string {
    // Remove path separators
    filename = filename.replace(/[\/\\]/g, '_');
    
    // Remove potentially dangerous characters
    filename = filename.replace(/[<>:"|?*\x00-\x1f]/g, '_');
    
    // Remove leading/trailing dots and spaces
    filename = filename.replace(/^\.+/, '').replace(/\.+$/, '').trim();
    
    // Limit length
    const maxLength = 200;
    if (filename.length > maxLength) {
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      filename = base.substring(0, maxLength - ext.length) + ext;
    }
    
    // Ensure filename is not empty
    if (!filename || filename === '') {
      filename = 'untitled';
    }
    
    return filename;
  }

  /**
   * Validate file magic bytes (not just MIME type)
   */
  private async validateFileType(filepath: string, mimeType: string): Promise<boolean> {
    try {
      const buffer = fs.readFileSync(filepath);
      const magic = buffer.toString('hex', 0, 4);
      
      const validMagicBytes: Record<string, string[]> = {
        'application/pdf': ['25504446'], // %PDF
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504b0304'], // PK (ZIP)
        'text/plain': [], // Any bytes OK for text
      };
      
      if (validMagicBytes[mimeType]) {
        if (validMagicBytes[mimeType].length === 0) return true;
        return validMagicBytes[mimeType].some(m => magic.startsWith(m));
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error validating file type:', error);
      return false;
    }
  }
}

