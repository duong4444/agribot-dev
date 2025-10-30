import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import {
  AIResponse,
  IntentType,
  ProcessingLayer,
  IntentClassificationResult,
} from '../types';
import { DEFAULT_AI_CONFIG, ERROR_MESSAGES } from '../constants';

// Services
import { IntentClassifierService } from './intent-classifier.service';
import { ExactMatchService } from './exact-match.service';
import { RAGService } from './rag.service';
import { LLMFallbackService } from './llm-fallback.service';
import { ActionRouterService, ActionContext } from './action-router.service';

export interface ProcessRequest {
  query: string;
  user: User;
  conversationId?: string;
}

@Injectable()
export class AIOrchestrator {
  private readonly logger = new Logger(AIOrchestrator.name);

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly exactMatch: ExactMatchService,
    private readonly rag: RAGService,
    private readonly llmFallback: LLMFallbackService,
    private readonly actionRouter: ActionRouterService,
  ) {}

  /**
   * Main orchestration method - Process user query through 2-step architecture
   * Step 1: Intent Classification & Entity Extraction
   * Step 2: Route to Action or Knowledge processing
   */
  async process(request: ProcessRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const { query, user } = request;

    this.logger.log(`Processing query: "${query}" for user ${user.id}`);

    try {
      // Step 1: Intent Classification & Entity Extraction
      console.log("STEP1 trong orchest==========INTENT CLASSIFIER & NER ==================");
      console.log('user_query || prompt: ', query);
      
      const intentResult = await this.intentClassifier.classifyIntent(query);   
      // return {
      //   intent,
      //   confidence: pythonResult.intent_confidence,
      //   entities,
      //   originalQuery: query,
      //   normalizedQuery,
      // };
      console.log('!!!!intent_result_ai_orchestrator!!!!: ', intentResult);

      this.logger.debug(
        `Intent: ${intentResult.intent}, Confidence: ${intentResult.confidence.toFixed(2)}, Entities: ${intentResult.entities.length}`,
      );

      // Step 2: Route based on intent category
      console.log("STEP2 trong orchest===============CHECK ACTION || KNOWLEDGE=============");
      // action || knowledge
      const intentCategory = this.intentClassifier.getIntentCategory(
        intentResult.intent,
      );

      console.log('intent_category_|->ACTION || KNOWLEDGE<-|_ai_orchestrator: ', intentCategory);

      if (intentCategory === 'action') {
        // Action intents: query database or control devices
        console.log('======================ACTION_CATEGORY================================');

        return await this.processActionIntent(intentResult, user, startTime);
      } else {
        // Knowledge intents: 3-layer knowledge retrieval
        console.log('======================KNOWLEDGE_CATEGORY=======================');
        return await this.processKnowledgeIntent(intentResult, user, startTime);
      }
    } catch (error) {
      this.logger.error('Error in AI orchestration:', error);

      return {
        success: false,
        message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
        intent: IntentType.UNKNOWN,
        processingLayer: ProcessingLayer.LLM_FALLBACK,
        confidence: 0,
        responseTime: Date.now() - startTime,
        error: {
          code: 'ORCHESTRATION_ERROR',
          message: error.message,
          layer: ProcessingLayer.LLM_FALLBACK,
        },
      };
    }
  }

  /**
   * Process knowledge intent through 3 layers
   */
  private async processKnowledgeIntent(
    intentResult: IntentClassificationResult,
    user: User,
    startTime: number,
  ): Promise<AIResponse> {
    const { originalQuery: query } = intentResult;

    // Layer 1: Try Exact Match
    this.logger.debug('Attempting Layer 1: Exact Match');
    console.log('.............................TRY LAYER1_FTS..................................................');
    const exactResult = await this.exactMatch.findExactMatch(query, user.id);
    console.log('exactResult_layer1_FTS: ', exactResult);

    if (
      exactResult.found &&
      exactResult.confidence >= DEFAULT_AI_CONFIG.exactMatchThreshold
    ) {
      this.logger.log('✓ Layer 1 (Exact Match) succeeded');
      console.log('PROCESSING LAYER1');

      return {
        success: true,
        message: exactResult.content!,
        intent: intentResult.intent,
        processingLayer: ProcessingLayer.EXACT_MATCH,
        confidence: exactResult.confidence,
        responseTime: Date.now() - startTime,
        exactMatch: exactResult,
        sources: [
          {
            type: 'document',
            reference: exactResult.source?.filename || 'Unknown',
            confidence: exactResult.confidence,
          },
        ],
      };
    }

    // Layer 2: Try RAG
    console.log('.....................................TRY LAYER2_RAG............................................');

    this.logger.debug('Attempting Layer 2: RAG');
    const ragResult = await this.rag.retrieve(query, {
      userId: user.id,
      useHybrid: true,
    });
    console.log('ragResult_layer2_RAG: ', ragResult);

    if (
      ragResult.found &&
      ragResult.confidence >= DEFAULT_AI_CONFIG.ragConfidenceThreshold
    ) {
      this.logger.log('✓ Layer 2 (RAG) succeeded');
      console.log("PROCESSING LAYER2");
      
      return {
        success: true,
        message: ragResult.answer!,
        intent: intentResult.intent,
        processingLayer: ProcessingLayer.RAG,
        confidence: ragResult.confidence,
        responseTime: Date.now() - startTime,
        ragResult,
        sources: ragResult.sources.map((s) => ({
          type: 'document' as const,
          reference: s.filename,
          confidence: s.relevanceScore,
        })),
      };
    }

    // Layer 3: LLM Fallback
    console.log('..................................LAYER3 FALLBACK LLM...............................');

    this.logger.debug('Attempting Layer 3: LLM Fallback');
    const llmResult = await this.llmFallback.generateResponse(query, {
      reason: ragResult.found
        ? 'RAG confidence too low'
        : 'No relevant documents found',
    });
    console.log('llmResult_layer3_LLM_FALLBACK: ', llmResult);

    this.logger.log('✓ Layer 3 (LLM Fallback) completed');

    return {
      success: true,
      message: llmResult.answer,
      intent: intentResult.intent,
      processingLayer: ProcessingLayer.LLM_FALLBACK,
      confidence: llmResult.confidence,
      responseTime: Date.now() - startTime,
      llmResult,
      sources: [
        {
          type: 'llm',
          reference: llmResult.model,
          confidence: llmResult.confidence,
        },
      ],
    };
  }

  /**
   * Process action intent (business queries, IoT control)
   */
  private async processActionIntent(
    intentResult: IntentClassificationResult,
    user: User,
    startTime: number,
  ): Promise<AIResponse> {
    const { intent, entities, originalQuery: query } = intentResult;

    this.logger.log(`Processing action intent: ${intent}`);

    // Route to action handler
    const actionContext: ActionContext = {
      user,
      intent,
      entities,
      query,
    };

    const actionResult = await this.actionRouter.routeAction(actionContext);

    return {
      success: actionResult.success,
      message: actionResult.message,
      intent,
      processingLayer: ProcessingLayer.ACTION,
      confidence: 0.9, // Actions are deterministic
      responseTime: Date.now() - startTime,
      businessData: actionResult.businessData,
      iotCommand: actionResult.iotCommand,
      sources: actionResult.businessData
        ? [
            {
              type: 'database',
              reference: 'Farm Database',
              confidence: 1.0,
            },
          ]
        : [],
    };
  }

  /**
   * Get processing summary
   */
  getProcessingSummary(response: AIResponse): string {
    const layerName = {
      [ProcessingLayer.EXACT_MATCH]: 'Exact Match',
      [ProcessingLayer.RAG]: 'RAG',
      [ProcessingLayer.LLM_FALLBACK]: 'LLM Fallback',
      [ProcessingLayer.ACTION]: 'Action Router',
    }[response.processingLayer];

    return `Processed via ${layerName} | Confidence: ${(response.confidence * 100).toFixed(0)}% | Time: ${response.responseTime}ms`;
  }
}
