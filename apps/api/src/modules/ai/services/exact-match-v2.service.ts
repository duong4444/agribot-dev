import { Injectable, Logger } from '@nestjs/common';
import { ExactMatchResult, Entity } from '../types';
import { QueryPreprocessorService } from './query-preprocessor.service';
import { CropKnowledgeFTSService } from './crop-knowledge-fts.service';

/**
 * Exact Match V2 Service
 *
 * Layer 1 search using Crop Knowledge FTS (no caching)
 * This is the main service to use for Layer 1 searches
 */

@Injectable()
export class ExactMatchV2Service {
  private readonly logger = new Logger(ExactMatchV2Service.name);

  constructor(
    private readonly queryPreprocessor: QueryPreprocessorService,
    private readonly cropKnowledgeFTS: CropKnowledgeFTSService,
  ) {}

  /**
   * Main search method
   */
  async findExactMatch(
    query: string,
    userId?: string,
    options: {
      useExpansion?: boolean;
      useFuzzyFallback?: boolean;
      entities?: Entity[]; // Entities from NER for better filtering
    } = {},
  ): Promise<ExactMatchResult> {
    const startTime = Date.now();
    console.log(
      'chạy vào findExactMatch của exact-match-v2.service do orchestrator gọi',
    );

    // Step 1: Preprocess query to remove noise words
    const queryAnalysis = this.queryPreprocessor.analyzeQuery(query);
    let searchQuery = query;
    
    if (queryAnalysis.recommendPreprocessing) {
      const preprocessed = this.queryPreprocessor.preprocess(query);
      searchQuery = preprocessed.cleaned;
      
      this.logger.debug(
        `!!!! Query preprocessed:\n` +
        `  Original: "${preprocessed.original}"\n` +
        `  Cleaned: "${preprocessed.cleaned}"\n` +
        `  Keywords: [${preprocessed.keywords.join(', ')}]\n` +
        `  Noise words removed: ${queryAnalysis.wordCount - preprocessed.keywords.length}`
      );
    }

    // Step 2: Perform actual search
    let result: ExactMatchResult;
    let method: 'fts' | 'fuzzy' | 'expansion' | 'crop_fts' = 'fts';
    console.log("option.useFuzzyFallback: ", options.useFuzzyFallback);
    
    // Extract crop name from entities for filtering
    const cropEntity = options.entities?.find(e => e.type === 'crop_name');
    const cropFilter = cropEntity?.value;
    
    if (cropFilter) {
      this.logger.debug(`Detected crop filter from NER: "${cropFilter}"`);
    }
    
    try {
      // Try Crop Knowledge FTS (Layer 1)
      console.log('Trying Crop Knowledge FTS...');
      const cropResult = await this.cropKnowledgeFTS.searchCropKnowledge(
        searchQuery,
        undefined, // Search all public knowledge, not filtered by user
        {
          limit: 5,  // số kết quả
          threshold: 0.7, // của FTS
          cropFilter, // Pass crop filter from NER
        },
      );
      console.log("cropResult.found: ",cropResult.found);
      

      if (cropResult.found) {
        result = cropResult;
        method = 'crop_fts';
      } else {
        // If CropKnowledgeFTS fails, return not found
        // System will fall back to Layer 2 (RAG) or Layer 3 (LLM) in AIOrchestrator
        console.log('Crop Knowledge FTS did not find results, will fallback to next layer');
        result = {
          found: false,
          confidence: 0,
        };
        method = 'crop_fts';
      }

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        ` Search completed via ${method} in ${processingTime}ms - ` +
          `Found: ${result.found}, Confidence: ${(result.confidence || 0).toFixed(3)}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Error in exact match search:', error);
      return {
        found: false,
        confidence: 0,
      };
    }
  }

  /**
   * Batch search multiple queries
   */
  async batchSearch(
    queries: string[],
    userId?: string,
  ): Promise<Map<string, ExactMatchResult>> {
    const results = new Map<string, ExactMatchResult>();

    this.logger.log(`🔍 Batch searching ${queries.length} queries...`);

    // Process in parallel with limit
    const batchSize = 5;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const promises = batch.map((query) =>
        this.findExactMatch(query, userId).then((result) => ({
          query,
          result,
        })),
      );

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ query, result }) => {
        results.set(query, result);
      });
    }

    this.logger.log(`✅ Batch search completed: ${results.size} results`);
    return results;
  }


}
