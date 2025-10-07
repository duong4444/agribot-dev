import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_AI_CONFIG } from '../constants';

// Note: For production, you would use @huggingface/inference
// For now, we'll create a structure that can be easily integrated
interface EmbeddingResponse {
  embeddings: number[][];
}

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private apiKey: string;
  private model: string;
  private dimension: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY') || '';
    this.model = DEFAULT_AI_CONFIG.embeddingModel;
    this.dimension = DEFAULT_AI_CONFIG.embeddingDimension;
  }

  async onModuleInit() {
    this.logger.log(`Embedding service initialized with model: ${this.model}`);
    if (!this.apiKey) {
      this.logger.warn('HUGGINGFACE_API_KEY not set - embeddings will use fallback');
    }
  }

  /**
   * Generate embeddings for text(s)
   */
  async embed(texts: string | string[]): Promise<number[][]> {
    const inputTexts = Array.isArray(texts) ? texts : [texts];

    try {
      if (this.apiKey) {
        return await this.embedWithHuggingFace(inputTexts);
      } else {
        // Fallback: simple hash-based embedding (for development only)
        this.logger.warn('Using fallback embedding (not suitable for production)');
        return this.fallbackEmbedding(inputTexts);
      }
    } catch (error) {
      this.logger.error('Error generating embeddings:', error);
      // Fallback on error
      return this.fallbackEmbedding(inputTexts);
    }
  }

  /**
   * Generate single embedding
   */
  async embedSingle(text: string): Promise<number[]> {
    const embeddings = await this.embed(text);
    return embeddings[0];
  }

  /**
   * Generate embeddings using HuggingFace Inference API
   */
  private async embedWithHuggingFace(texts: string[]): Promise<number[][]> {
    const url = `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: texts,
        options: {
          wait_for_model: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle both single and batch responses
    if (Array.isArray(data) && Array.isArray(data[0])) {
      if (typeof data[0][0] === 'number') {
        // Single embedding: [[0.1, 0.2, ...]]
        return [data];
      } else {
        // Batch embeddings: [[[0.1, 0.2, ...]], [[0.3, 0.4, ...]]]
        return data.map((d: any) => (Array.isArray(d[0]) ? d[0] : d));
      }
    }

    throw new Error('Unexpected response format from HuggingFace API');
  }

  /**
   * Fallback embedding (simple hash-based, NOT for production)
   * Only for development when HF API key is not available
   */
  private fallbackEmbedding(texts: string[]): number[][] {
    return texts.map(text => {
      const vector = new Array(this.dimension).fill(0);
      
      // Simple character-based hashing
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const index = charCode % this.dimension;
        vector[index] += charCode / 1000;
      }

      // Normalize
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
    });
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Get embedding dimension
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return this.model;
  }
}



