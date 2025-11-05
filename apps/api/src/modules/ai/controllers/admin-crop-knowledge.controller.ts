import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CropKnowledgeService } from '../services/crop-knowledge.service';
import { CropKnowledgeFTSService } from '../services/crop-knowledge-fts.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

/**
 * Admin Controller for Crop Knowledge Management (Refactored)
 * 
 * Endpoints:
 * - POST /admin/crop-knowledge/upload: Upload .md file với structural chunking
 * - POST /admin/crop-knowledge/preview: Preview chunks trước khi upload
 * - GET /admin/crop-knowledge: List all crop knowledge
 * - GET /admin/crop-knowledge/:id: Get details
 * - DELETE /admin/crop-knowledge/:id: Delete document
 * - POST /admin/crop-knowledge/:id/reindex: Re-index document
 * - GET /admin/crop-knowledge/stats: Get statistics
 * - GET /admin/crop-knowledge/debug-search: Debug FTS search
 */

@Controller('admin/crop-knowledge')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCropKnowledgeController {
  constructor(
    private readonly cropKnowledgeService: CropKnowledgeService,
    private readonly cropKnowledgeFTS: CropKnowledgeFTSService,
  ) {}

  /**
   * Upload markdown file for crop knowledge
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Body('category') category?: string,
    @Body('tags') tags?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.md')) {
      throw new BadRequestException('Only .md files are allowed');
    }

    const content = file.buffer.toString('utf-8');

    const result = await this.cropKnowledgeService.uploadCropKnowledge({
      filename: file.originalname,
      content,
      userId,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
    });

    return {
      success: true,
      message: `Successfully uploaded ${file.originalname}`,
      data: result,
    };
  }

  /**
   * Upload markdown via text content (for testing)
   */
  @Post('upload-text')
  async uploadText(
    @Body('filename') filename: string,
    @Body('content') content: string,
    @CurrentUser('id') userId: string,
    @Body('category') category?: string,
    @Body('tags') tags?: string[],
  ) {
    if (!filename || !content) {
      throw new BadRequestException('Filename and content are required');
    }

    if (!filename.endsWith('.md')) {
      filename += '.md';
    }

    const result = await this.cropKnowledgeService.uploadCropKnowledge({
      filename,
      content,
      userId,
      category,
      tags,
    });

    return {
      success: true,
      message: `Successfully uploaded ${filename}`,
      data: result,
    };
  }

  /**
   * Preview chunks from markdown content (without saving)
   */
  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewChunks(
    @UploadedFile() file?: Express.Multer.File,
    @Body('filename') bodyFilename?: string,
    @Body('content') bodyContent?: string,
  ) {
    let filename: string;
    let content: string;

    if (file) {
      filename = file.originalname;
      content = file.buffer.toString('utf-8');
    } else if (bodyFilename && bodyContent) {
      filename = bodyFilename;
      content = bodyContent;
    } else {
      throw new BadRequestException('Either file or filename+content is required');
    }

    const result = await this.cropKnowledgeService.previewMarkdownChunks(
      filename,
      content,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get crop knowledge statistics
   */
  @Get('stats/overview')
  async getStats() {
    const stats = await this.cropKnowledgeFTS.getCropKnowledgeStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * View all chunks in database (for debugging)
   */
  @Get('debug/chunks')
  async viewChunks(
    @Query('limit') limit?: string,
    @Query('crop') cropName?: string,
  ) {
    const chunks = await this.cropKnowledgeFTS.getAllChunks(
      parseInt(limit || '20'),
      cropName,
    );

    return {
      success: true,
      total: chunks.length,
      data: chunks,
    };
  }

  /**
   * Verify FTS setup (check if PostgreSQL functions exist)
   * Temporarily public for debugging
   */
  @Get('debug/verify-fts')
  @UseGuards() // Remove guards temporarily
  async verifyFTS() {
    const verification = await this.cropKnowledgeFTS.verifyFTSSetup();

    return {
      success: true,
      verification,
    };
  }

  /**
   * Manually trigger search_vector update for all chunks
   * Temporarily public for debugging
   */
  @Post('debug/rebuild-vectors')
  @UseGuards() // Remove guards temporarily
  async rebuildVectors() {
    const result = await this.cropKnowledgeFTS.rebuildSearchVectors();

    return {
      success: true,
      message: 'Search vectors rebuilt',
      result,
    };
  }

  /**
   * Debug search (for testing FTS)
   */
  @Get('debug/search')
  async debugSearch(
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Query is required');
    }

    const debugOutput = await this.cropKnowledgeFTS.debugSearch(
      query, 
      limit ? parseInt(limit) : 5,
    );

    return {
      success: true,
      query,
      debug: debugOutput,
    };
  }

  /**
   * Test FTS search
   */
  @Get('test-search')
  async testSearch(
    @Query('query') query?: string,
    @CurrentUser('id') userId?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Query is required');
    }

    const result = await this.cropKnowledgeFTS.searchCropKnowledge(
      query,
      userId,
      {
        limit: 5,
        threshold: 0.7, // Lower threshold for testing
      },
    );

    return {
      success: true,
      query,
      result,
    };
  }

  /**
   * List all crop knowledge documents
   */
  @Get()
  async listCropKnowledge(@CurrentUser('id') userId?: string) {
    const documents = await this.cropKnowledgeService.listCropKnowledge(userId);

    return {
      success: true,
      data: documents,
      total: documents.length,
    };
  }

  /**
   * Get crop knowledge document details
   */
  @Get(':id')
  async getCropKnowledgeDetails(@Param('id') id: string) {
    const result = await this.cropKnowledgeService.getCropKnowledgeDetails(id);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Delete crop knowledge document
   */
  @Delete(':id')
  async deleteCropKnowledge(@Param('id') id: string) {
    await this.cropKnowledgeService.deleteCropKnowledge(id);

    return {
      success: true,
      message: 'Crop knowledge document deleted successfully',
    };
  }

  /**
   * Re-index crop knowledge document
   */
  @Post(':id/reindex')
  async reindexCropKnowledge(@Param('id') id: string) {
    await this.cropKnowledgeService.reindexCropKnowledge(id);

    return {
      success: true,
      message: 'Crop knowledge document re-indexed successfully',
    };
  }
}
