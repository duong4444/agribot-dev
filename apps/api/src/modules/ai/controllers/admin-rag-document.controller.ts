import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { RagDocumentService } from '../services/rag-document.service';
import type { CreateRagDocumentDto } from '../services/rag-document.service';

@Controller('admin/rag-documents')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminRagDocumentController {
  constructor(private readonly ragDocumentService: RagDocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRagDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateRagDocumentDto,
    @Request() req,
  ) {
    const document = await this.ragDocumentService.uploadAndProcess(
      file,
      dto,
      req.user.id,
    );

    return {
      success: true,
      message: 'RAG document uploaded and processing started',
      data: document,
    };
  }

  @Get()
  async listRagDocuments(@Request() req) {
    const documents = await this.ragDocumentService.findAll(req.user.id);

    return {
      success: true,
      data: documents,
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.ragDocumentService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async getRagDocument(@Param('id') id: string) {
    const document = await this.ragDocumentService.findById(id);

    if (!document) {
      return {
        success: false,
        message: 'Document not found',
      };
    }

    return {
      success: true,
      data: document,
    };
  }

  @Delete(':id')
  async deleteRagDocument(@Param('id') id: string) {
    const success = await this.ragDocumentService.delete(id);

    return {
      success,
      message: success ? 'Document deleted' : 'Document not found',
    };
  }
}
