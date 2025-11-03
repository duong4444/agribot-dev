import { Injectable, Logger } from '@nestjs/common';
import { ExactMatchResult } from '../types';
import { ExactMatchEnhancedService } from './exact-match-enhanced.service';
import { SearchCacheService, CacheStats } from './search-cache.service';

/**
 * Exact Match V2 Service
 *
 * Combines Enhanced FTS with Caching Layer
 * This is the main service to use for Layer 1 searches
 */

interface SearchMetrics {
  query: string;
  userId?: string;
  found: boolean;
  confidence: number;
  processingTime: number;
  cacheHit: boolean;
  method: 'fts' | 'fuzzy' | 'expansion' | 'cache';
}

@Injectable()
export class ExactMatchV2Service {
  private readonly logger = new Logger(ExactMatchV2Service.name);
  private searchMetrics: SearchMetrics[] = [];
  private readonly maxMetricsSize = 100;

  constructor(
    private readonly enhancedService: ExactMatchEnhancedService,
    private readonly cacheService: SearchCacheService,
  ) {
    // Schedule periodic cache cleanup
    this.cacheService.scheduleCleanup(300000); // 5 minutes
  }

  /**
   * Main search method with caching
   */
  async findExactMatch(
    query: string,
    userId?: string,
    options: {
      skipCache?: boolean;
      useExpansion?: boolean;
      useFuzzyFallback?: boolean;
    } = {},
  ): Promise<ExactMatchResult> {
    const startTime = Date.now();
    console.log(
      'chạy vào findExactMatch của exact-match-v2.service do orchestrator gọi',
    );

    // Step 1: Try cache first (unless skipCache is true)
    console.log("options.skipCache: ", options.skipCache);
    if (!options.skipCache) {
      console.log('kiểm tra cache');
      const cached = this.cacheService.get(query, userId);
      if (cached) {
        const processingTime = Date.now() - startTime;

        this.recordMetric({
          query,
          userId,
          found: cached.found,
          confidence: cached.confidence,
          processingTime,
          cacheHit: true,
          method: 'cache',
        });

        this.logger.debug(`⚡ Cache hit - returned in ${processingTime}ms`);
        return cached;
      }
    }

    // Step 2: Perform actual search
    let result: ExactMatchResult;
    let method: 'fts' | 'fuzzy' | 'expansion' = 'fts';
    console.log("option.useFuzzyFallback: ", options.useFuzzyFallback);
    
    try {
      if (options.useExpansion) {
        // Try with query expansion
        console.log('chạy vào đây vì truyền expansion');

        result = await this.enhancedService.searchWithExpansion(query, userId);
        method = 'expansion';
      } else {
        // Standard FTS search
        console.log('logic chính của FTS');

        console.log(
          '_exactMatchV2_ đi gọi findExactMatch của exact-match-enhanced',
        );

        result = await this.enhancedService.findExactMatch(query, userId, {
          useFuzzyFallback: options.useFuzzyFallback ?? true,
        });
        method = result.confidence < 0.5 ? 'fuzzy' : 'fts';
      }

      // Step 3: Cache the result (if found or high confidence)
      if (result.found || result.confidence > 0.3) {
        const ttl = result.found ? 3600 : 1800; // 1 hour if found, 30 min otherwise
        this.cacheService.set(query, result, userId, ttl);
      }

      // Step 4: Record metrics
      const processingTime = Date.now() - startTime;
      this.recordMetric({
        query,
        userId,
        found: result.found,
        confidence: result.confidence,
        processingTime,
        cacheHit: false,
        method,
      });

      this.logger.debug(
        `🔍 Search completed via ${method} in ${processingTime}ms - ` +
          `Found: ${result.found}, Confidence: ${result.confidence.toFixed(3)}`,
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

  /**
   * Record search metric
   */
  private recordMetric(metric: SearchMetrics): void {
    this.searchMetrics.push(metric);

    // Keep only last N metrics
    if (this.searchMetrics.length > this.maxMetricsSize) {
      this.searchMetrics.shift();
    }
  }

  /**
   * Get search analytics
   */
  getAnalytics(): {
    totalSearches: number;
    cacheHitRate: number;
    avgProcessingTime: number;
    avgConfidence: number;
    foundRate: number;
    methodBreakdown: Record<string, number>;
  } {
    if (this.searchMetrics.length === 0) {
      return {
        totalSearches: 0,
        cacheHitRate: 0,
        avgProcessingTime: 0,
        avgConfidence: 0,
        foundRate: 0,
        methodBreakdown: {},
      };
    }

    const total = this.searchMetrics.length;
    const cacheHits = this.searchMetrics.filter((m) => m.cacheHit).length;
    const found = this.searchMetrics.filter((m) => m.found).length;

    const avgProcessingTime =
      this.searchMetrics.reduce((sum, m) => sum + m.processingTime, 0) / total;

    const avgConfidence =
      this.searchMetrics.reduce((sum, m) => sum + m.confidence, 0) / total;

    const methodBreakdown: Record<string, number> = {};
    this.searchMetrics.forEach((m) => {
      methodBreakdown[m.method] = (methodBreakdown[m.method] || 0) + 1;
    });

    return {
      totalSearches: total,
      cacheHitRate: parseFloat(((cacheHits / total) * 100).toFixed(2)),
      avgProcessingTime: parseFloat(avgProcessingTime.toFixed(2)),
      avgConfidence: parseFloat(avgConfidence.toFixed(3)),
      foundRate: parseFloat(((found / total) * 100).toFixed(2)),
      methodBreakdown,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cacheService.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * Invalidate cache for user
   */
  invalidateUserCache(userId: string): void {
    this.cacheService.invalidateUser(userId);
  }

  /**
   * Get search statistics
   */
  async getSearchStats(userId?: string) {
    return this.enhancedService.getSearchStats(userId);
  }

  /**
   * Refresh materialized view
   */
  async refreshStats(): Promise<void> {
    await this.enhancedService.refreshSearchStats();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    cache: any;
    analytics: any;
    searchStats: any;
  }> {
    try {
      const searchStats = await this.getSearchStats();
      const cacheStats = this.getCacheStats();
      const analytics = this.getAnalytics();

      const status =
        searchStats.indexedChunks > 0
          ? 'healthy'
          : searchStats.totalChunks > 0
            ? 'degraded'
            : 'unhealthy';

      return {
        status,
        cache: cacheStats,
        analytics,
        searchStats,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        cache: null,
        analytics: null,
        searchStats: null,
      };
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.searchMetrics = [];
    this.cacheService.resetStats();
    this.logger.log('📊 All metrics reset');
  }
}
