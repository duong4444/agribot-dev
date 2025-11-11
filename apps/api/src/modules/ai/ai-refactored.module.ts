import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Document } from './entities';
// REMOVED: DocumentChunk - table dropped from database
import { CropKnowledgeChunk } from './entities/crop-knowledge-chunk.entity';

// Existing services
import { GeminiService } from './gemini.service';

// New refactored services
import {
  PreprocessingService,
  EntityExtractorService,
  IntentClassifierService,
  // REMOVED: EmbeddingService - Layer 2 RAG disabled
  // REMOVED: VectorSearchService - Layer 2 RAG disabled
  // REMOVED: RAGService - Layer 2 RAG disabled
  LLMFallbackService,
  ActionRouterService,
  AIOrchestrator,
  PythonAIClientService,
} from './services';

// Layer 1 Enhanced Services
// REMOVED: import { ExactMatchEnhancedService } from './services/exact-match-enhanced.service';
import { SearchCacheService } from './services/search-cache.service';
import { ExactMatchV2Service } from './services/exact-match-v2.service';
import { QueryPreprocessorService } from './services/query-preprocessor.service';
// Crop Knowledge Services (Refactored Layer 1)
import { MarkdownChunkingService } from './services/markdown-chunking.service';
import { CropKnowledgeService } from './services/crop-knowledge.service';
import { CropKnowledgeFTSService } from './services/crop-knowledge-fts.service';

// Document Management Services
import { DocumentService } from './services/document.service';
import { TextExtractionService } from './services/text-extraction.service';
// REMOVED: ChunkingService - Layer 2 RAG disabled

// Guards
import { AdminGuard } from './guards/admin.guard';

// Other modules
import { FarmModule } from '../farm/farm.module';
import { AIRefactoredController } from './ai-refactored.controller';
import { AdminDocumentController } from './controllers/admin-document.controller';
import { AdminCropKnowledgeController } from './controllers/admin-crop-knowledge.controller';
import { PublicDebugController } from './controllers/public-debug.controller';

@Module({
  imports: [
    ConfigModule,
    // REMOVED: DocumentChunk from entities (table dropped)
    TypeOrmModule.forFeature([Document, CropKnowledgeChunk]),
    FarmModule,
  ],
  controllers: [
    AIRefactoredController, 
    AdminDocumentController, 
    AdminCropKnowledgeController,
    PublicDebugController, // For testing only
  ],
  providers: [
    // Existing
    GeminiService,

    // Python AI Client
    PythonAIClientService,

    // Refactored services
    PreprocessingService,
    EntityExtractorService,
    IntentClassifierService,
    // REMOVED: EmbeddingService - Layer 2 RAG disabled
    // REMOVED: VectorSearchService - Layer 2 RAG disabled
    // REMOVED: RAGService - Layer 2 RAG disabled
    LLMFallbackService,
    ActionRouterService,
    AIOrchestrator,

    // Layer 1 Enhanced Services (FTS + Caching + Query Preprocessing)
    QueryPreprocessorService,
    SearchCacheService,
    // REMOVED: ExactMatchEnhancedService - uses DocumentChunk (deleted)
    ExactMatchV2Service,
    
    // Crop Knowledge Services (Refactored Layer 1)
    MarkdownChunkingService,
    CropKnowledgeService,
    CropKnowledgeFTSService,

    // Document Management Services
    DocumentService,
    TextExtractionService,
    // REMOVED: ChunkingService - Layer 2 RAG disabled

    // Guards
    AdminGuard,
  ],
  exports: [
    GeminiService,
    AIOrchestrator,
    IntentClassifierService,
    ExactMatchV2Service,
    // REMOVED: RAGService - Layer 2 RAG disabled
    ActionRouterService,
    CropKnowledgeFTSService,
    CropKnowledgeService,
  ],
})
export class AIRefactoredModule {}
