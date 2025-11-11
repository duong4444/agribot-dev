import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Logger,
  Get,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AIOrchestrator } from './services';
import { AIResponse } from './types';

class ChatRequest {
  message: string;
  conversationId?: string;
}

class ChatResponse {
  success: boolean;
  message: string;
  data?: any;
  metadata?: {
    intent: string;
    layer: string;
    confidence: number;
    responseTime: number;
    sources?: any[];
  };
}

@Controller('ai-refactored')
@UseGuards(JwtAuthGuard)
export class AIRefactoredController {
  private readonly logger = new Logger(AIRefactoredController.name);

  constructor(private readonly aiOrchestrator: AIOrchestrator) {}

  /**
   * Main chat endpoint using refactored AI architecture
   */
  @Post('chat')
  async chat(
    @CurrentUser() user: User,
    @Body() request: ChatRequest,
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Process through AI Orchestrator
      const result: AIResponse = await this.aiOrchestrator.process({
        query: request.message,
        user,
        conversationId: request.conversationId,
      });

      const totalTime = Date.now() - startTime;

      this.logger.log(
        `Chat processed in ${totalTime}ms - ${this.aiOrchestrator.getProcessingSummary(result)}`
      );

      return {
        success: result.success,
        message: result.message,
        data: result.businessData?.data || result.iotCommand,
        metadata: {
          intent: result.intent,
          layer: result.processingLayer,
          confidence: result.confidence,
          responseTime: result.responseTime,
          sources: result.sources,
        },
      };
    } catch (error) {
      this.logger.error('Error in chat endpoint:', error);
      
      return {
        success: false,
        message: 'Đã có lỗi xảy ra khi xử lý câu hỏi của bạn.',
        metadata: {
          intent: 'unknown',
          layer: 'error',
          confidence: 0,
          responseTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Test intent classification
   */
  @Get('test/intent')
  async testIntent(
    @Query('query') query: string,
    @CurrentUser() user: User,
  ) {
    const result = await this.aiOrchestrator.process({
      query,
      user,
    });

    return {
      query,
      intent: result.intent,
      confidence: result.confidence,
      layer: result.processingLayer,
      // REMOVED: entities from ragResult (Layer 2 RAG disabled)
      entities: [],
    };
  }

  /**
   * Health check
   */
  @Get('health')
  async health() {
    return {
      status: 'ok',
      service: 'AI Refactored',
      timestamp: new Date().toISOString(),
    };
  }
}



