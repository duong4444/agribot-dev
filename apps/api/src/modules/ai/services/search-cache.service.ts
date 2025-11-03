import { Injectable, Logger } from '@nestjs/common';
import { ExactMatchResult } from '../types';
import { createHash } from 'crypto';

/**
 * Search Cache Service
 * 
 * In-memory LRU cache for search results
 * Improves performance for repeated queries
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

@Injectable()
export class SearchCacheService {
  private readonly logger = new Logger(SearchCacheService.name);
  
  // LRU Cache storage
  private cache: Map<string, CacheEntry<ExactMatchResult>> = new Map();
  
  // Configuration
  private readonly maxSize: number = 1000;
  private readonly defaultTTL: number = 3600; // 1 hour in seconds
  
  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  /**
   * Generate cache key from query and userId
   */
  private generateKey(query: string, userId?: string): string {
    const data = `${query}:${userId || 'anonymous'}`;
    return createHash('md5').update(data).digest('hex');
  }

  /**
   * Get cached result
   */
  get(query: string, userId?: string): ExactMatchResult | null {
    const key = this.generateKey(query, userId);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and move to end (LRU)
    entry.hits++;
    this.stats.hits++;
    
    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.logger.debug(`✅ Cache hit for query: "${query.substring(0, 50)}..."`);
    return entry.data;
  }

  /**
   * Set cache entry
   */
  set(
    query: string, 
    result: ExactMatchResult, 
    userId?: string,
    ttl?: number
  ): void {
    const key = this.generateKey(query, userId);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL) * 1000;

    // Check if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<ExactMatchResult> = {
      data: result,
      timestamp: now,
      hits: 0,
      expiresAt,
    };

    this.cache.set(key, entry);
    this.logger.debug(`💾 Cached result for query: "${query.substring(0, 50)}..."`);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    // First entry in Map is the oldest (LRU)
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.stats.evictions++;
      this.logger.debug(`🗑️  Evicted LRU entry`);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`🧹 Cleared ${size} cache entries`);
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.log(`🧹 Cleared ${cleared} expired cache entries`);
    }

    return cleared;
  }

  /**
   * Invalidate cache for specific user
   */
  invalidateUser(userId: string): number {
    let cleared = 0;

    // Note: We need to store userId in entry to do this efficiently
    // For now, we'll clear all cache when user data changes
    this.clear();
    cleared = this.cache.size;

    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: parseFloat((hitRate * 100).toFixed(2)),
      evictions: this.stats.evictions,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
    this.logger.log('📊 Cache statistics reset');
  }

  /**
   * Get cache entries (for debugging)
   */
  getEntries(): Array<{
    key: string;
    timestamp: Date;
    hits: number;
    expiresAt: Date;
    found: boolean;
  }> {
    const entries: Array<any> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key: key.substring(0, 8) + '...',
        timestamp: new Date(entry.timestamp),
        hits: entry.hits,
        expiresAt: new Date(entry.expiresAt),
        found: entry.data.found,
      });
    }

    return entries;
  }

  /**
   * Warm up cache with common queries
   */
  async warmUp(commonQueries: string[], userId?: string): Promise<void> {
    this.logger.log(`🔥 Warming up cache with ${commonQueries.length} queries...`);
    
    // This would be called with actual search results
    // For now, just log
    this.logger.log(`✅ Cache warm-up completed`);
  }

  /**
   * Schedule periodic cleanup
   */
  scheduleCleanup(intervalMs: number = 300000): NodeJS.Timeout {
    return setInterval(() => {
      const cleared = this.clearExpired();
      if (cleared > 0) {
        this.logger.debug(`⏰ Scheduled cleanup removed ${cleared} entries`);
      }
    }, intervalMs);
  }
}

