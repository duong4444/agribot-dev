import { Injectable, Logger } from '@nestjs/common';
import { IntentType, IntentClassificationResult } from '../types';
import { INTENT_PATTERNS } from '../constants';
import { normalizeText } from '../utils';
import { EntityExtractorService } from './entity-extractor.service';
import { PythonAIClientService } from './python-ai-client.service';

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  constructor(
    private readonly entityExtractor: EntityExtractorService,
    private readonly pythonAIClient: PythonAIClientService,
  ) {}

  /**
   * Classify user intent and extract entities
   * Uses Python AI Service (PhoBERT) if available, falls back to rule-based
   */
  // checkpoint1
  async classifyIntent(query: string): Promise<IntentClassificationResult> {
    const startTime = Date.now();
    const normalizedQuery = normalizeText(query);
    // lowerCase + NFC + space giữa + space đầu cuối
    console.log('normalize_prompt_text: ', normalizedQuery);

    // Try Python AI Service first
    // console.log("gọi đến port 8000/analyze");
    // TRẢ VỀ KẾT QUẢ CHO STEP1_ORCHESTRATOR
    // checkpoint2
    const pythonResult = await this.pythonAIClient.analyzeText(query, 3);
    // pythonResult === response.data từ 8000/analyze
    console.log('pythonResult_intent: ', pythonResult?.intent);
    console.log(
      'pythonResult_entities_!!!!!!!!!!!!!: ',
      pythonResult?.entities,
    );

    if (pythonResult && pythonResult.intent_confidence > 0.7) {
      // Use Python AI Service results
      console.log('!!!DÙNG PYTHON CHO INENT CLASSIFIER!!!');

      this.logger.debug('Using Python AI Service (PhoBERT) classification');

      const intent = this.pythonAIClient.convertToIntentType(
        pythonResult.intent,
      );
      console.log(
        'intent_convertToIntentType_aka_intent_trả_về_step1_orchest: ',
        intent,
      );

      const entities = pythonResult.entities.map((e) =>
        this.pythonAIClient.convertToEntity(e),
      );
      console.log(
        'entities_convertToEntity_aka_entities_trả_về_step1_orchest: ',
        entities,
      );

      const processingTime = Date.now() - startTime;

      return {
        intent,
        confidence: pythonResult.intent_confidence,
        entities,
        originalQuery: query,
        normalizedQuery,
      };
    }

    // Fallback to rule-based
    console.log('RULE-BASED INTENT');

    this.logger.debug(
      'Using rule-based classification (Python AI Service not available or low confidence)',
    );

    // Extract entities first
    const entities = this.entityExtractor.extractEntities(query);

    // Determine intent based on patterns
    const intent = this.determineIntent(normalizedQuery); //  return analytics_query,...
    const confidence = this.calculateConfidence(normalizedQuery, intent);

    const result: IntentClassificationResult = {
      intent,
      confidence,
      entities,
      originalQuery: query,
      normalizedQuery,
    };

    const processingTime = Date.now() - startTime;
    this.logger.debug(
      `Intent classified: ${intent} (confidence: ${confidence.toFixed(2)}) in ${processingTime}ms`,
    );

    return result;
  }

  /**
   * Determine intent based on rule-based patterns
   */
  private determineIntent(normalizedQuery: string): IntentType {
    // Priority order matters!

    // 1. Device Control (highest priority for action keywords)
    if (this.matchesPatterns(normalizedQuery, INTENT_PATTERNS.DEVICE_CONTROL)) {
      return IntentType.DEVICE_CONTROL;
    }

    // 2. Financial Query
    if (
      this.matchesPatterns(normalizedQuery, INTENT_PATTERNS.FINANCIAL_QUERY)
    ) {
      return IntentType.FINANCIAL_QUERY;
    }


    // 4. Sensor Query
    if (this.matchesPatterns(normalizedQuery, INTENT_PATTERNS.SENSOR_QUERY)) {
      return IntentType.SENSOR_QUERY;
    }

    // 5. Knowledge Query (explicit knowledge-seeking patterns)
    if (
      this.matchesPatterns(normalizedQuery, INTENT_PATTERNS.KNOWLEDGE_QUERY)
    ) {
      return IntentType.KNOWLEDGE_QUERY;
    }

    // 6. Default to Knowledge Query
    return IntentType.KNOWLEDGE_QUERY;
  }

  /**
   * Check if query matches any pattern in the list
   */
  private matchesPatterns(query: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(query));
  }

  /**
   * Calculate confidence score for the detected intent
   */
  private calculateConfidence(query: string, intent: IntentType): number {
    const patterns = this.getIntentPatterns(intent); // regex của các intent
    if (!patterns) return 0.5;

    let maxScore = 0;

    patterns.forEach((pattern) => {
      const matches = query.match(pattern);
      if (matches) {
        // Score based on match coverage
        const matchLength = matches[0].length;
        const queryLength = query.length;
        const score = Math.min(matchLength / queryLength, 1.0);
        maxScore = Math.max(maxScore, score);
      }
    });

    // Boost confidence if multiple patterns match
    const matchCount = patterns.filter((p) => p.test(query)).length;
    const boost = Math.min(matchCount * 0.1, 0.3);

    return Math.min(maxScore + boost, 1.0);
  }

  /**
   * Get patterns for specific intent
   */
  private getIntentPatterns(intent: IntentType): RegExp[] | null {
    switch (intent) {
      case IntentType.FINANCIAL_QUERY:
        return INTENT_PATTERNS.FINANCIAL_QUERY;
      case IntentType.DEVICE_CONTROL:
        return INTENT_PATTERNS.DEVICE_CONTROL;
      case IntentType.SENSOR_QUERY:
        return INTENT_PATTERNS.SENSOR_QUERY;
      case IntentType.KNOWLEDGE_QUERY:
        return INTENT_PATTERNS.KNOWLEDGE_QUERY;
      default:
        return null;
    }
  }

  /**
   * Get intent category (knowledge vs action)
   */
  getIntentCategory(intent: IntentType): 'knowledge' | 'action' {
    const actionIntents = [
      IntentType.FINANCIAL_QUERY,
      IntentType.SENSOR_QUERY,
      IntentType.DEVICE_CONTROL,
    ];

    return actionIntents.includes(intent) ? 'action' : 'knowledge';
  }

  /**
   * Check if intent requires database access
   */
  requiresDatabase(intent: IntentType): boolean {
    return [
      IntentType.FINANCIAL_QUERY,
      IntentType.SENSOR_QUERY,
    ].includes(intent);
  }

  /**
   * Check if intent requires IoT action
   */
  requiresIoT(intent: IntentType): boolean {
    return [IntentType.DEVICE_CONTROL, IntentType.SENSOR_QUERY].includes(
      intent,
    );
  }
}
