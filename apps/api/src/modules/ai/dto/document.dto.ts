import { IsString, IsOptional, IsEnum, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory, DocumentStatus } from '../entities/document.entity';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Danh mục tài liệu', enum: DocumentCategory })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @ApiPropertyOptional({ description: 'Tags cho tài liệu (max 10 tags, mỗi tag 2-30 ký tự)', type: [String], example: ['lua', 'canh-tac', 'huong-dan'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return [];
    // Normalize tags: lowercase, trim, limit length
    return value.slice(0, 10).map(tag => 
      String(tag).trim().toLowerCase().substring(0, 30)
    ).filter(tag => tag.length >= 2);
  })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Ngôn ngữ tài liệu (vi, en)', default: 'vi', enum: ['vi', 'en'] })
  @IsOptional()
  @IsString()
  @IsEnum(['vi', 'en'], { message: 'Language must be either "vi" or "en"' })
  language?: string = 'vi';

  @ApiPropertyOptional({ description: 'Ghi chú thêm (max 500 ký tự)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? String(value).trim().substring(0, 500) : undefined)
  notes?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Tên file mới' })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiPropertyOptional({ description: 'Danh mục tài liệu', enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'Tags cho tài liệu', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Ngôn ngữ tài liệu' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Trạng thái xử lý', enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  processingStatus?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Đã được index chưa' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  indexed?: boolean;
}

export class DocumentQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên file' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo danh mục', enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái', enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Lọc theo ngôn ngữ' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Lọc theo tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Sắp xếp theo trường', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Thứ tự sắp xếp', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Chỉ lấy tài liệu đã được index' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  indexedOnly?: boolean;
}

export class ChunkQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Tìm kiếm trong nội dung chunk' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class BulkDeleteDto {
  @ApiProperty({ description: 'Danh sách ID tài liệu cần xóa', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

