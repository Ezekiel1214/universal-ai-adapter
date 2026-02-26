import { UniversalAIAdapter } from './adapter.js';
import { ResponseCache, CacheConfig } from './cache.js';
import { RateLimiter, RetryHandler, CircuitBreaker, RateLimitConfig, RetryConfig } from './rate-limit.js';
import { MetricsCollector, DashboardData } from './metrics.js';
import { ModelRouter, RouterConfig, TaskType, RoutingDecision } from './model-router.js';
import { AIProvider, Message, ChatRequest, ChatResponse, UniversalAIConfig } from './types.js';
/**
 * Smart adapter configuration
 */
export interface SmartAdapterConfig extends UniversalAIConfig {
    cache?: {
        enabled: boolean;
        preset?: 'production' | 'development' | 'testing' | 'disabled';
        custom?: Partial<CacheConfig>;
    };
    rateLimit?: {
        enabled: boolean;
        customLimits?: Record<AIProvider, Partial<RateLimitConfig>>;
    };
    retry?: {
        enabled: boolean;
        config?: Partial<RetryConfig>;
    };
    circuitBreaker?: {
        enabled: boolean;
    };
    metrics?: {
        enabled: boolean;
        maxMetrics?: number;
    };
    router?: {
        enabled: boolean;
        config?: Partial<RouterConfig>;
    };
}
/**
 * Smart request options
 */
export interface SmartRequestOptions extends ChatRequest {
    skipCache?: boolean;
    skipRateLimit?: boolean;
    skipRetry?: boolean;
}
/**
 * Smart adapter response with metadata
 */
export interface SmartResponse extends ChatResponse {
    cached: boolean;
    duration: number;
    retries: number;
}
/**
 * SmartAdapter - Unified adapter with all advanced features
 *
 * Automatically handles:
 * - Response caching
 * - Rate limiting
 * - Retry with exponential backoff
 * - Circuit breaker
 * - Metrics collection
 *
 * @example
 * ```typescript
 * const adapter = new SmartAdapter({
 *   apiKeys: {
 *     openai: process.env.OPENAI_API_KEY
 *   },
 *   cache: { enabled: true, preset: 'production' },
 *   rateLimit: { enabled: true },
 *   retry: { enabled: true },
 *   circuitBreaker: { enabled: true },
 *   metrics: { enabled: true }
 * });
 *
 * const response = await adapter.chat({
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 *
 * console.log(response.cached); // Was it from cache?
 * console.log(response.duration); // How long did it take?
 *
 * // Get metrics
 * const stats = adapter.getMetrics();
 * console.log(stats.getSummary());
 * ```
 */
export declare class SmartAdapter {
    private adapter;
    private cache?;
    private rateLimiter?;
    private retryHandler?;
    private circuitBreaker?;
    private metricsCollector?;
    private modelRouter?;
    private config;
    constructor(config: SmartAdapterConfig);
    /**
     * Initialize all optional features based on configuration
     */
    private initializeFeatures;
    /**
     * Send a chat request with all smart features
     */
    chat(options: SmartRequestOptions): Promise<SmartResponse>;
    /**
     * Simple chat interface (convenience method)
     */
    simpleChat(userMessage: string, systemMessage?: string): Promise<string>;
    /**
     * Get the underlying adapter (for advanced usage)
     */
    getAdapter(): UniversalAIAdapter;
    /**
     * Get current provider
     */
    getCurrentProvider(): AIProvider;
    /**
     * Switch provider manually
     */
    switchProvider(provider: AIProvider): void;
    /**
     * Get available providers
     */
    getAvailableProviders(): Promise<AIProvider[]>;
    /**
     * Get cache instance (if enabled)
     */
    getCache(): ResponseCache | undefined;
    /**
     * Get rate limiter instance (if enabled)
     */
    getRateLimiter(): RateLimiter | undefined;
    /**
     * Get retry handler instance (if enabled)
     */
    getRetryHandler(): RetryHandler | undefined;
    /**
     * Get circuit breaker instance (if enabled)
     */
    getCircuitBreaker(): CircuitBreaker | undefined;
    /**
     * Get metrics collector instance (if enabled)
     */
    getMetrics(): MetricsCollector | undefined;
    /**
     * Get dashboard data (if metrics enabled)
     */
    getDashboard(): DashboardData | null;
    /**
     * Get comprehensive status of all features
     */
    getStatus(): {
        provider: AIProvider;
        features: {
            cache: {
                enabled: boolean;
                stats: import("./cache.js").CacheStats | undefined;
            };
            rateLimit: {
                enabled: boolean;
                status: {
                    requestsThisMinute: number;
                    tokensThisMinute: number;
                    activeRequests: number;
                    canProceed: boolean;
                } | undefined;
            };
            retry: {
                enabled: boolean;
                config: RetryConfig | undefined;
            };
            circuitBreaker: {
                enabled: boolean;
                status: {
                    failures: number;
                    isOpen: boolean;
                    lastFailure: number | null;
                } | undefined;
            };
            metrics: {
                enabled: boolean;
                summary: {
                    totalRequests: number;
                    successRate: number;
                    totalCost: number;
                    totalTokens: number;
                    averageDuration: number;
                    cacheHitRate: number;
                    topProvider: AIProvider | null;
                } | undefined;
            };
        };
        providerInfo: {
            provider: AIProvider;
            model: string;
            available: boolean;
        };
    };
    /**
     * Clear cache (if enabled)
     */
    clearCache(): void;
    /**
     * Reset rate limits (if enabled)
     */
    resetRateLimits(provider?: AIProvider): void;
    /**
     * Reset circuit breaker (if enabled)
     */
    resetCircuitBreaker(provider?: AIProvider): void;
    /**
     * Export metrics as JSON (if enabled)
     */
    exportMetrics(): string | null;
    /**
     * Update cache configuration (if enabled)
     */
    updateCacheConfig(config: Partial<CacheConfig>): void;
    /**
     * Update retry configuration (if enabled)
     */
    updateRetryConfig(config: Partial<RetryConfig>): void;
    /**
     * Get the model router instance (if enabled)
     */
    getRouter(): ModelRouter | undefined;
    /**
     * Route request to optimal provider based on task type
     */
    routeRequest(taskType: TaskType, messages: Message[]): RoutingDecision | null;
    /**
     * Switch to optimal provider for a task
     */
    switchForTask(taskType: TaskType, messages: Message[]): Promise<boolean>;
}
/**
 * Create a SmartAdapter with production-optimized settings
 */
export declare function createProductionAdapter(config: UniversalAIConfig): SmartAdapter;
/**
 * Create a SmartAdapter with development-optimized settings
 */
export declare function createDevelopmentAdapter(config: UniversalAIConfig): SmartAdapter;
