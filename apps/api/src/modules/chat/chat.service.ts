import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Conversation, Message, MessageType, MessageStatus } from './entities';
import { SendMessageDto, CreateConversationDto } from './dto';
import { AIOrchestrator } from '../ai/services';
import { DateUtils } from '../../common/utils/date.util';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private aiOrchestrator: AIOrchestrator,
  ) {}

  // Tạo cuộc trò chuyện mới
  async createConversation(
    user: User,
    createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      ...createConversationDto,
      user,
    });
    console.log("chạy vào hàm createConversation");
    
    return await this.conversationRepository.save(conversation);
  }

  // Lấy danh sách cuộc trò chuyện của user (exclude deleted, with pagination)
  async getConversations(
    user: User,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const skip = (page - 1) * limit;

    const [conversations, total] = await this.conversationRepository.findAndCount({
      where: { 
        user: { id: user.id },
        status: 'ACTIVE' as any, // Only get active conversations
      },
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
      relations: ['messages'],
      skip,
      take: limit,
    });

    return { conversations, total };
  }

  // Lấy cuộc trò chuyện theo ID (với relations - dùng cho display)
  async getConversation(id: string, user: User): Promise<Conversation> {
    console.log("chạy vào hàm getConversation");
    
    const conversation = await this.conversationRepository.findOne({
      where: { id, user: { id: user.id } },
      relations: ['messages', 'user'],
      order: { messages: { createdAt: 'ASC' } },
    });

    if (!conversation) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }

    return conversation;
  }

  // Verify conversation tồn tại (không load relations - dùng cho save message)
  private async verifyConversation(id: string, user: User): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!conversation) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }

    return conversation;
  }

  // Gửi tin nhắn
  async sendMessage(
    user: User,
    sendMessageDto: SendMessageDto,
  ): Promise<{
    message: Message;
    conversation: Conversation;
    response: Message;
  }> {
    const startTime = Date.now();
    console.log("para_sendMessage_user: ", user);
    console.log("para_sendMessage_sendMessageDto: ", sendMessageDto);

    // Tìm hoặc tạo cuộc trò chuyện
    let conversation: Conversation;

    if (sendMessageDto.conversationId) {
      console.log('có conversationId: ', sendMessageDto.conversationId);

      conversation = await this.verifyConversation(
        sendMessageDto.conversationId,
        user,
      );
    } else {
      console.log('tạo conversation mới - new row trong conversation');
      console.log("conversationId_check_NULL: ", sendMessageDto.conversationId);

      console.log("Tạo cuộc trò chuyện mới với tiêu đề từ tin nhắn đầu tiên");
      conversation = await this.createConversation(user, {
        title: this.generateTitleFromMessage(sendMessageDto.content),
        description: 'Cuộc trò chuyện mới',
      });
    }

    console.log('CONVERSATION_ID: ', conversation.id);

    // Lưu tin nhắn của user
    const userMessage = this.messageRepository.create({
      content: sendMessageDto.content,
      type: MessageType.USER,
      status: MessageStatus.SENT,
      metadata: sendMessageDto.metadata,
      conversationId: conversation.id,
      userId: user.id,
      createdAt: DateUtils.getVietnamTime(), // Manually set Vietnam time
    });

    console.log("userMessage: ", userMessage);
    

    const savedUserMessage = await this.messageRepository.save(userMessage);

    console.log("savedUserMessage: ",savedUserMessage);
    

    const aiResponse = await this.generateAIResponse(
      sendMessageDto.content,
      user,
      conversation.id,
    );

    // Lưu phản hồi của AI
    const assistantMessage = this.messageRepository.create({
      content: aiResponse.content,
      type: MessageType.ASSISTANT,
      status: MessageStatus.SENT,
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
      responseTime: Date.now() - startTime,
      conversationId: conversation.id,
      createdAt: DateUtils.getVietnamTime(), // Manually set Vietnam time
    });

    const savedAssistantMessage =
      await this.messageRepository.save(assistantMessage);

    // Cập nhật cuộc trò chuyện
    conversation.lastMessageAt = DateUtils.getVietnamTime(); // Manually set Vietnam time
    conversation.messageCount += 2;
    await this.conversationRepository.save(conversation);

    return {
      message: savedUserMessage,
      conversation,
      response: savedAssistantMessage,
    };
  }

  // Xóa cuộc trò chuyện (hard delete from database)
  async deleteConversation(id: string, user: User): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!conversation) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }

    // Delete all messages first (explicit delete for safety)
    await this.messageRepository.delete({ conversationId: id });

    // Then delete the conversation
    await this.conversationRepository.remove(conversation);
  }

  // Lấy lịch sử tin nhắn
  async getMessages(
    conversationId: string,
    user: User,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: Message[]; total: number }> {
    const conversation = await this.getConversation(conversationId, user);

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { conversationId: conversationId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { messages, total };
  }

  // Tạo tiêu đề từ tin nhắn đầu tiên
  private generateTitleFromMessage(content: string): string {
    // Lấy 50 ký tự đầu tiên làm tiêu đề
    console.log("chạy vào generateTitleFromMessage");
    
    const title = content.substring(0, 50);
    return title.length < content.length ? `${title}...` : title;
  }

  // Tạo phản hồi AI sử dụng AI Service
  private async generateAIResponse(
    userMessage: string,
    user: User,
    conversationId: string,
  ): Promise<{ content: string; intent: string; confidence: number }> {
    try {
      console.log("user_prompt: ", userMessage);
      console.log("direct đến Orchest để xử lý");
      
      // 
      const aiResponse = await this.aiOrchestrator.process({
        query: userMessage,
        user: user,
        conversationId: conversationId,
      });

      console.log("ai_response: ", aiResponse);
  
      return {
        content: aiResponse.message,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
      };
    } catch (error) {
      console.log("error_generateAIResponse_chat.service: ", error);
      console.error('Error generating AI response:', error);

      // Fallback response nếu AI service lỗi
      return {
        content:
          'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.',
        intent: 'error',
        confidence: 0.1,
      };
    }
  }
}
