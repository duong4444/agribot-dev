import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Document } from './entities';
// REMOVED: DocumentChunk - table dropped from database
import { CropKnowledgeChunk } from './entities/crop-knowledge-chunk.entity';
import { RagDocument, RagChunk } from './entities';
import { Device } from '../iot/entities/device.entity';
import { Area } from '../farms/entities/area.entity';
import { SensorData } from '../iot/entities/sensor-data.entity';
import { Farm } from '../farms/entities/farm.entity';
import { FarmActivity } from '../farms/entities/farm-activity.entity';


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
// Other modules
// import { FarmModule } from '../farm/farm.module'; // REMOVED: Farm module will be rebuilt
import { IoTModule } from '../iot/iot.module';
import { UsersModule } from '../users/users.module';
import { AIRefactoredController } from './ai-refactored.controller';
import { AdminDocumentController } from './controllers/admin-document.controller';
import { AdminCropKnowledgeController } from './controllers/admin-crop-knowledge.controller';
import { AdminRagDocumentController } from './controllers/admin-rag-document.controller';
import { PublicDebugController } from './controllers/public-debug.controller';

// Handlers
import { DeviceControlHandler } from './handlers/device-control.handler';
import { SensorQueryHandler } from './handlers/sensor-query.handler';
import { FinancialQueryHandler } from './handlers/financial-query.handler';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Document, CropKnowledgeChunk, RagDocument, RagChunk, Device, Area, SensorData, Farm, FarmActivity]),
    // FarmModule, // REMOVED: Will be rebuilt later
    IoTModule, // For device control
    UsersModule, // For subscription management
  ],
  controllers: [
    AIRefactoredController, 
    AdminDocumentController, 
    AdminCropKnowledgeController,
    AdminRagDocumentController, 
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

    // Layer 1 Enhanced Services (FTS + Query Preprocessing, no caching)
    QueryPreprocessorService,
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

    // Handlers
    DeviceControlHandler,
    SensorQueryHandler,
    FinancialQueryHandler,
  ],
  exports: [
    GeminiService,
    AIOrchestrator,
    IntentClassifierService,
    ExactMatchV2Service,
    RAGService, 
    ActionRouterService,
    CropKnowledgeFTSService,
    CropKnowledgeService,
  ],
})
export class AIRefactoredModule {}
