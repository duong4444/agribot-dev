import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIService } from './ai.service';
import { GeminiService } from './gemini.service';

export class TestAIRequest {
  message: string;
}

export class TestAIResponse {
  content: string;
  intent: string;
  confidence: number;
  metadata: any;
  geminiConfigured: boolean;
}

@ApiTags('AI Testing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AIController {
  constructor(
    private aiService: AIService,
    private geminiService: GeminiService,
  ) {}

  @Post('test')
  @ApiOperation({ summary: 'Test AI response generation' })
  @ApiResponse({
    status: 200,
    description: 'AI response generated successfully',
    type: TestAIResponse,
  })
  async testAI(@Body() request: TestAIRequest): Promise<TestAIResponse> {
    try {
      // Analyze intent
      const intentAnalysis = await this.aiService.analyzeIntent(request.message);
      
      // Generate response
      const aiResponse = await this.aiService.generateResponse(
        request.message,
        intentAnalysis
      );

      return {
        content: aiResponse.content,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        metadata: aiResponse.metadata,
        geminiConfigured: this.geminiService.isGeminiConfigured(),
      };
    } catch (error) {
      return {
        content: 'Error generating AI response: ' + error.message,
        intent: 'error',
        confidence: 0,
        metadata: { error: error.message },
        geminiConfigured: this.geminiService.isGeminiConfigured(),
      };
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get AI service status' })
  @ApiResponse({
    status: 200,
    description: 'AI service status',
  })
  async getAIStatus() {
    const isConfigured = this.geminiService.isGeminiConfigured();
    const models = await this.geminiService.getAvailableModels();
    const connectionTest = await this.geminiService.testConnection();

    return {
      geminiConfigured: isConfigured,
      availableModels: models,
      connectionTest: connectionTest,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('test-gemini')
  @ApiOperation({ summary: 'Test Gemini connection directly' })
  @ApiResponse({
    status: 200,
    description: 'Gemini test result',
  })
  async testGemini(@Body() request: TestAIRequest) {
    try {
      const response = await this.geminiService.generateResponse(
        `Test message: ${request.message}`,
        {
          temperature: 0.7,
          maxTokens: 100,
        }
      );

      return {
        success: true,
        response: response,
        configured: this.geminiService.isGeminiConfigured(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        configured: this.geminiService.isGeminiConfigured(),
      };
    }
  }
}
