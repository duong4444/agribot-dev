import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import * as multer from 'multer';

export const multerConfig: MulterOptions = {
  // Sử dụng memory storage để xử lý file trong memory
  storage: multer.memoryStorage(),
  
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1, // Chỉ cho phép 1 file
  },
  
  fileFilter: (req, file, callback) => {
    // Decode filename to handle UTF-8 characters properly
    if (file.originalname) {
      try {
        // Fix encoding issue with Vietnamese characters
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (error) {
        // If conversion fails, keep original name
        console.warn('Failed to convert filename encoding:', error);
      }
    }
    
    // Kiểm tra MIME type
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'text/plain', // TXT
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `Định dạng file không được hỗ trợ: ${file.mimetype}. Chỉ hỗ trợ PDF, DOCX, DOC, TXT`
        ),
        false
      );
    }
  },
};

