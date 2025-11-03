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
import { ExactMatchV2Service } from './exact-match-v2.service';
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
    private readonly exactMatch: ExactMatchV2Service,
    private readonly rag: RAGService,
    private readonly llmFallback: LLMFallbackService,
    private readonly actionRouter: ActionRouterService,
  ) {}

  /**
   * Main orchestration method - Process user query through intelligent routing
   * Step 1: Intent Classification & Entity Extraction
   * Step 2: Route based on intent:
   *   - UNKNOWN → Direct LLM (skip 3-layer for efficiency)
   *   - ACTION → Action Router (database/IoT)
   *   - KNOWLEDGE → 3-Layer (Exact → RAG → LLM)
   */
  async process(request: ProcessRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const { query, user } = request;

    this.logger.log(`Processing query: "${query}" for user ${user.id}`);

    try {
      // Step 1: Intent Classification & Entity Extraction
      console.log(
        'STEP1 trong orchest==========INTENT CLASSIFIER & NER ==================',
      );
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
      console.log(
        'STEP2 trong orchest=============== UNKNOWN || CHECK <ACTION || KNOWLEDGE>=============',
      );

      // Special handling for UNKNOWN intent
      if (intentResult.intent === IntentType.UNKNOWN) {
        console.log(
          '======================UNKNOWN_INTENT=======================',
        );
        this.logger.log(
          '⚠️ Unknown intent detected, validating query scope',
        );

        // Validate if query is agriculture-related or acceptable
        const validationResult = this.validateUnknownQuery(query);
        
        if (!validationResult.isValid) {
          // Reject off-topic or spam queries
          this.logger.warn(`❌ Query rejected: ${validationResult.reason}`);
          console.log("PROMPT REJECTED: ", validationResult.reason);
          
          return {
            success: false,
            message: 'Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi liên quan đến nông nghiệp. Vui lòng hỏi về cây trồng, chăm sóc, thiết bị, hoặc quản lý nông trại.',
            intent: IntentType.UNKNOWN,
            processingLayer: ProcessingLayer.LLM_FALLBACK,
            confidence: 0,
            responseTime: Date.now() - startTime,
            error: {
              code: 'OUT_OF_SCOPE',
              message: validationResult.reason || 'Query is out of scope',
              layer: ProcessingLayer.LLM_FALLBACK,
            },
          };
        }

        // Allow only greetings, thanks, and agriculture-related unknowns
        console.log('✅ Query validated, using direct LLM');
        const llmResult = await this.llmFallback.generateResponse(query, {
          reason: 'Unknown intent - greeting or agriculture-related query',
        });

        return {
          success: true,
          message: llmResult.answer,
          intent: IntentType.UNKNOWN,
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
      // action || knowledge
      const intentCategory = this.intentClassifier.getIntentCategory(
        intentResult.intent,
      );

      console.log(
        'intent_category_|->ACTION || KNOWLEDGE<-|_ai_orchestrator: ',
        intentCategory,
      );

      if (intentCategory === 'action') {
        // Action intents: query database or control devices
        console.log(
          '======================ACTION_CATEGORY================================',
        );

        return await this.processActionIntent(intentResult, user, startTime);
      } else {
        // Knowledge intents: 3-layer knowledge retrieval
        console.log(
          '======================KNOWLEDGE_CATEGORY=======================',
        );
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
    console.log(
      '.............................TRY LAYER1_FTS..................................................',
    );
    const exactResult = await this.exactMatch.findExactMatch(query, user.id);
    console.log('_orchestrator_ exactResult_layer1_FTS: ', exactResult);

    if (
      exactResult.found &&
      exactResult.confidence >= DEFAULT_AI_CONFIG.exactMatchThreshold // 0.9
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
    console.log(
      '.....................................TRY LAYER2_RAG............................................',
    );

    this.logger.debug('Attempting Layer 2: RAG');
    const ragResult = await this.rag.retrieve(query, {
      userId: user.id,
      useHybrid: true,
    });
    console.log('ragResult_layer2_RAG: ', ragResult);

    if (
      ragResult.found &&
      ragResult.confidence >= DEFAULT_AI_CONFIG.ragConfidenceThreshold // 0.7
    ) {
      this.logger.log('✓ Layer 2 (RAG) succeeded');
      console.log('PROCESSING LAYER2');

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
    console.log(
      '..................................LAYER3 FALLBACK LLM...............................',
    );

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
   * Validate UNKNOWN queries to prevent abuse and off-topic requests
   */
  private validateUnknownQuery(query: string): { isValid: boolean; reason?: string } {
    const queryLower = query.toLowerCase().trim();
    
    // 1. Allow common greetings and polite phrases (short phrases)
    const allowedGreetings = [
      'xin chào', 'chào', 'hello', 'hi', 'hey',
      'cảm ơn', 'thanks', 'thank you', 'cám ơn',
      'tạm biệt', 'bye', 'goodbye', 'chào tạm biệt',
      'ok', 'okay', 'được', 'rồi', 'oke',
    ];
    
    if (allowedGreetings.some(greeting => queryLower === greeting || queryLower.includes(greeting)) && queryLower.length < 30) {
      return { isValid: true };
    }
    
    // 2. Reject obvious programming/coding queries
    const codingKeywords = [
      'viết chương trình', 'code', 'programming', 'python', 'javascript', 'java', 'c++',
      'html', 'css', 'function', 'class', 'algorithm', 'thuật toán',
      'lập trình', 'debug', 'compile', 'syntax', 'hello world',
      'code', 'script', 'php', 'ruby', 'sql query', 'database schema',
    ];
    
    if (codingKeywords.some(keyword => queryLower.includes(keyword))) {
      return { 
        isValid: false, 
        reason: 'Programming/coding query detected - out of agriculture scope' 
      };
    }
    
    // 3. Reject other non-agriculture topics
    const offTopicKeywords = [
      'toán học', 'vật lý', 'hóa học', 'math', 'physics', 'chemistry',
      'giải phương trình', 'tính tích phân', 'integral', 'derivative',
      'lịch sử', 'địa lý', 'history', 'geography',
      'bóng đá', 'football', 'soccer', 'basketball',
      'điện ảnh', 'phim', 'movie', 'film',
      'âm nhạc', 'music', 'bài hát', 'song',
      'du lịch', 'travel', 'khách sạn', 'hotel',
      'y tế', 'bệnh viện', 'thuốc', 'medicine', 'doctor',
    ];
    
    if (offTopicKeywords.some(keyword => queryLower.includes(keyword))) {
      return { 
        isValid: false, 
        reason: 'Off-topic query detected - not related to agriculture' 
      };
    }
    
    // 4. Check if query might be agriculture-related (fuzzy match)
    const agricultureKeywords = [
      // General
      'nông', 'farm', 'crop', 'plant', 'trồng', 'cây',
      // Specific
      'lúa', 'rau', 'cà', 'đất', 'phân', 'bón', 'tưới',
      'máy', 'thiết bị', 'cảm biến', 'nhiệt độ', 'độ ẩm',
      'thu hoạch', 'gieo', 'chăm sóc', 'vườn', 'ruộng',
    ];
    
    const hasAgricultureKeyword = agricultureKeywords.some(keyword => 
      queryLower.includes(keyword)
    );
    
    if (hasAgricultureKeyword) {
      return { isValid: true };
    }
    
    // 5. Allow short queries (might be follow-up questions or unclear)
    // But limit very long queries (likely spam)
    if (queryLower.length < 10) {
      return { isValid: true }; // Allow short unclear queries
    }
    
    if (queryLower.length > 200) {
      return { 
        isValid: false, 
        reason: 'Query too long - possible spam or off-topic' 
      };
    }
    
    // 6. Default: Allow but with caution (might be agriculture-related but unclear)
    // LLM will be prompted to stay in agriculture domain
    return { isValid: true };
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
