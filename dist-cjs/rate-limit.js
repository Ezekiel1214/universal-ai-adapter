"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.RetryHandler = exports.RateLimiter = void 0;
/**
 * Rate limiter for API requests
 */
class RateLimiter {
    limits = new Map();
    state = new Map();
    constructor() {
        // Default rate limits (conservative)
        this.setProviderLimits('openai', {
            requestsPerMinute: 60,
            requestsPerHour: 3000,
            tokensPerMinute: 90000,
            concurrent: 10
        });
        this.setProviderLimits('anthropic', {
            requestsPerMinute: 50,
            requestsPerHour: 2000,
            tokensPerMinute: 100000,
            concurrent: 5
        });
        this.setProviderLimits('groq', {
            requestsPerMinute: 30,
            requestsPerHour: 1000,
            tokensPerMinute: 20000,
            concurrent: 5
        });
        this.setProviderLimits('deepseek', {
            requestsPerMinute: 60,
            requestsPerHour: 3000,
            concurrent: 10
        });
        this.setProviderLimits('ollama', {
            requestsPerMinute: 100,
            requestsPerHour: 10000,
            concurrent: 3 // Local server, limit concurrency
        });
    }
    /**
     * Set rate limits for a provider
     */
    setProviderLimits(provider, config) {
        this.limits.set(provider, config);
        if (!this.state.has(provider)) {
            this.state.set(provider, {
                requests: [],
                tokens: [],
                activeRequests: 0
            });
        }
    }
    /**
     * Get rate limits for a provider
     */
    getProviderLimits(provider) {
        return this.limits.get(provider);
    }
    /**
     * Check if request can proceed
     */
    async canProceed(provider, estimatedTokens) {
        const config = this.limits.get(provider);
        const state = this.state.get(provider);
        if (!config || !state) {
            return true; // No limits configured
        }
        const now = Date.now();
        // Clean up old request timestamps
        state.requests = state.requests.filter(t => now - t < 60000); // Last minute
        state.tokens = state.tokens.filter(t => now - t < 60000);
        // Check concurrent requests
        if (config.concurrent && state.activeRequests >= config.concurrent) {
            return false;
        }
        // Check requests per minute
        if (state.requests.length >= config.requestsPerMinute) {
            return false;
        }
        // Check tokens per minute if applicable
        if (estimatedTokens && config.tokensPerMinute) {
            const tokensUsed = state.tokens.reduce((sum, _) => sum + 1, 0);
            if (tokensUsed + estimatedTokens > config.tokensPerMinute) {
                return false;
            }
        }
        return true;
    }
    /**
     * Wait until request can proceed
     */
    async waitForSlot(provider, estimatedTokens) {
        while (!(await this.canProceed(provider, estimatedTokens))) {
            // Wait 100ms and check again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    /**
     * Record a request
     */
    recordRequest(provider, tokens) {
        const state = this.state.get(provider);
        if (!state)
            return;
        const now = Date.now();
        state.requests.push(now);
        if (tokens) {
            state.tokens.push(now);
        }
        state.activeRequests++;
    }
    /**
     * Record request completion
     */
    recordCompletion(provider) {
        const state = this.state.get(provider);
        if (!state)
            return;
        state.activeRequests = Math.max(0, state.activeRequests - 1);
    }
    /**
     * Get current rate limit status
     */
    getStatus(provider) {
        const state = this.state.get(provider);
        const config = this.limits.get(provider);
        if (!state || !config) {
            return {
                requestsThisMinute: 0,
                tokensThisMinute: 0,
                activeRequests: 0,
                canProceed: true
            };
        }
        const now = Date.now();
        const recentRequests = state.requests.filter(t => now - t < 60000);
        const recentTokens = state.tokens.filter(t => now - t < 60000);
        return {
            requestsThisMinute: recentRequests.length,
            tokensThisMinute: recentTokens.length,
            activeRequests: state.activeRequests,
            canProceed: recentRequests.length < config.requestsPerMinute &&
                (!config.concurrent || state.activeRequests < config.concurrent)
        };
    }
    /**
     * Reset rate limits for a provider
     */
    reset(provider) {
        if (provider) {
            const state = this.state.get(provider);
            if (state) {
                state.requests = [];
                state.tokens = [];
                state.activeRequests = 0;
            }
        }
        else {
            // Reset all providers
            for (const state of this.state.values()) {
                state.requests = [];
                state.tokens = [];
                state.activeRequests = 0;
            }
        }
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Retry handler with exponential backoff
 */
class RetryHandler {
    config;
    constructor(config = {}) {
        this.config = {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            retryableStatusCodes: [429, 500, 502, 503, 504],
            ...config
        };
    }
    /**
     * Execute function with retry logic
     */
    async execute(fn, context) {
        let lastError = null;
        let delay = this.config.initialDelay;
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                // Check if error is retryable
                if (!this.isRetryable(error) || attempt === this.config.maxRetries) {
                    throw error;
                }
                // Calculate delay with exponential backoff
                const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
                const actualDelay = Math.min(delay + jitter, this.config.maxDelay);
                if (context) {
                    console.warn(`${context} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), ` +
                        `retrying in ${Math.round(actualDelay)}ms...`);
                }
                await this.sleep(actualDelay);
                delay *= this.config.backoffMultiplier;
            }
        }
        throw lastError;
    }
    /**
     * Check if error is retryable
     */
    isRetryable(error) {
        // Check for network errors
        if (error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ENOTFOUND') {
            return true;
        }
        // Check for HTTP status codes
        if (error.status && this.config.retryableStatusCodes.includes(error.status)) {
            return true;
        }
        // Check for rate limit errors
        if (error.message && error.message.toLowerCase().includes('rate limit')) {
            return true;
        }
        return false;
    }
    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Update retry configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.RetryHandler = RetryHandler;
/**
 * Circuit breaker to prevent cascading failures
 */
class CircuitBreaker {
    failures = new Map();
    lastFailure = new Map();
    threshold = 5; // Open circuit after 5 failures
    timeout = 60000; // Reset after 1 minute
    /**
     * Check if circuit is open (should not attempt request)
     */
    isOpen(provider) {
        const failures = this.failures.get(provider) || 0;
        const lastFail = this.lastFailure.get(provider) || 0;
        if (failures >= this.threshold) {
            // Check if timeout has passed
            if (Date.now() - lastFail > this.timeout) {
                this.reset(provider);
                return false;
            }
            return true;
        }
        return false;
    }
    /**
     * Record a failure
     */
    recordFailure(provider) {
        const current = this.failures.get(provider) || 0;
        this.failures.set(provider, current + 1);
        this.lastFailure.set(provider, Date.now());
    }
    /**
     * Record a success
     */
    recordSuccess(provider) {
        this.reset(provider);
    }
    /**
     * Reset circuit breaker for provider
     */
    reset(provider) {
        this.failures.set(provider, 0);
    }
    /**
     * Get circuit breaker status
     */
    getStatus(provider) {
        return {
            failures: this.failures.get(provider) || 0,
            isOpen: this.isOpen(provider),
            lastFailure: this.lastFailure.get(provider) || null
        };
    }
}
exports.CircuitBreaker = CircuitBreaker;
