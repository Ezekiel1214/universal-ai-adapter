import { AIProvider } from './types.js';
/**
 * Rate limit configuration per provider
 */
export interface RateLimitConfig {
    requestsPerMinute: number;
    requestsPerHour: number;
    tokensPerMinute?: number;
    concurrent?: number;
}
/**
 * Retry configuration
 */
export interface RetryConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableStatusCodes: number[];
}
/**
 * Rate limiter for API requests
 */
export declare class RateLimiter {
    private limits;
    private state;
    constructor();
    /**
     * Set rate limits for a provider
     */
    setProviderLimits(provider: AIProvider, config: RateLimitConfig): void;
    /**
     * Get rate limits for a provider
     */
    getProviderLimits(provider: AIProvider): RateLimitConfig | undefined;
    /**
     * Check if request can proceed
     */
    canProceed(provider: AIProvider, estimatedTokens?: number): Promise<boolean>;
    /**
     * Wait until request can proceed
     */
    waitForSlot(provider: AIProvider, estimatedTokens?: number): Promise<void>;
    /**
     * Record a request
     */
    recordRequest(provider: AIProvider, tokens?: number): void;
    /**
     * Record request completion
     */
    recordCompletion(provider: AIProvider): void;
    /**
     * Get current rate limit status
     */
    getStatus(provider: AIProvider): {
        requestsThisMinute: number;
        tokensThisMinute: number;
        activeRequests: number;
        canProceed: boolean;
    };
    /**
     * Reset rate limits for a provider
     */
    reset(provider?: AIProvider): void;
}
/**
 * Retry handler with exponential backoff
 */
export declare class RetryHandler {
    private config;
    constructor(config?: Partial<RetryConfig>);
    /**
     * Execute function with retry logic
     */
    execute<T>(fn: () => Promise<T>, context?: string): Promise<T>;
    /**
     * Check if error is retryable
     */
    private isRetryable;
    /**
     * Sleep helper
     */
    private sleep;
    /**
     * Update retry configuration
     */
    updateConfig(config: Partial<RetryConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): RetryConfig;
}
/**
 * Circuit breaker to prevent cascading failures
 */
export declare class CircuitBreaker {
    private failures;
    private lastFailure;
    private readonly threshold;
    private readonly timeout;
    /**
     * Check if circuit is open (should not attempt request)
     */
    isOpen(provider: AIProvider): boolean;
    /**
     * Record a failure
     */
    recordFailure(provider: AIProvider): void;
    /**
     * Record a success
     */
    recordSuccess(provider: AIProvider): void;
    /**
     * Reset circuit breaker for provider
     */
    reset(provider: AIProvider): void;
    /**
     * Get circuit breaker status
     */
    getStatus(provider: AIProvider): {
        failures: number;
        isOpen: boolean;
        lastFailure: number | null;
    };
}
