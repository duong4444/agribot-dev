import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Document } from './entities';
// REMOVED: DocumentChunk - table dropped from database
import { CropKnowledgeChunk } from './entities/crop-knowledge-chunk.entity';
import { RagDocument, RagChunk } from './entities';

// Existing services
import { GeminiService } from './gemini.service';

// New refactored services
import {
  PreprocessingService,
  EntityExtractorService,
  IntentClassifierService,
  LLMFallbackService,
  ActionRouterService,
  AIOrchestrator,
  PythonAIClientService,
} from './services';

// Layer 2 RAG Services
import { EmbeddingService } from './services/embedding.service';
import { ChunkingService } from './services/chunking.service';
import { VectorStoreService } from './services/vector-store.service';
import { RAGService } from './services/rag.service';
import { RagDocumentService } from './services/rag-document.service';

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

// Guards
import { AdminGuard } from './guards/admin.guard';

// Other modules
import { FarmModule } from '../farm/farm.module';
import { AIRefactoredController } from './ai-refactored.controller';
import { AdminDocumentController } from './controllers/admin-document.controller';
import { AdminCropKnowledgeController } from './controllers/admin-crop-knowledge.controller';
import { AdminRagDocumentController } from './controllers/admin-rag-document.controller';
import { PublicDebugController } from './controllers/public-debug.controller';

@Module({
  imports: [
    ConfigModule,
    // REMOVED: DocumentChunk from entities (table dropped)
    TypeOrmModule.forFeature([Document, CropKnowledgeChunk, RagDocument, RagChunk]),
    FarmModule,
  ],
  controllers: [
    AIRefactoredController, 
    AdminDocumentController, 
    AdminCropKnowledgeController,
    AdminRagDocumentController, // Layer 2 RAG
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
    LLMFallbackService,
    ActionRouterService,
    AIOrchestrator,
    
    // Layer 2 RAG Services
    EmbeddingService,
    ChunkingService,
    VectorStoreService,
    RAGService,
    RagDocumentService,

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

    // Guards
    AdminGuard,
  ],
  exports: [
    GeminiService,
    AIOrchestrator,
    IntentClassifierService,
    ExactMatchV2Service,
    RAGService, // Layer 2 RAG enabled
    ActionRouterService,
    CropKnowledgeFTSService,
    CropKnowledgeService,
  ],
})
export class AIRefactoredModule {}
