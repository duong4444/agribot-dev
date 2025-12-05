import { Injectable, Logger } from '@nestjs/common';
import {
  User,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import {
  AIResponse,
  IntentType,
  ProcessingLayer,
  IntentClassificationResult,
} from '../types';
import { DEFAULT_AI_CONFIG, ERROR_MESSAGES } from '../constants';

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
    private readonly usersService: UsersService,
  ) {}

  /**
   * Main orchestration method - Process user query through intelligent routing
   * Step 1: Intent Classification & Entity Extraction
   * Step 2: Route based on intent:
   *   - UNKNOWN → Direct LLM (skip layers for efficiency)
   *   - ACTION → Action Router (database/IoT)
   *   - KNOWLEDGE → 3-Layer (Exact FTS → RAG → LLM Fallback)
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

      // ==========================================================================================
      // SUBSCRIPTION & ACCESS CONTROL CHECK
      // ==========================================================================================
      const accessCheck = await this.checkAccessAndDeductCredit(
        user,
        intentResult.intent,
      );
      console.log("ACCESS CHECK trong orchest: ",accessCheck);
      // có message trong TH access denied
      if (!accessCheck.allowed) {
        this.logger.warn(
          `Access denied for user ${user.id}: ${accessCheck.message}`,
        );
        return {
          success: false,
          message:
            accessCheck.message ||
            'Bạn không có quyền thực hiện hành động này.',
          intent: intentResult.intent,
          processingLayer: ProcessingLayer.LLM_FALLBACK,
          confidence: 0,
          responseTime: Date.now() - startTime,
          error: {
            code: 'ACCESS_DENIED',
            message: accessCheck.message || 'Access denied',
            layer: ProcessingLayer.LLM_FALLBACK,
          },
        };
      }

      // Step 2: Route based on intent category
      console.log(
        'STEP2 trong orchest=============== UNKNOWN || CHECK <ACTION || KNOWLEDGE>=============',
      );

      // Special handling for UNKNOWN intent
      if (intentResult.intent === IntentType.UNKNOWN) {
        console.log(
          '======================UNKNOWN_INTENT=======================',
        );
        this.logger.log('Unknown intent detected, validating query scope');

        // Validate if query is agriculture-related or acceptable
        const validationResult = this.validateUnknownQuery(query);

        if (!validationResult.isValid) {
          // Reject off-topic or spam queries
          this.logger.warn(`Query rejected: ${validationResult.reason}`);
          console.log('PROMPT REJECTED: ', validationResult.reason);

          return {
            success: false,
            message:
              'Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi liên quan đến nông nghiệp. Vui lòng hỏi về cây trồng, chăm sóc, thiết bị, hoặc quản lý nông trại.',
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
        console.log('Query validated, using direct LLM');
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
   * Process knowledge intent through 3 layers:
   * Layer 1: Exact Match (FTS)
   * Layer 2: RAG (Vector Search + LLM Synthesis)
   * Layer 3: LLM Fallback (Pure LLM)
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
    const exactResult = await this.exactMatch.findExactMatch(query, user.id, {
      entities: intentResult.entities, // truyền entities từ NER để lọc
    });
    console.log('_orchestrator_ exactResult_layer1_FTS: ', exactResult);
    console.log('exactResult.confidence: ', exactResult.confidence);

    // Check if exact match is confident enough
    if (
      exactResult.found &&
      (exactResult.confidence || 0) >= DEFAULT_AI_CONFIG.exactMatchThreshold // 0.9
    ) {
      this.logger.log('✓ Layer 1 (Exact Match) succeeded');
      console.log('PROCESSING LAYER1');

      return {
        success: true,
        message: exactResult.content!,
        intent: intentResult.intent,
        processingLayer: ProcessingLayer.EXACT_MATCH,
        confidence: exactResult.confidence || 0.9,
        responseTime: Date.now() - startTime,
        exactMatch: exactResult,
        sources: [
          {
            type: 'document',
            reference: exactResult.source?.filename || 'Unknown',
            confidence: exactResult.confidence || 0.9,
          },
        ],
      };
    }

    // Layer 2: RAG (Retrieval-Augmented Generation)
    console.log(
      '..................................LAYER 2: RAG...............................',
    );

    this.logger.debug('Layer 1 failed, attempting Layer 2: RAG');
    const ragResult = await this.rag.retrieve(query, {
      userId: user.id,
      topK: DEFAULT_AI_CONFIG.ragTopK,
      threshold: DEFAULT_AI_CONFIG.ragSimilarityThreshold, // 0.4
    });
    console.log('ragResult_layer2_RAG: ', ragResult);
    console.log('RESULT TỪ RAG: ', ragResult.confidence);

    console.log(
      'RAG_CONFIDENCE_THRESHOLD: ',
      DEFAULT_AI_CONFIG.ragConfidenceThreshold,
    );

    if (ragResult.confidence >= DEFAULT_AI_CONFIG.ragConfidenceThreshold) {
      // 0.5
      this.logger.log('✓ Layer 2 (RAG) succeeded');
      console.log('PROCESSING LAYER2 RAG');

      return {
        success: true,
        message: ragResult.answer,
        intent: intentResult.intent,
        processingLayer: ProcessingLayer.RAG,
        confidence: ragResult.confidence,
        responseTime: Date.now() - startTime,
        ragResult,
        sources: ragResult.sources.map((s) => ({
          type: 'rag_document' as const,
          reference: this.formatSourceName(s.documentName),
          confidence: s.similarity,
          excerpt: s.content.substring(0, 200) + '...',
        })),
        metadata: {
          retrievalTime: ragResult.retrievalTime,
          synthesisTime: ragResult.synthesisTime,
          chunksUsed: ragResult.sources.length,
        },
      };
    }

    // ========================================
    // Layer 3: LLM Fallback
    // ========================================
    console.log(
      '..................................LAYER 3: LLM FALLBACK...............................',
    );

    this.logger.debug('Layer 2 RAG failed, attempting Layer 3: LLM Fallback');
    const llmResult = await this.llmFallback.generateResponse(query, {
      reason:
        'Layer 1 FTS and Layer 2 RAG failed - no relevant documents found',
    });
    console.log('llmResult_layer3_LLM_FALLBACK: ', llmResult);

    this.logger.log('Layer 3 (LLM Fallback) completed');

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
    console.log('PROCESSSSSSSSSSSS ACTIONNNNNNNNNNNNNNNNNN');

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
  private validateUnknownQuery(query: string): {
    isValid: boolean;
    reason?: string;
  } {
    const queryLower = query.toLowerCase().trim();

    // 1. Allow common greetings and polite phrases (short phrases)
    const allowedGreetings = [
      'xin chào',
      'chào',
      'hello',
      'hi',
      'hey',
      'cảm ơn',
      'thanks',
      'thank you',
      'cám ơn',
      'tạm biệt',
      'bye',
      'goodbye',
      'chào tạm biệt',
      'ok',
      'okay',
      'được',
      'rồi',
      'oke',
    ];

    if (
      allowedGreetings.some(
        (greeting) => queryLower === greeting || queryLower.includes(greeting),
      ) &&
      queryLower.length < 30
    ) {
      return { isValid: true };
    }

    // 2. Reject obvious programming/coding queries
    const codingKeywords = [
      'viết chương trình',
      'code',
      'programming',
      'python',
      'javascript',
      'java',
      'c++',
      'html',
      'css',
      'function',
      'class',
      'algorithm',
      'thuật toán',
      'lập trình',
      'debug',
      'compile',
      'syntax',
      'hello world',
      'code',
      'script',
      'php',
      'ruby',
      'sql query',
      'database schema',
    ];

    if (codingKeywords.some((keyword) => queryLower.includes(keyword))) {
      return {
        isValid: false,
        reason: 'Programming/coding query detected - out of agriculture scope',
      };
    }

    // 3. Reject other non-agriculture topics
    const offTopicKeywords = [
      'toán học',
      'vật lý',
      'hóa học',
      'math',
      'physics',
      'chemistry',
      'giải phương trình',
      'tính tích phân',
      'integral',
      'derivative',
      'lịch sử',
      'địa lý',
      'history',
      'geography',
      'bóng đá',
      'football',
      'soccer',
      'basketball',
      'điện ảnh',
      'phim',
      'movie',
      'film',
      'âm nhạc',
      'music',
      'bài hát',
      'song',
      'du lịch',
      'travel',
      'khách sạn',
      'hotel',
      'y tế',
      'bệnh viện',
      'thuốc',
      'medicine',
      'doctor',
    ];

    if (offTopicKeywords.some((keyword) => queryLower.includes(keyword))) {
      return {
        isValid: false,
        reason: 'Off-topic query detected - not related to agriculture',
      };
    }

    // 4. Check if query might be agriculture-related (fuzzy match)
    const agricultureKeywords = [
      // General
      'nông',
      'farm',
      'crop',
      'plant',
      'trồng',
      'cây',
      // Specific
      'lúa',
      'rau',
      'cà',
      'đất',
      'phân',
      'bón',
      'tưới',
      'máy',
      'thiết bị',
      'cảm biến',
      'nhiệt độ',
      'độ ẩm',
      'thu hoạch',
      'gieo',
      'chăm sóc',
      'vườn',
      'ruộng',
    ];

    const hasAgricultureKeyword = agricultureKeywords.some((keyword) =>
      queryLower.includes(keyword),
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
        reason: 'Query too long - possible spam or off-topic',
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
      [ProcessingLayer.EXACT_MATCH]: 'Layer 1: Exact Match (FTS)',
      [ProcessingLayer.RAG]: 'Layer 2: RAG (Vector Search + LLM Synthesis)',
      [ProcessingLayer.LLM_FALLBACK]: 'Layer 3: LLM Fallback',
      [ProcessingLayer.ACTION]: 'Action Router',
    }[response.processingLayer];

    return `Processed via ${layerName} | Confidence: ${(response.confidence * 100).toFixed(0)}% | Time: ${response.responseTime}ms`;
  }

  /**
   * Format source name to be more user-friendly
   */
  private formatSourceName(originalName: string): string {
    if (!originalName || originalName === 'Unknown') {
      return 'Tài liệu không xác định';
    }

    // Remove file extensions for cleaner display
    const nameWithoutExt = originalName.replace(/\.(txt|pdf|docx?|md)$/i, '');

    // Convert underscores and hyphens to spaces
    const friendlyName = nameWithoutExt
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize first letter of each word for better readability
    const capitalizedName = friendlyName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return capitalizedName;
  }

  /**
   * Check subscription access and deduct credits if necessary
   */
  private async checkAccessAndDeductCredit(
    user: User,
    intent: IntentType,
  ): Promise<{ allowed: boolean; message?: string }> {
    // 1. Financial Query is always allowed (Operational data)
    if (intent === IntentType.FINANCIAL_QUERY) {
      return { allowed: true };
    }

    const plan = user.plan || SubscriptionPlan.FREE;
    console.log('user plan: ', plan);

    const status = user.subscriptionStatus || SubscriptionStatus.TRIAL;
    console.log('user status: ', status);

    //PREMIUM & TRIAL case 7d
    //PREMIUM & ACTIVE case 30d
    // check PREMIUM && (ACTIVE || TRIAL)
    const isPremiumActive =
      plan === SubscriptionPlan.PREMIUM &&
      (status === SubscriptionStatus.ACTIVE ||
        status === SubscriptionStatus.TRIAL);
    console.log('isPremiumActive: ', isPremiumActive);
    // FREE là chưa có IoT
    // PREMIUM là chắc chắn đã lắp IoT
    // 2. IoT Control & Sensor Query
    if (
      intent === IntentType.DEVICE_CONTROL ||
      intent === IntentType.SENSOR_QUERY
    ) {
      // CASE PREMIUM & INACTIVE => fail
      if (isPremiumActive) {
        return { allowed: true };
      } else {
        return {
          allowed: false,
          message:
            'Tính năng điều khiển IoT và xem cảm biến chỉ dành cho gói Premium. Vui lòng nâng cấp để sử dụng.',
        };
      }
    }
    // check còn credit không
    // 3. Knowledge Query & Unknown (Chatbot Q&A)
    if (
      intent === IntentType.KNOWLEDGE_QUERY ||
      intent === IntentType.UNKNOWN
    ) {
      // Check credits
      if (user.credits > 0) {
        // Deduct 1 credit
        await this.usersService.update(user.id, { credits: user.credits - 1 });
        return { allowed: true };
      } else {
        return {
          allowed: false,
          message: isPremiumActive
            ? 'Bạn đã hết credit. Vui lòng mua thêm credit để tiếp tục sử dụng !'
            : 'Bạn đã hết 10 lượt hỏi miễn phí. Vui lòng nâng cấp lên gói Premium để nhận 200 credit/tháng.',
        };
      }
    }

    // Default allow for other intents (if any)
    return { allowed: true };
  }
}
