import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { GeminiService } from './gemini.service';
import { ActionRouterService } from './action-router.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { AIController } from './ai.controller';
import { FarmModule } from '../farm/farm.module';

@Module({
  imports: [
    ConfigModule,
    FarmModule, // Import FarmModule to access FarmService
  ],
  controllers: [AIController],
  providers: [AIService, GeminiService, ActionRouterService, KnowledgeBaseService],
  exports: [AIService, GeminiService, ActionRouterService, KnowledgeBaseService],
})
export class AIModule {}
