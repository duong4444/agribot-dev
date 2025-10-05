import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import {
  SendMessageDto,
  CreateConversationDto,
  SendMessageResponseDto,
  ConversationResponseDto,
  MessageResponseDto,
} from './dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Tạo cuộc trò chuyện mới' })
  @ApiResponse({
    status: 201,
    description: 'Cuộc trò chuyện đã được tạo thành công',
    type: ConversationResponseDto,
  })
  async createConversation(
    @Request() req,
    @Body() createConversationDto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return await this.chatService.createConversation(req.user, createConversationDto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách cuộc trò chuyện' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách cuộc trò chuyện',
    type: [ConversationResponseDto],
  })
  async getConversations(@Request() req): Promise<ConversationResponseDto[]> {
    return await this.chatService.getConversations(req.user);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Lấy chi tiết cuộc trò chuyện' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết cuộc trò chuyện',
    type: ConversationResponseDto,
  })
  async getConversation(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ConversationResponseDto> {
    return await this.chatService.getConversation(id, req.user);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Xóa cuộc trò chuyện' })
  @ApiResponse({
    status: 200,
    description: 'Cuộc trò chuyện đã được xóa',
  })
  async deleteConversation(
    @Request() req,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.chatService.deleteConversation(id, req.user);
    return { message: 'Cuộc trò chuyện đã được xóa thành công' };
  }

  @Post('messages')
  @ApiOperation({ summary: 'Gửi tin nhắn' })
  @ApiResponse({
    status: 201,
    description: 'Tin nhắn đã được gửi thành công',
    type: SendMessageResponseDto,
  })
  async sendMessage(
    @Request() req,
    @Body() sendMessageDto: SendMessageDto, // content, conversationId?, metadata?
  ): Promise<SendMessageResponseDto> {
    return await this.chatService.sendMessage(req.user, sendMessageDto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn' })
  @ApiResponse({
    status: 200,
    description: 'Lịch sử tin nhắn',
  })
  async getMessages(
    @Request() req,
    @Param('id') conversationId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ): Promise<{ messages: MessageResponseDto[]; total: number; page: number; limit: number }> {
    const result = await this.chatService.getMessages(conversationId, req.user, page, limit);
    return {
      ...result,
      page,
      limit,
    };
  }
}
