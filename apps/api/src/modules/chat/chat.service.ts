import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Conversation, Message, MessageType, MessageStatus } from './entities';
import { SendMessageDto, CreateConversationDto } from './dto';
import { AIService } from '../ai/ai.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private aiService: AIService,
  ) {}

  // Tạo cuộc trò chuyện mới (ban đầu conversationId = null)
  async createConversation(
    user: User,
    createConversationDto: CreateConversationDto, // title - description
  ): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      ...createConversationDto,
      user,
    });

    return await this.conversationRepository.save(conversation);
  }

  // Lấy danh sách cuộc trò chuyện của user
  async getConversations(user: User): Promise<Conversation[]> {
    return await this.conversationRepository.find({
      where: { user: { id: user.id } },
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
      relations: ['messages'],
    });
  }

  // Lấy cuộc trò chuyện theo ID
  async getConversation(
    id: string,
    user: User,
  ): Promise<Conversation> {
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

  // !!!! Gửi tin nhắn
  async sendMessage(
    user: User,
    sendMessageDto: SendMessageDto,
  ): Promise<{ message: Message; conversation: Conversation; response: Message }> {
    const startTime = Date.now();

    // Tìm hoặc tạo cuộc trò chuyện
    let conversation: Conversation;
    
    if (sendMessageDto.conversationId) {
      conversation = await this.getConversation(sendMessageDto.conversationId, user);
    } else {
      // Tạo cuộc trò chuyện mới với tiêu đề từ tin nhắn đầu tiên
      // return Conversation (entity)
      conversation = await this.createConversation(user, {
        title: this.generateTitleFromMessage(sendMessageDto.content),
        description: 'Cuộc trò chuyện mới',
      });
    }

    // Lưu tin nhắn của user
    const userMessage = this.messageRepository.create({
      content: sendMessageDto.content,
      type: MessageType.USER,
      status: MessageStatus.SENT,
      metadata: sendMessageDto.metadata,
      conversation,
      user,
    });

    // lưu message của User vào DB
    const savedUserMessage = await this.messageRepository.save(userMessage);

    // Tạo phản hồi từ AI (tạm thời là placeholder)
    // 
    const aiResponse = await this.generateAIResponse(sendMessageDto.content, conversation);

    // Lưu phản hồi của AI
    const assistantMessage = this.messageRepository.create({
      content: aiResponse.content,
      type: MessageType.ASSISTANT,
      status: MessageStatus.SENT,
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
      responseTime: Date.now() - startTime,
      conversation,
    });

    const savedAssistantMessage = await this.messageRepository.save(assistantMessage);

    // Cập nhật cuộc trò chuyện
    conversation.lastMessageAt = new Date();
    conversation.messageCount += 2;
    await this.conversationRepository.save(conversation);

    return {
      message: savedUserMessage,
      conversation,
      response: savedAssistantMessage,
    };
  }

  // Xóa cuộc trò chuyện
  async deleteConversation(id: string, user: User): Promise<void> {
    const conversation = await this.getConversation(id, user);
    
    // Soft delete - chỉ đánh dấu là DELETED
    conversation.status = 'DELETED' as any;
    await this.conversationRepository.save(conversation);
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
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { messages, total };
  }

  // Tạo tiêu đề từ tin nhắn đầu tiên
  private generateTitleFromMessage(content: string): string {
    // Lấy 50 ký tự đầu tiên làm tiêu đề
    const title = content.substring(0, 50);
    return title.length < content.length ? `${title}...` : title;
  }

  // Tạo phản hồi AI sử dụng AI Service
  private async generateAIResponse(
    userMessage: string,
    conversation: Conversation,
  ): Promise<{ content: string; intent: string; confidence: number }> {
    try {
      // Phân tích intent của câu hỏi
      const intentAnalysis = await this.aiService.analyzeIntent(userMessage);
      /**
      intent: bestIntent,
      confidence: maxConfidence,
      entities
       */
      // Tạo phản hồi AI dựa trên intent
      const aiResponse = await this.aiService.generateResponse(userMessage, intentAnalysis);
      
      return {
        content: aiResponse.content,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Fallback response nếu AI service lỗi
      return {
        content: 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.',
        intent: 'error',
        confidence: 0.1,
      };
    }
  }
}
