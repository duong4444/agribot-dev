import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IntentType, Entity, EntityType } from '../types';

export interface PythonAIResponse {
  success: boolean;
  intent: string;
  intent_confidence: number;
  all_intents: Array<{ intent: string; confidence: number }>;
  entities: Entity[];
  processing_time_ms: number;
}

@Injectable()
export class PythonAIClientService {
  private readonly logger = new Logger(PythonAIClientService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private isAvailable: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('PYTHON_AI_SERVICE_URL', 'http://localhost:8000');
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Check service availability on init
    this.checkAvailability();
  }

  /**
   * Check if Python AI service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      this.isAvailable = response.data.status === 'healthy';
      
      if (this.isAvailable) {
        this.logger.log('✅ Python AI Service is available');
      } else {
        this.logger.warn('⚠️ Python AI Service is not healthy');
      }
      
      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;
      this.logger.warn('❌ Python AI Service is not available. Falling back to rule-based.');
      return false;
    }
  }

  /**
   * Analyze text (Intent + NER) using Python AI service
   */
  async analyzeText(text: string, topK: number = 3): Promise<PythonAIResponse | null> {
    if (!this.isAvailable) {
      this.logger.debug('Python AI Service not available, skipping PhoBERT analysis');
      return null;
    }

    try {
      const startTime = Date.now();
      console.log("post đến 8000/analyze..........................................");
      
      const response = await this.client.post<PythonAIResponse>('/analyze', {
        text,
        top_k: topK,
      });

      console.log("INTENT trả về từ 8000/analyze: ",response.data.intent);
      console.log("entities trả về từ 8000/analyze: ",response.data.entities);

      
      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `Python AI Analysis: Intent=${response.data.intent}, ` +
        `Entities=${response.data.entities.length}, ` +
        `Time=${processingTime}ms`
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Python AI Service analysis error: ${error.message}`);
      return null;
    }
  }

  /**
   * Classify intent using Python AI service
   */
  async classifyIntent(text: string, topK: number = 3): Promise<any> {
    if (!this.isAvailable) {
      this.logger.debug('Python AI Service not available, skipping PhoBERT classification');
      return null;
    }

    try {
      const response = await this.client.post('/intent/classify', {
        text,
        top_k: topK,
      });

      this.logger.debug(
        `Python AI Intent: ${response.data.intent} (confidence: ${response.data.confidence.toFixed(2)})`
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Python AI Service intent classification error: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract entities using Python AI service
   */
  async extractEntities(text: string): Promise<any> {
    if (!this.isAvailable) {
      this.logger.debug('Python AI Service not available, skipping PhoBERT NER');
      return null;
    }

    try {
      const response = await this.client.post('/ner/extract', {
        text,
      });

      this.logger.debug(
        `Python AI NER: Found ${response.data.entities.length} entities`
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Python AI Service NER extraction error: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert Python AI intent string to IntentType enum
   */
  convertToIntentType(pythonIntent: string): IntentType {
    const intentMap: Record<string, IntentType> = {
      'knowledge_query': IntentType.KNOWLEDGE_QUERY,
      'financial_query': IntentType.FINANCIAL_QUERY,
      'device_control': IntentType.DEVICE_CONTROL,
      'sensor_query': IntentType.SENSOR_QUERY,
      'unknown': IntentType.UNKNOWN,
    };

    return intentMap[pythonIntent] || IntentType.UNKNOWN;
  }

  /**
   * Convert Python AI entity to Entity type
   */
  convertToEntity(pythonEntity: any): Entity {
    const entityTypeMap: Record<string, EntityType> = {
      'date': EntityType.DATE,
      'money': EntityType.MONEY,
      'crop_name': EntityType.CROP_NAME,
      'farm_area': EntityType.FARM_AREA,
      'device_name': EntityType.DEVICE_NAME,
      'activity_type': EntityType.ACTIVITY_TYPE,
      'metric': EntityType.METRIC,
    };

    return {
      type: entityTypeMap[pythonEntity.type] || EntityType.DATE,
      value: pythonEntity.value,
      raw: pythonEntity.raw,
      confidence: pythonEntity.confidence,
      position: {
        start: pythonEntity.start,
        end: pythonEntity.end,
      },
    };
  }

  /**
   * Check if service is available
   */
  getAvailability(): boolean {
    return this.isAvailable;
  }
}