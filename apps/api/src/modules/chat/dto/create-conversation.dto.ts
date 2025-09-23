import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Tiêu đề cuộc trò chuyện',
    example: 'Hỏi về kỹ thuật trồng cà chua',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Mô tả cuộc trò chuyện',
    example: 'Tìm hiểu về cách trồng và chăm sóc cà chua',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
