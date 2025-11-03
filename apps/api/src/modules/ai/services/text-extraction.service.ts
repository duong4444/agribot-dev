import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TextExtractionService {
  private readonly logger = new Logger(TextExtractionService.name);

  /**
   * Extract text từ file dựa trên MIME type
   */
  async extractText(filepath: string): Promise<string> {
    if (!fs.existsSync(filepath)) {
      throw new BadRequestException('File không tồn tại');
    }

    const ext = path.extname(filepath).toLowerCase();
    this.logger.log(`Extracting text from: ${filepath} (${ext})`);

    try {
      switch (ext) {
        case '.pdf':
          return await this.extractFromPDF(filepath);
        case '.docx':
          return await this.extractFromDOCX(filepath);
        case '.doc':
          return await this.extractFromDOC(filepath);
        case '.txt':
          return await this.extractFromTXT(filepath);
        default:
          throw new BadRequestException(`Không hỗ trợ định dạng file: ${ext}`);
      }
    } catch (error) {
      this.logger.error(`Lỗi extract text từ ${filepath}:`, error);
      throw new BadRequestException(`Lỗi xử lý file: ${error.message}`);
    }
  }

  /**
   * Extract text từ PDF sử dụng pdf-parse
   */
  private async extractFromPDF(filepath: string): Promise<string> {
    try {
      // Import dynamic để tránh lỗi nếu package chưa cài
      // pdf-parse v2.4.5 là ESM module, export function trực tiếp
      const pdfParseModule = await import('pdf-parse');
      // Type assertion để xử lý ESM module
      const pdfParse = pdfParseModule as any;
      
      const dataBuffer = fs.readFileSync(filepath);
      const data = await pdfParse(dataBuffer);
      
      this.logger.log(`Extracted ${data.text.length} characters from PDF`);
      return data.text;
    } catch (error) {
      // Fallback: Thử dùng pdf2pic + OCR hoặc trả về lỗi
      this.logger.warn('pdf-parse failed, trying fallback method');
      return await this.extractPDFWithFallback(filepath);
    }
  }

  /**
   * Fallback method cho PDF (có thể implement OCR sau)
   */
  private async extractPDFWithFallback(filepath: string): Promise<string> {
    // TODO: Implement OCR với Tesseract.js hoặc Google Vision API
    // Hiện tại trả về thông báo
    return `[PDF Content] - File: ${path.basename(filepath)}\n\nNội dung PDF cần được xử lý bằng OCR. Vui lòng implement OCR service để extract text từ PDF này.`;
  }

  /**
   * Extract text từ DOCX sử dụng mammoth
   */
  private async extractFromDOCX(filepath: string): Promise<string> {
    try {
      // Import dynamic
      const mammoth = await import('mammoth');
      
      const result = await mammoth.extractRawText({ path: filepath });
      
      this.logger.log(`Extracted ${result.value.length} characters from DOCX`);
      
      if (result.messages.length > 0) {
        this.logger.warn('DOCX extraction warnings:', result.messages);
      }
      
      return result.value;
    } catch (error) {
      this.logger.error('mammoth failed:', error);
      return await this.extractDOCXWithFallback(filepath);
    }
  }

  /**
   * Fallback method cho DOCX
   */
  private async extractDOCXWithFallback(filepath: string): Promise<string> {
    // TODO: Implement alternative DOCX parser
    return `[DOCX Content] - File: ${path.basename(filepath)}\n\nNội dung DOCX cần được xử lý bằng parser khác. Vui lòng cài đặt mammoth package hoặc implement alternative parser.`;
  }

  /**
   * Extract text từ DOC (legacy Word format)
   */
  private async extractFromDOC(filepath: string): Promise<string> {
    // DOC format phức tạp hơn, cần tool chuyên dụng
    // Có thể dùng LibreOffice headless hoặc antiword
    return `[DOC Content] - File: ${path.basename(filepath)}\n\nĐịnh dạng DOC cần converter đặc biệt. Khuyến nghị chuyển sang DOCX hoặc PDF.`;
  }

  /**
   * Extract text từ TXT
   */
  private async extractFromTXT(filepath: string): Promise<string> {
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      this.logger.log(`Extracted ${content.length} characters from TXT`);
      return content;
    } catch (error) {
      // Thử với encoding khác
      try {
        const content = fs.readFileSync(filepath, 'latin1');
        return content;
      } catch (error2) {
        throw new BadRequestException('Không thể đọc file TXT');
      }
    }
  }

  /**
   * Validate và clean extracted text
   */
  validateAndCleanText(text: string): string {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('File không chứa text hoặc text rỗng');
    }

    // Basic cleaning
    let cleaned = text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/[ \t]{2,}/g, ' ') // Remove excessive spaces
      .trim();

    // Kiểm tra độ dài tối thiểu
    if (cleaned.length < 50) {
      this.logger.warn(`Text quá ngắn: ${cleaned.length} ký tự`);
    }

    // Kiểm tra có phải toàn ký tự đặc biệt không
    const alphanumericCount = (cleaned.match(/[a-zA-Z0-9\u00C0-\u017F\u1EA0-\u1EF9]/g) || []).length;
    const alphanumericRatio = alphanumericCount / cleaned.length;
    
    if (alphanumericRatio < 0.3) {
      this.logger.warn(`Text có quá ít ký tự có nghĩa: ${alphanumericRatio * 100}%`);
    }

    return cleaned;
  }

  /**
   * Detect language của text (đơn giản)
   */
  detectLanguage(text: string): string {
    // Đơn giản: check Vietnamese diacritics
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi;
    const vietnameseCount = (text.match(vietnameseChars) || []).length;
    
    if (vietnameseCount > 10) {
      return 'vi';
    }
    
    return 'en'; // Default
  }

  /**
   * Get file info
   */
  getFileInfo(filepath: string): {
    size: number;
    extension: string;
    mimeType: string;
    basename: string;
  } {
    const stats = fs.statSync(filepath);
    const ext = path.extname(filepath).toLowerCase();
    const basename = path.basename(filepath);
    
    const mimeTypeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
    };

    return {
      size: stats.size,
      extension: ext,
      mimeType: mimeTypeMap[ext] || 'application/octet-stream',
      basename,
    };
  }
}

