import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { GeminiService } from './gemini.service';
import { AIController } from './ai.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AIController],
  providers: [AIService, GeminiService],
  exports: [AIService, GeminiService],
})
export class AIModule {}
