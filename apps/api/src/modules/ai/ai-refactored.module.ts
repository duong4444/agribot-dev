import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Document, DocumentChunk } from './entities';

// Existing services
import { GeminiService } from './gemini.service';

// New refactored services
import {
  PreprocessingService,
  EntityExtractorService,
  IntentClassifierService,
  ExactMatchService,
  EmbeddingService,
  VectorSearchService,
  RAGService,
  LLMFallbackService,
  ActionRouterService,
  AIOrchestrator,
  PythonAIClientService,
} from './services';

// Other modules
import { FarmModule } from '../farm/farm.module';
// import { AIController } from './ai.controller'; // Removed old controller
import { AIRefactoredController } from './ai-refactored.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Document, DocumentChunk]),
    FarmModule,
  ],
  controllers: [AIRefactoredController],
  providers: [
    // Existing
    GeminiService,
    
    // Python AI Client
    PythonAIClientService,
    
    // Refactored services
    PreprocessingService,
    EntityExtractorService,
    IntentClassifierService,
    ExactMatchService,
    EmbeddingService,
    VectorSearchService,
    RAGService,
    LLMFallbackService,
    ActionRouterService,
    AIOrchestrator,
  ],
  exports: [
    GeminiService,
    AIOrchestrator,
    IntentClassifierService,
    ExactMatchService,
    RAGService,
    ActionRouterService,
  ],
})
export class AIRefactoredModule {}

