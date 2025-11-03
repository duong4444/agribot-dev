import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { Document } from '../entities/document.entity';

export interface ChunkingOptions {
  maxChunkSize?: number;
  overlapSize?: number;
  preserveParagraphs?: boolean;
  minChunkSize?: number;
}

export interface ChunkMetadata {
  documentFilename?: string;
  category?: string;
  tags?: string[];
  language?: string;
  pageNumber?: number;
  section?: string;
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  /**
   * Tạo chunks từ text và lưu vào database
   */
  async createChunks(
    text: string,
    documentId: string,
    options: ChunkingOptions = {},
  ): Promise<DocumentChunk[]> {
    const startTime = Date.now();
    this.logger.log(`Bắt đầu chunking cho document: ${documentId}`);

    // Lấy thông tin document
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) {
      throw new Error('Document không tồn tại');
    }

    // Cấu hình mặc định
    const config = {
      maxChunkSize: 1000,
      overlapSize: 100,
      preserveParagraphs: true,
      minChunkSize: 100,
      ...options,
    };

    // Tạo chunks
    const textChunks = this.splitTextIntoChunks(text, config);
    this.logger.log(`Đã tạo ${textChunks.length} text chunks`);

    // Tạo metadata
    const metadata: ChunkMetadata = {
      documentFilename: document.originalName,
      category: document.category,
      tags: document.tags,
      language: document.language,
    };

    // Lưu chunks vào database
    const savedChunks: DocumentChunk[] = [];
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      
      // Tính token count (ước tính)
      const tokenCount = this.estimateTokenCount(chunk.content);
      
      const chunkEntity = this.chunkRepo.create({
        content: chunk.content,
        chunkIndex: i,
        pageNumber: chunk.pageNumber,
        startPosition: chunk.startPosition,
        endPosition: chunk.endPosition,
        tokenCount,
        metadata: {
          ...metadata,
          section: chunk.section,
        },
        documentId,
      });

      const savedChunk = await this.chunkRepo.save(chunkEntity);
      savedChunks.push(savedChunk);
    }

    const processingTime = Date.now() - startTime;
    this.logger.log(`Hoàn thành chunking trong ${processingTime}ms: ${savedChunks.length} chunks`);

    return savedChunks;
  }

  /**
   * Chia text thành chunks
   */
  private splitTextIntoChunks(
    text: string,
    options: ChunkingOptions,
  ): Array<{
    content: string;
    startPosition: number;
    endPosition: number;
    pageNumber?: number;
    section?: string;
  }> {
    const { maxChunkSize, overlapSize, preserveParagraphs, minChunkSize } = options;
    const chunks: Array<{
      content: string;
      startPosition: number;
      endPosition: number;
      pageNumber?: number;
      section?: string;
    }> = [];

    if (preserveParagraphs) {
      return this.splitByParagraphs(text, maxChunkSize!, overlapSize!, minChunkSize!);
    } else {
      return this.splitByFixedSize(text, maxChunkSize!, overlapSize!);
    }
  }

  /**
   * Chia theo đoạn văn (preserve paragraphs)
   */
  private splitByParagraphs(
    text: string,
    maxChunkSize: number,
    overlapSize: number,
    minChunkSize: number,
  ) {
    const chunks: Array<{
      content: string;
      startPosition: number;
      endPosition: number;
      pageNumber?: number;
      section?: string;
    }> = [];

    // Chia theo đoạn văn
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let currentStartPos = 0;
    let currentEndPos = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      // Nếu đoạn văn quá dài, chia nhỏ
      if (paragraph.length > maxChunkSize) {
        // Lưu chunk hiện tại nếu có
        if (currentChunk.length >= minChunkSize) {
          chunks.push({
            content: currentChunk.trim(),
            startPosition: currentStartPos,
            endPosition: currentEndPos,
          });
        }
        
        // Chia đoạn văn dài
        const subChunks = this.splitLongParagraph(paragraph, maxChunkSize, overlapSize);
        chunks.push(...subChunks);
        
        // Reset
        currentChunk = '';
        currentStartPos = text.indexOf(paragraph) + paragraph.length;
        currentEndPos = currentStartPos;
        continue;
      }
      
      // Kiểm tra nếu thêm đoạn này vào chunk hiện tại có vượt quá maxSize không
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
      
      if (potentialChunk.length <= maxChunkSize) {
        // Thêm vào chunk hiện tại
        if (currentChunk === '') {
          currentStartPos = text.indexOf(paragraph);
        }
        currentChunk = potentialChunk;
        currentEndPos = text.indexOf(paragraph) + paragraph.length;
      } else {
        // Lưu chunk hiện tại và bắt đầu chunk mới
        if (currentChunk.length >= minChunkSize) {
          chunks.push({
            content: currentChunk.trim(),
            startPosition: currentStartPos,
            endPosition: currentEndPos,
          });
        }
        
        // Bắt đầu chunk mới
        currentChunk = paragraph;
        currentStartPos = text.indexOf(paragraph);
        currentEndPos = currentStartPos + paragraph.length;
      }
    }
    
    // Lưu chunk cuối cùng
    if (currentChunk.length >= minChunkSize) {
      chunks.push({
        content: currentChunk.trim(),
        startPosition: currentStartPos,
        endPosition: currentEndPos,
      });
    }

    return chunks;
  }

  /**
   * Chia theo kích thước cố định
   */
  private splitByFixedSize(text: string, maxChunkSize: number, overlapSize: number) {
    const chunks: Array<{
      content: string;
      startPosition: number;
      endPosition: number;
    }> = [];

    let start = 0;
    
    while (start < text.length) {
      let end = Math.min(start + maxChunkSize, text.length);
      
      // Tìm điểm cắt tốt (không cắt giữa từ)
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const cutPoint = Math.max(lastSpace, lastNewline);
        
        if (cutPoint > start + maxChunkSize * 0.7) {
          end = cutPoint;
        }
      }
      
      const content = text.slice(start, end).trim();
      
      if (content.length > 0) {
        chunks.push({
          content,
          startPosition: start,
          endPosition: end,
        });
      }
      
      // Di chuyển start position với overlap
      start = Math.max(start + 1, end - overlapSize);
    }

    return chunks;
  }

  /**
   * Chia đoạn văn dài thành chunks nhỏ
   */
  private splitLongParagraph(paragraph: string, maxChunkSize: number, overlapSize: number) {
    const chunks: Array<{
      content: string;
      startPosition: number;
      endPosition: number;
    }> = [];

    // Thử chia theo câu trước
    const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length > 1) {
      let currentChunk = '';
      let startPos = 0;
      
      for (const sentence of sentences) {
        const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + sentence.trim();
        
        if (potentialChunk.length <= maxChunkSize) {
          currentChunk = potentialChunk;
        } else {
          if (currentChunk) {
            chunks.push({
              content: currentChunk + '.',
              startPosition: startPos,
              endPosition: startPos + currentChunk.length,
            });
          }
          
          currentChunk = sentence.trim();
          startPos = startPos + (currentChunk ? currentChunk.length + 2 : 0);
        }
      }
      
      if (currentChunk) {
        chunks.push({
          content: currentChunk + '.',
          startPosition: startPos,
          endPosition: startPos + currentChunk.length,
        });
      }
    } else {
      // Chia cứng theo kích thước
      return this.splitByFixedSize(paragraph, maxChunkSize, overlapSize);
    }

    return chunks;
  }

  /**
   * Ước tính số token (đơn giản)
   */
  private estimateTokenCount(text: string): number {
    // Ước tính: 1 token ≈ 4 ký tự cho tiếng Việt
    // Hoặc đếm từ
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return Math.max(words.length, Math.ceil(text.length / 4));
  }

  /**
   * Detect sections trong text (tiêu đề, đoạn văn, etc.)
   */
  private detectSections(text: string): Array<{
    type: 'heading' | 'paragraph' | 'list' | 'table';
    content: string;
    level?: number;
  }> {
    const sections: Array<{
      type: 'heading' | 'paragraph' | 'list' | 'table';
      content: string;
      level?: number;
    }> = [];

    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Detect heading (ALL CAPS hoặc số thứ tự)
      if (this.isHeading(trimmed)) {
        sections.push({
          type: 'heading',
          content: trimmed,
          level: this.getHeadingLevel(trimmed),
        });
      }
      // Detect list
      else if (this.isList(trimmed)) {
        sections.push({
          type: 'list',
          content: trimmed,
        });
      }
      // Default: paragraph
      else {
        sections.push({
          type: 'paragraph',
          content: trimmed,
        });
      }
    }

    return sections;
  }

  private isHeading(text: string): boolean {
    // ALL CAPS và ngắn
    if (text === text.toUpperCase() && text.length < 100) return true;
    
    // Bắt đầu bằng số
    if (/^\d+\.?\s/.test(text)) return true;
    
    // Bắt đầu bằng chữ cái và dấu chấm
    if (/^[A-Z]\.\s/.test(text)) return true;
    
    return false;
  }

  private getHeadingLevel(text: string): number {
    if (/^\d+\.\d+\.\d+/.test(text)) return 3;
    if (/^\d+\.\d+/.test(text)) return 2;
    if (/^\d+\./.test(text)) return 1;
    return 1;
  }

  private isList(text: string): boolean {
    return /^[-*+•]\s/.test(text) || /^\d+\)\s/.test(text);
  }

  /**
   * Reindex chunks (tạo lại FTS index)
   */
  async reindexChunks(documentId: string): Promise<number> {
    // Sử dụng raw SQL để cập nhật searchVector trực tiếp
    // Sử dụng manager.query() vì searchVector không phải là field trong TypeORM entity type
    const query = `
      UPDATE document_chunks 
      SET "searchVector" = to_tsvector('vietnamese', normalize_vietnamese_text(content))
      WHERE "documentId" = $1
    `;
    
    await this.chunkRepo.manager.query(query, [documentId]);

    // Đếm số chunks đã được reindex
    const count = await this.chunkRepo
      .createQueryBuilder('chunk')
      .where('chunk.documentId = :documentId', { documentId })
      .getCount();

    this.logger.log(`Reindexed ${count} chunks for document ${documentId}`);
    return count;
  }
}
