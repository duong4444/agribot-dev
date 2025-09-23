import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn',
    example: 'Làm thế nào để trồng cà chua?',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'ID cuộc trò chuyện (tùy chọn, nếu không có sẽ tạo mới)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({
    description: 'Metadata bổ sung (JSON string)',
    example: '{"source": "web", "device": "mobile"}',
    required: false,
  })
  @IsOptional()
  @IsString()
  metadata?: string;
}
