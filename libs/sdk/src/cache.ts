import { Message, ChatResponse } from '../../shared/src/types.js';
import { createHash } from 'crypto';

/**
 * Cache entry with metadata
 */
export interface CacheEntry {
  response: ChatResponse;
  timestamp: number;
  hits: number;
  provider: string;
  model: string;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  includeSystemMessages?: boolean; // Include system messages in cache key
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * Response cache manager
 */
export class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      ttl: 3600000, // 1 hour default
      maxSize: 100,
      includeSystemMessages: true,
      ...config
    };
  }

  /**
   * Generate cache key from messages and options
   */
  private generateKey(
    messages: Message[],
    temperature?: number,
    maxTokens?: number
  ): string {
    let messagesToHash = messages;
    
    // Optionally exclude system messages from cache key
    if (!this.config.includeSystemMessages) {
      messagesToHash = messages.filter(m => m.role !== 'system');
    }

    const data = JSON.stringify({
      messages: messagesToHash,
      temperature,
      maxTokens
    });

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get cached response if available and valid
   */
  get(
    messages: Message[],
    temperature?: number,
    maxTokens?: number
  ): ChatResponse | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(messages, temperature, maxTokens);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry is still valid (not expired)
    const now = Date.now();
    if (now - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count
    entry.hits++;
    this.stats.hits++;

    return entry.response;
  }

  /**
   * Store response in cache
   */
  set(
    messages: Message[],
    response: ChatResponse,
    provider: string,
    model: string,
    temperature?: number,
    maxTokens?: number
  ): void {
    if (!this.config.enabled) {
      return;
    }

    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const key = this.generateKey(messages, temperature, maxTokens);
    const entry: CacheEntry = {
      response,
      timestamp: Date.now(),
      hits: 0,
      provider,
      model
    };

    this.cache.set(key, entry);
  }

  /**
   * Remove oldest cache entry (LRU eviction)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);

    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }

  /**
   * Get cache entry details for debugging
   */
  getEntries(): Array<CacheEntry & { key: string }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: key.substring(0, 16) + '...', // Truncate key for readability
      ...entry
    }));
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If cache is disabled, clear it
    if (!this.config.enabled) {
      this.clear();
    }
  }

  /**
   * Get current cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Warm up cache with common queries
   */
  async warmUp(
    queries: Array<{
      messages: Message[];
      temperature?: number;
      maxTokens?: number;
    }>,
    fetchFn: (messages: Message[], temperature?: number, maxTokens?: number) => Promise<ChatResponse>
  ): Promise<void> {
    for (const query of queries) {
      const response = await fetchFn(query.messages, query.temperature, query.maxTokens);
      this.set(
        query.messages,
        response,
        response.provider,
        response.model,
        query.temperature,
        query.maxTokens
      );
    }
  }
}

/**
 * Cache preset configurations
 */
export const CachePresets = {
  /**
   * Aggressive caching for production
   */
  production: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSize: 500,
    includeSystemMessages: false
  },

  /**
   * Short-term caching for development
   */
  development: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 50,
    includeSystemMessages: true
  },

  /**
   * No caching
   */
  disabled: {
    enabled: false,
    ttl: 0,
    maxSize: 0,
    includeSystemMessages: false
  },

  /**
   * Conservative caching for testing
   */
  testing: {
    enabled: true,
    ttl: 60000, // 1 minute
    maxSize: 10,
    includeSystemMessages: true
  }
} as const;
