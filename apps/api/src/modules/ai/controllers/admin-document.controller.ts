import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentService } from '../services/document.service';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
} from '../dto/document.dto';
import { multerConfig } from '../config/multer.config';

@ApiTags('Admin - Document Management')
@Controller('admin/documents')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Upload và xử lý tài liệu mới (PDF/DOCX/DOC/TXT)
   */
  @Post('upload')
  @ApiOperation({ summary: 'Upload tài liệu mới (PDF/DOCX/DOC/TXT)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Tài liệu được upload thành công' })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File không được để trống');
    }

    // Kiểm tra định dạng file
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'text/plain', // TXT
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ hỗ trợ file PDF, DOCX, DOC và TXT');
    }

    try {
      const result = await this.documentService.uploadAndProcess(
        file,
        createDocumentDto,
      );

      return {
        success: true,
        message: 'Tài liệu được upload và xử lý thành công',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi xử lý tài liệu: ${error.message}`);
    }
  }

  /**
   * Lấy thống kê tài liệu (must be before :id route)
   */
  @Get('stats/overview')
  @ApiOperation({ summary: 'Thống kê tổng quan tài liệu' })
  @ApiResponse({ status: 200, description: 'Thống kê tài liệu' })
  async getDocumentStats() {
    const stats = await this.documentService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Lấy danh sách tài liệu với phân trang và filter
   */
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tài liệu' })
  @ApiResponse({ status: 200, description: 'Danh sách tài liệu' })
  async getDocuments(@Query() query: DocumentQueryDto) {
    const result = await this.documentService.findAll(query);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Lấy chi tiết tài liệu theo ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết tài liệu' })
  @ApiResponse({ status: 200, description: 'Chi tiết tài liệu' })
  async getDocument(@Param('id') id: string) {
    const document = await this.documentService.findById(id);

    if (!document) {
      throw new NotFoundException('Không tìm thấy tài liệu');
    }

    return {
      success: true,
      data: document,
    };
  }

  /**
   * REMOVED: Lấy danh sách chunks của tài liệu (Layer 2 RAG disabled)
   */
  // @Get(':id/chunks')
  // @ApiOperation({ summary: 'Lấy danh sách chunks của tài liệu' })
  // @ApiResponse({ status: 200, description: 'Danh sách chunks' })
  // async getDocumentChunks(
  //   @Param('id') id: string,
  //   @Query('page') page: number = 1,
  //   @Query('limit') limit: number = 20,
  // ) {
  //   const chunks = await this.documentService.getDocumentChunks(id, {
  //     page,
  //     limit,
  //   });
  //
  //   return {
  //     success: true,
  //     data: chunks,
  //   };
  // }

  /**
   * Cập nhật thông tin tài liệu
   */
  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin tài liệu' })
  @ApiResponse({
    status: 200,
    description: 'Tài liệu được cập nhật thành công',
  })
  async updateDocument(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    const document = await this.documentService.update(id, updateDocumentDto);

    if (!document) {
      throw new NotFoundException('Không tìm thấy tài liệu');
    }

    return {
      success: true,
      message: 'Tài liệu được cập nhật thành công',
      data: document,
    };
  }

  /**
   * Xóa tài liệu và tất cả chunks liên quan
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài liệu' })
  @ApiResponse({ status: 200, description: 'Tài liệu được xóa thành công' })
  async deleteDocument(@Param('id') id: string) {
    const result = await this.documentService.delete(id);

    if (!result) {
      throw new NotFoundException('Không tìm thấy tài liệu');
    }

    return {
      success: true,
      message: 'Tài liệu và tất cả chunks liên quan đã được xóa',
      data: { deletedId: id },
    };
  }

  /**
   * Reprocess tài liệu (tạo lại chunks và index)
   */
  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Xử lý lại tài liệu (tạo lại chunks và index)' })
  @ApiResponse({
    status: 200,
    description: 'Tài liệu được xử lý lại thành công',
  })
  async reprocessDocument(@Param('id') id: string) {
    const result = await this.documentService.reprocess(id);

    if (!result) {
      throw new NotFoundException('Không tìm thấy tài liệu');
    }

    return {
      success: true,
      message: 'Tài liệu được xử lý lại thành công',
      data: result,
    };
  }

  /**
   * Bulk delete documents
   */
  @Delete('bulk')
  @ApiOperation({ summary: 'Xóa nhiều tài liệu cùng lúc' })
  @ApiResponse({ status: 200, description: 'Các tài liệu được xóa thành công' })
  async bulkDeleteDocuments(@Body('ids') ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Danh sách ID không được để trống');
    }

    const result = await this.documentService.bulkDelete(ids);

    return {
      success: true,
      message: `Đã xóa ${result.deletedCount} tài liệu`,
      data: result,
    };
  }
}
