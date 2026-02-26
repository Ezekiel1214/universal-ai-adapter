import { Message, ChatResponse } from './types.js';
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
    ttl: number;
    maxSize: number;
    includeSystemMessages?: boolean;
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
export declare class ResponseCache {
    private cache;
    private config;
    private stats;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Generate cache key from messages and options
     */
    private generateKey;
    /**
     * Get cached response if available and valid
     */
    get(messages: Message[], temperature?: number, maxTokens?: number): ChatResponse | null;
    /**
     * Store response in cache
     */
    set(messages: Message[], response: ChatResponse, provider: string, model: string, temperature?: number, maxTokens?: number): void;
    /**
     * Remove oldest cache entry (LRU eviction)
     */
    private evictOldest;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Clear expired entries
     */
    clearExpired(): void;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Get cache entry details for debugging
     */
    getEntries(): Array<CacheEntry & {
        key: string;
    }>;
    /**
     * Update cache configuration
     */
    updateConfig(config: Partial<CacheConfig>): void;
    /**
     * Get current cache configuration
     */
    getConfig(): CacheConfig;
    /**
     * Warm up cache with common queries
     */
    warmUp(queries: Array<{
        messages: Message[];
        temperature?: number;
        maxTokens?: number;
    }>, fetchFn: (messages: Message[], temperature?: number, maxTokens?: number) => Promise<ChatResponse>): Promise<void>;
}
/**
 * Cache preset configurations
 */
export declare const CachePresets: {
    /**
     * Aggressive caching for production
     */
    readonly production: {
        readonly enabled: true;
        readonly ttl: 3600000;
        readonly maxSize: 500;
        readonly includeSystemMessages: false;
    };
    /**
     * Short-term caching for development
     */
    readonly development: {
        readonly enabled: true;
        readonly ttl: 300000;
        readonly maxSize: 50;
        readonly includeSystemMessages: true;
    };
    /**
     * No caching
     */
    readonly disabled: {
        readonly enabled: false;
        readonly ttl: 0;
        readonly maxSize: 0;
        readonly includeSystemMessages: false;
    };
    /**
     * Conservative caching for testing
     */
    readonly testing: {
        readonly enabled: true;
        readonly ttl: 60000;
        readonly maxSize: 10;
        readonly includeSystemMessages: true;
    };
};
