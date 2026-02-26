"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachePresets = exports.ResponseCache = void 0;
const crypto_1 = require("crypto");
/**
 * Response cache manager
 */
class ResponseCache {
    cache = new Map();
    config;
    stats = {
        hits: 0,
        misses: 0
    };
    constructor(config = {}) {
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
    generateKey(messages, temperature, maxTokens) {
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
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    /**
     * Get cached response if available and valid
     */
    get(messages, temperature, maxTokens) {
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
    set(messages, response, provider, model, temperature, maxTokens) {
        if (!this.config.enabled) {
            return;
        }
        // Enforce max size by removing oldest entries
        if (this.cache.size >= this.config.maxSize) {
            this.evictOldest();
        }
        const key = this.generateKey(messages, temperature, maxTokens);
        const entry = {
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
    evictOldest() {
        let oldestKey = null;
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
    clear() {
        this.cache.clear();
        this.stats.hits = 0;
        this.stats.misses = 0;
    }
    /**
     * Clear expired entries
     */
    clearExpired() {
        const now = Date.now();
        const keysToDelete = [];
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
    getStats() {
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
    getEntries() {
        return Array.from(this.cache.entries()).map(([key, entry]) => ({
            key: key.substring(0, 16) + '...', // Truncate key for readability
            ...entry
        }));
    }
    /**
     * Update cache configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // If cache is disabled, clear it
        if (!this.config.enabled) {
            this.clear();
        }
    }
    /**
     * Get current cache configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Warm up cache with common queries
     */
    async warmUp(queries, fetchFn) {
        for (const query of queries) {
            const response = await fetchFn(query.messages, query.temperature, query.maxTokens);
            this.set(query.messages, response, response.provider, response.model, query.temperature, query.maxTokens);
        }
    }
}
exports.ResponseCache = ResponseCache;
/**
 * Cache preset configurations
 */
exports.CachePresets = {
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
};
