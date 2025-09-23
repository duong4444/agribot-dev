import { ApiProperty } from '@nestjs/swagger';
import { MessageType, MessageStatus } from '../entities';

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: MessageType })
  type: MessageType;

  @ApiProperty({ enum: MessageStatus })
  status: MessageStatus;

  @ApiProperty({ required: false })
  metadata?: string;

  @ApiProperty({ required: false })
  intent?: string;

  @ApiProperty({ required: false })
  confidence?: number;

  @ApiProperty({ required: false })
  responseTime?: number;

  @ApiProperty()
  createdAt: Date;
}

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  lastMessageAt?: Date;

  @ApiProperty()
  messageCount: number;

  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SendMessageResponseDto {
  @ApiProperty()
  message: MessageResponseDto;

  @ApiProperty()
  conversation: ConversationResponseDto;

  @ApiProperty()
  response: MessageResponseDto;
}
