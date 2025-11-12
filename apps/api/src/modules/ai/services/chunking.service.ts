import { Injectable, Logger } from '@nestjs/common';

export interface ChunkingConfig {
  maxChunkSize: number; // characters
  overlapSentences: number; // number of sentences to overlap
  minChunkSize: number; // minimum chunk size
}

export interface Chunk {
  content: string;
  startPosition: number;
  endPosition: number;
  tokens: number;
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  /**
   * Sentence-based chunking with overlap
   */
  async chunkDocument(
    content: string,
    config: ChunkingConfig = {
      maxChunkSize: 500,
      overlapSentences: 1,
      minChunkSize: 100,
    },
  ): Promise<Chunk[]> {
    // 1. Normalize text
    const normalized = content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // 2. Split by sentences (Vietnamese sentence endings)
    const sentences = normalized.split(/(?<=[.!?])\s+/);
    
    this.logger.debug(`Split into ${sentences.length} sentences`);

    // 3. Group into chunks
    const chunks: Chunk[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;
    let startPos = 0;

    for (const sentence of sentences) {
      // If adding this sentence exceeds maxChunkSize
      if (currentSize + sentence.length > config.maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        const chunkContent = currentChunk.join(' ');
        chunks.push({
          content: chunkContent,
          startPosition: startPos,
          endPosition: startPos + chunkContent.length,
          tokens: this.estimateTokens(chunkContent),
        });

        // Start new chunk with overlap
        const overlapContent = currentChunk.slice(-config.overlapSentences).join(' ');
        startPos += chunkContent.length - overlapContent.length;
        currentChunk = currentChunk.slice(-config.overlapSentences);
        currentSize = overlapContent.length;
      }

      currentChunk.push(sentence);
      currentSize += sentence.length;
    }

    // Add last chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join(' ');
      if (chunkContent.length >= config.minChunkSize) {
        chunks.push({
          content: chunkContent,
          startPosition: startPos,
          endPosition: startPos + chunkContent.length,
          tokens: this.estimateTokens(chunkContent),
        });
      }
    }

    this.logger.log(`Created ${chunks.length} chunks from ${content.length} characters`);
    
    return chunks;
  }

  private estimateTokens(text: string): number {
    // Vietnamese: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
