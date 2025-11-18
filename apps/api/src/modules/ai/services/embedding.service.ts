import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddingApiUrl = process.env.EMBEDDING_API_URL || 'http://localhost:8001';
  private client: AxiosInstance;

  onModuleInit() {
    this.client = axios.create({
      baseURL: this.embeddingApiUrl,
      timeout: 30000, // 30s timeout
    });
    
    this.healthCheck();
  }

  private async healthCheck() {
    try {
      const response = await this.client.get('/health');
      this.logger.log(`✅ Embedding service healthy: ${JSON.stringify(response.data)}`);
    } catch (error) {
      this.logger.error('❌ Embedding service not available:', error.message);
      this.logger.warn('Make sure Python embedding service is running at ' + this.embeddingApiUrl);
    }
  }

  /**
   * Generate embedding cho 1 text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Truncate to max length (256 tokens ≈ 1000 chars for Vietnamese)
      const truncated = text.substring(0, 1000);
      
      this.logger.debug(`Generating embedding for text: "${truncated.substring(0, 50)}..."`);
      
      const response = await this.client.post('/embed', {
        texts: [truncated],
        normalize: true,
      });
      
      const embedding = response.data.embeddings[0];
      // console.log("embedding: ",embedding);
      
      this.logger.debug(`Generated embedding with ${embedding.length} dimensions`);
      this.logger.debug(`First 5 values: [${embedding.slice(0, 5).join(', ')}]`);
      
      return embedding;
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      if (error.response) {
        this.logger.error('Response status:', error.response.status);
        this.logger.error('Response data:', JSON.stringify(error.response.data));
      }
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings cho nhiều texts (batch)
   */
  async generateEmbeddingsBatch(
    texts: string[],
    batchSize = 32,
  ): Promise<number[][]> {
    try {
      this.logger.log(`Generating embeddings for ${texts.length} texts`);
      
      // Truncate all texts
      const truncated = texts.map(t => t.substring(0, 1000));
      
      // Process in batches to avoid memory issues
      const allEmbeddings: number[][] = [];
      
      for (let i = 0; i < truncated.length; i += batchSize) {
        const batch = truncated.slice(i, i + batchSize);
        
        this.logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(truncated.length / batchSize)}`);
        
        const response = await this.client.post('/embed-batch', {
          texts: batch,
          normalize: true,
        });
        
        allEmbeddings.push(...response.data.embeddings);
      }
      
      this.logger.log(`✅ Generated ${allEmbeddings.length} embeddings`);
      return allEmbeddings;
      
    } catch (error) {
      this.logger.error('Error generating batch embeddings:', error);
      throw new Error(`Batch embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between 2 vectors
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
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}
