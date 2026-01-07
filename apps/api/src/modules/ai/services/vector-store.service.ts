import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagChunk } from '../entities/rag-chunk.entity';

export interface SimilaritySearchOptions {
  topK: number;
  threshold: number;
  userId?: string;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @InjectRepository(RagChunk)
    private readonly ragChunkRepo: Repository<RagChunk>,
  ) {}

  /**
   * Similarity search using pgvector cosine distance
   */
  // cprag2
  async similaritySearch(
    queryEmbedding: number[], // vector embedding 768 dimensions
    options: SimilaritySearchOptions, // topK, threshold =0.4, userId
  ): Promise<RagChunk[]> {
    try {
      // Convert embedding array to pgvector format string
      // pgvector yêu cầu format string đặc biệt
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      // Input:  [0.1, 0.2, 0.3, ...]
      // Output: "[0.1,0.2,0.3,...]"
      // console.log("embeddingStr: ",embeddingStr);
      
      // Build raw SQL query for better control
      let sql = `
        SELECT 
          c.id,
          c.content,
          c.chunk_index as "chunkIndex",
          c.rag_document_id as "documentId",
          c.created_at as "createdAt",
          d.original_name as "documentName",
          1 - (c.embedding_vector <=> $1::vector) as similarity
        FROM rag_chunks c
        LEFT JOIN rag_documents d ON c.rag_document_id = d.id
        WHERE c.embedding_vector IS NOT NULL
          AND 1 - (c.embedding_vector <=> $1::vector) >= $2
      `;

      const params: any[] = [embeddingStr, options.threshold];

      sql += `
        ORDER BY similarity DESC
        LIMIT $${params.length + 1}
      `;
      // LIMIT $3
      params.push(options.topK);

      this.logger.debug(`Executing similarity search with threshold ${options.threshold}`);
      this.logger.debug(`SQL Query: ${sql}`);
      // this.logger.debug(`Parameters: ${JSON.stringify(params.slice(0, 2))} + embedding + ${params.slice(2)}`);
      // SELECT ...
      // FROM rag_chunks c
      // LEFT JOIN rag_documents d ON c.rag_document_id = d.id
      // WHERE 1 - (c.embedding::vector <=> $1::vector) >= $2
      // ORDER BY similarity DESC
      // LIMIT $3
      // $1 = "[0.1,0.2,...,0.768]"
      // $2 = 0.35
      // $3 = 5
      const results = await this.ragChunkRepo.query(sql, params);

      this.logger.debug(`Found ${results.length} similar chunks`);
      
      // Debug: If no results, try without threshold
      if (results.length === 0) {
        this.logger.debug('No results found, trying without threshold...');
        const debugSql = `
          SELECT 
            c.id,
            c.content,
            c.chunk_index as "chunkIndex",
            c.rag_document_id as "documentId",
            c.created_at as "createdAt",
            d.original_name as "documentName",
            1 - (c.embedding_vector <=> $1::vector) as similarity
          FROM rag_chunks c
          LEFT JOIN rag_documents d ON c.rag_document_id = d.id
          WHERE c.embedding_vector IS NOT NULL
          ORDER BY c.embedding_vector <=> $1::vector
          LIMIT 3
        `;
        
        const debugResults = await this.ragChunkRepo.query(debugSql, [embeddingStr]);
        this.logger.debug(`Debug - Top 3 similarities: ${JSON.stringify(debugResults.map(r => ({
          similarity: parseFloat(r.similarity).toFixed(4),
          contentPreview: r.content.substring(0, 50) + '...'
        })))}`);
      }

      // Map results to RagChunk objects with similarity
      return results.map(row => {
        const chunk = new RagChunk();
        chunk.id = row.id;
        chunk.content = row.content;
        chunk.chunkIndex = row.chunkIndex;
        chunk.ragDocumentId = row.documentId;
        chunk.createdAt = row.createdAt;
        chunk.similarity = parseFloat(row.similarity);
        
        // Attach document info
        if (row.documentName) {
          chunk.ragDocument = { originalName: row.documentName } as any;
        }
        
        return chunk;
      });
      
    } catch (error) {
      this.logger.error('Error in similarity search:', error);
      this.logger.error('Error details:', error.message);
      throw error;
    }
  }
}
