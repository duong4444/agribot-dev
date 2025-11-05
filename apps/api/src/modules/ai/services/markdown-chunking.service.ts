import { Injectable, Logger } from '@nestjs/common';
import { normalizeText } from '../utils/text.utils';

/**
 * Markdown Chunking Service
 * 
 * Chiến lược: Structural/Semantic Chunking
 * - Mỗi ### (H3) là một chunk kiến thức độc lập
 * - Giữ ngữ cảnh từ # (H1) và ## (H2)
 * - Tối ưu cho FTS với metadata đầy đủ
 */

export interface CropKnowledgeChunk {
  id: string;
  loai_cay: string;        // Từ H1 hoặc tên file
  nguon: string;           // Tên file gốc
  chu_de_lon: string;      // Từ H2 (parent section)
  tieu_de_chunk: string;   // Từ H3 (chunk title)
  noi_dung: string;        // Content của chunk
  thu_tu: number;          // Thứ tự chunk trong file
  metadata?: {
    [key: string]: any;
  };
}

@Injectable()
export class MarkdownChunkingService {
  private readonly logger = new Logger(MarkdownChunkingService.name);

  /**
   * Parse markdown file thành chunks theo cấu trúc H1 > H2 > H3
   */
  async parseMarkdownToChunks(
    filename: string,
    content: string,
  ): Promise<CropKnowledgeChunk[]> {
    const startTime = Date.now();
    this.logger.log(`📝 Parsing markdown file: ${filename}`);

    const chunks: CropKnowledgeChunk[] = [];
    
    // Extract crop type từ H1 hoặc filename
    const loaiCay = this.extractCropType(content, filename);
    
    // Split content thành các lines
    const lines = content.split('\n');
    
    let currentH2 = '';
    let currentH3 = '';
    let currentContent: string[] = [];
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check if line is H2
      if (trimmedLine.startsWith('## ')) {
        // Save previous chunk if exists
        if (currentH3 && currentContent.length > 0) {
          chunks.push(this.createChunk(
            filename,
            loaiCay,
            currentH2,
            currentH3,
            currentContent.join('\n').trim(),
            chunkIndex++,
          ));
          currentContent = [];
        }
        
        // Update current H2
        currentH2 = trimmedLine.substring(3).trim();
        currentH3 = '';
      }
      // Check if line is H3
      else if (trimmedLine.startsWith('### ')) {
        // Save previous chunk if exists
        if (currentH3 && currentContent.length > 0) {
          chunks.push(this.createChunk(
            filename,
            loaiCay,
            currentH2,
            currentH3,
            currentContent.join('\n').trim(),
            chunkIndex++,
          ));
          currentContent = [];
        }
        
        // Update current H3
        currentH3 = trimmedLine.substring(4).trim();
      }
      // Regular content
      else if (trimmedLine && !trimmedLine.startsWith('# ')) {
        // Skip H1 and empty lines at the beginning
        if (currentH2 || currentH3) {
          currentContent.push(line);
        }
      }
    }

    // Save last chunk
    if (currentH3 && currentContent.length > 0) {
      chunks.push(this.createChunk(
        filename,
        loaiCay,
        currentH2,
        currentH3,
        currentContent.join('\n').trim(),
        chunkIndex++,
      ));
    }

    const processingTime = Date.now() - startTime;
    this.logger.log(
      `✅ Parsed ${chunks.length} chunks from ${filename} in ${processingTime}ms`,
    );

    return chunks;
  }

  /**
   * Extract crop type từ H1 hoặc filename
   */
  private extractCropType(content: string, filename: string): string {
    // Try to extract from H1
    const h1Match = content.match(/^#\s+(.+?)(?:\:|：|\s*$)/m);
    if (h1Match) {
      const h1Text = h1Match[1];
      
      // Extract crop name from patterns like "Cây Bưởi Da Xanh"
      const cropMatch = h1Text.match(/(?:Cây\s+)?(.+?)(?:\s*[:：]|\s*$)/i);
      if (cropMatch) {
        return cropMatch[1].trim();
      }
      
      return h1Text.trim();
    }

    // Fallback to filename
    const nameWithoutExt = filename.replace(/\.(md|markdown)$/i, '');
    
    // Convert underscore to space and capitalize
    return nameWithoutExt
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim();
  }

  /**
   * Create a chunk object
   */
  private createChunk(
    filename: string,
    loaiCay: string,
    chuDeLon: string,
    tieuDeChunk: string,
    noiDung: string,
    thuTu: number,
  ): CropKnowledgeChunk {
    // Generate unique ID
    const baseId = filename
      .replace(/\.(md|markdown)$/i, '')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    
    const id = `${baseId}_${String(thuTu + 1).padStart(3, '0')}`;

    return {
      id,
      loai_cay: loaiCay,
      nguon: filename,
      chu_de_lon: chuDeLon,
      tieu_de_chunk: tieuDeChunk,
      noi_dung: this.cleanContent(noiDung),
      thu_tu: thuTu,
      metadata: {
        word_count: noiDung.split(/\s+/).length,
        char_count: noiDung.length,
        has_list: noiDung.includes('- ') || noiDung.includes('* '),
        has_bold: noiDung.includes('**'),
      },
    };
  }

  /**
   * Clean content: remove excessive whitespace, markdown artifacts
   */
  private cleanContent(content: string): string {
    return content
      // Remove excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
      // Clean up list markers
      .replace(/^[\s-*]+/gm, '- ')
      // Trim each line
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .trim();
  }

  /**
   * Validate chunks for quality
   */
  validateChunks(chunks: CropKnowledgeChunk[]): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (chunks.length === 0) {
      issues.push('No chunks generated');
    }

    chunks.forEach((chunk, index) => {
      if (!chunk.loai_cay) {
        issues.push(`Chunk ${index + 1}: Missing loai_cay`);
      }
      if (!chunk.tieu_de_chunk) {
        issues.push(`Chunk ${index + 1}: Missing tieu_de_chunk`);
      }
      if (!chunk.noi_dung || chunk.noi_dung.length < 50) {
        issues.push(`Chunk ${index + 1}: Content too short (< 50 chars)`);
      }
      if (chunk.noi_dung && chunk.noi_dung.length > 5000) {
        issues.push(`Chunk ${index + 1}: Content too long (> 5000 chars)`);
      }
    });

    // Check for duplicate IDs
    const ids = chunks.map(c => c.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      issues.push('Duplicate chunk IDs detected');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate preview of chunks for admin review
   */
  generatePreview(chunks: CropKnowledgeChunk[]): string {
    let preview = `📚 **Tổng số chunks:** ${chunks.length}\n\n`;
    
    // Group by chu_de_lon
    const grouped = chunks.reduce((acc, chunk) => {
      if (!acc[chunk.chu_de_lon]) {
        acc[chunk.chu_de_lon] = [];
      }
      acc[chunk.chu_de_lon].push(chunk);
      return acc;
    }, {} as Record<string, CropKnowledgeChunk[]>);

    Object.entries(grouped).forEach(([chuDe, chunkList]) => {
      preview += `## ${chuDe} (${chunkList.length} chunks)\n`;
      chunkList.forEach(chunk => {
        const contentPreview = chunk.noi_dung.substring(0, 100);
        preview += `  - **${chunk.tieu_de_chunk}**: ${contentPreview}...\n`;
      });
      preview += '\n';
    });

    return preview;
  }
}
