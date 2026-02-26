import { UniversalAIAdapter } from './adapter.js';
import { ResponseCache, CacheConfig, CachePresets } from './cache.js';
import { RateLimiter, RetryHandler, CircuitBreaker, RateLimitConfig, RetryConfig } from './rate-limit.js';
import { MetricsCollector, generateDashboard, DashboardData } from './metrics.js';
import { AIProvider, Message, ChatRequest, ChatResponse, UniversalAIConfig } from './types.js';

/**
 * Smart adapter configuration
 */
export interface SmartAdapterConfig extends UniversalAIConfig {
  // Cache configuration
  cache?: {
    enabled: boolean;
    preset?: 'production' | 'development' | 'testing' | 'disabled';
    custom?: Partial<CacheConfig>;
  };

  // Rate limiting configuration
  rateLimit?: {
    enabled: boolean;
    customLimits?: Record<AIProvider, Partial<RateLimitConfig>>;
  };

  // Retry configuration
  retry?: {
    enabled: boolean;
    config?: Partial<RetryConfig>;
  };

  // Circuit breaker configuration
  circuitBreaker?: {
    enabled: boolean;
  };

  // Metrics configuration
  metrics?: {
    enabled: boolean;
    maxMetrics?: number;
  };
}

/**
 * Smart request options
 */
export interface SmartRequestOptions extends ChatRequest {
  // Override cache for this request
  skipCache?: boolean;
  
  // Override rate limiting for this request
  skipRateLimit?: boolean;
  
  // Override retry for this request
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
export class SmartAdapter {
  private adapter: UniversalAIAdapter;
  private cache?: ResponseCache;
  private rateLimiter?: RateLimiter;
  private retryHandler?: RetryHandler;
  private circuitBreaker?: CircuitBreaker;
  private metricsCollector?: MetricsCollector;
  
  private config: SmartAdapterConfig & {
    cache: Required<SmartAdapterConfig['cache']>;
    rateLimit: Required<SmartAdapterConfig['rateLimit']>;
    retry: Required<SmartAdapterConfig['retry']>;
    circuitBreaker: Required<SmartAdapterConfig['circuitBreaker']>;
    metrics: Required<SmartAdapterConfig['metrics']>;
  };

  constructor(config: SmartAdapterConfig) {
    // Set defaults
    this.config = {
      ...config,
      cache: {
        enabled: config.cache?.enabled ?? true,
        preset: config.cache?.preset ?? 'development',
        custom: config.cache?.custom || undefined
      },
      rateLimit: {
        enabled: config.rateLimit?.enabled ?? true,
        customLimits: config.rateLimit?.customLimits || undefined
      },
      retry: {
        enabled: config.retry?.enabled ?? true,
        config: config.retry?.config || undefined
      },
      circuitBreaker: {
        enabled: config.circuitBreaker?.enabled ?? true
      },
      metrics: {
        enabled: config.metrics?.enabled ?? true,
        maxMetrics: config.metrics?.maxMetrics ?? 10000
      }
    } as any;

    // Initialize core adapter
    this.adapter = new UniversalAIAdapter(config);

    // Initialize optional features
    this.initializeFeatures();
  }

  /**
   * Initialize all optional features based on configuration
   */
  private initializeFeatures(): void {
    // Initialize cache
    if (this.config.cache?.enabled) {
      const cacheConfig = this.config.cache?.custom || 
        CachePresets[this.config.cache?.preset || 'development'];
      this.cache = new ResponseCache(cacheConfig);
    }

    // Initialize rate limiter
    if (this.config.rateLimit?.enabled) {
      this.rateLimiter = new RateLimiter();
      
      // Apply custom limits
      if (this.config.rateLimit?.customLimits) {
        Object.entries(this.config.rateLimit.customLimits).forEach(([provider, limits]) => {
          this.rateLimiter!.setProviderLimits(provider as AIProvider, limits as any);
        });
      }
    }

    // Initialize retry handler
    if (this.config.retry?.enabled) {
      this.retryHandler = new RetryHandler(this.config.retry?.config);
    }

    // Initialize circuit breaker
    if (this.config.circuitBreaker?.enabled) {
      this.circuitBreaker = new CircuitBreaker();
    }

    // Initialize metrics collector
    if (this.config.metrics?.enabled) {
      this.metricsCollector = new MetricsCollector(this.config.metrics?.maxMetrics || 10000);
    }
  }

  /**
   * Send a chat request with all smart features
   */
  async chat(options: SmartRequestOptions): Promise<SmartResponse> {
    const startTime = Date.now();
    const providerInfo = this.adapter.getCurrentProvider();
    const provider = providerInfo.provider;
    let retryCount = 0;

    try {
      // 1. Check circuit breaker
      if (this.circuitBreaker && !options.skipRateLimit) {
        if (this.circuitBreaker.isOpen(provider)) {
          throw new Error(`Circuit breaker is open for ${provider}. Service temporarily unavailable.`);
        }
      }

      // 2. Check cache
      if (this.cache && !options.skipCache) {
        const cachedResponse = this.cache.get(
          options.messages,
          options.temperature,
          options.maxTokens
        );

        if (cachedResponse) {
          const duration = Date.now() - startTime;

          // Record metrics for cached response
          if (this.metricsCollector) {
            this.metricsCollector.recordRequest({
              provider: cachedResponse.provider,
              model: cachedResponse.model,
              timestamp: startTime,
              duration,
              tokens: cachedResponse.usage ? {
                prompt: cachedResponse.usage.promptTokens,
                completion: cachedResponse.usage.completionTokens,
                total: cachedResponse.usage.totalTokens
              } : undefined,
              cached: true,
              retries: 0,
              success: true
            });
          }

          return {
            ...cachedResponse,
            cached: true,
            duration,
            retries: 0
          };
        }
      }

      // 3. Wait for rate limit slot
      if (this.rateLimiter && !options.skipRateLimit) {
        await this.rateLimiter.waitForSlot(provider);
        this.rateLimiter.recordRequest(provider);
      }

      // 4. Execute with retry logic
      let response: ChatResponse;
      
      if (this.retryHandler && !options.skipRetry) {
        response = await this.retryHandler.execute(async () => {
          retryCount++;
          return await this.adapter.chat(options);
        }, `${provider} chat request`);
      } else {
        response = await this.adapter.chat(options);
      }

      const duration = Date.now() - startTime;

      // 5. Cache the response
      if (this.cache && !options.skipCache) {
        this.cache.set(
          options.messages,
          response,
          response.provider,
          response.model,
          options.temperature,
          options.maxTokens
        );
      }

      // 6. Record success in circuit breaker
      if (this.circuitBreaker) {
        this.circuitBreaker.recordSuccess(provider);
      }

      // 7. Record metrics
      if (this.metricsCollector) {
        this.metricsCollector.recordRequest({
          provider: response.provider,
          model: response.model,
          timestamp: startTime,
          duration,
          tokens: response.usage ? {
            prompt: response.usage.promptTokens,
            completion: response.usage.completionTokens,
            total: response.usage.totalTokens
          } : undefined,
          cached: false,
          retries: retryCount - 1,
          success: true
        });
      }

      return {
        ...response,
        cached: false,
        duration,
        retries: retryCount - 1
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Record failure in circuit breaker
      if (this.circuitBreaker) {
        this.circuitBreaker.recordFailure(provider);
      }

      // Record metrics for failed request
      if (this.metricsCollector) {
        this.metricsCollector.recordRequest({
          provider,
          model: 'unknown',
          timestamp: startTime,
          duration,
          cached: false,
          retries: retryCount,
          success: false,
          error: error.message
        });
      }

      throw error;
    } finally {
      // Complete rate limit tracking
      if (this.rateLimiter && !options.skipRateLimit) {
        this.rateLimiter.recordCompletion(provider);
      }
    }
  }

  /**
   * Simple chat interface (convenience method)
   */
  async simpleChat(userMessage: string, systemMessage?: string): Promise<string> {
    const messages: Message[] = [];
    
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    
    messages.push({ role: 'user', content: userMessage });

    const response = await this.chat({ messages });
    return response.content;
  }

  /**
   * Get the underlying adapter (for advanced usage)
   */
  getAdapter(): UniversalAIAdapter {
    return this.adapter;
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): AIProvider {
    return this.adapter.getCurrentProvider().provider;
  }

  /**
   * Switch provider manually
   */
  switchProvider(provider: AIProvider): void {
    this.adapter.switchProvider(provider);
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(): Promise<AIProvider[]> {
    const statuses = await this.adapter.getProviderStatuses();
    return statuses.filter(s => s.available).map(s => s.provider);
  }

  /**
   * Get cache instance (if enabled)
   */
  getCache(): ResponseCache | undefined {
    return this.cache;
  }

  /**
   * Get rate limiter instance (if enabled)
   */
  getRateLimiter(): RateLimiter | undefined {
    return this.rateLimiter;
  }

  /**
   * Get retry handler instance (if enabled)
   */
  getRetryHandler(): RetryHandler | undefined {
    return this.retryHandler;
  }

  /**
   * Get circuit breaker instance (if enabled)
   */
  getCircuitBreaker(): CircuitBreaker | undefined {
    return this.circuitBreaker;
  }

  /**
   * Get metrics collector instance (if enabled)
   */
  getMetrics(): MetricsCollector | undefined {
    return this.metricsCollector;
  }

  /**
   * Get dashboard data (if metrics enabled)
   */
  getDashboard(): DashboardData | null {
    if (!this.metricsCollector) {
      return null;
    }
    return generateDashboard(this.metricsCollector);
  }

  /**
   * Get comprehensive status of all features
   */
  getStatus() {
    const providerInfo = this.adapter.getCurrentProvider();
    const provider = providerInfo.provider;

    return {
      provider,
      features: {
        cache: {
          enabled: !!this.cache,
          stats: this.cache?.getStats()
        },
        rateLimit: {
          enabled: !!this.rateLimiter,
          status: this.rateLimiter?.getStatus(provider)
        },
        retry: {
          enabled: !!this.retryHandler,
          config: this.retryHandler?.getConfig()
        },
        circuitBreaker: {
          enabled: !!this.circuitBreaker,
          status: this.circuitBreaker?.getStatus(provider)
        },
        metrics: {
          enabled: !!this.metricsCollector,
          summary: this.metricsCollector?.getSummary()
        }
      },
      providerInfo: providerInfo
    };
  }

  /**
   * Clear cache (if enabled)
   */
  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Reset rate limits (if enabled)
   */
  resetRateLimits(provider?: AIProvider): void {
    if (this.rateLimiter) {
      this.rateLimiter.reset(provider);
    }
  }

  /**
   * Reset circuit breaker (if enabled)
   */
  resetCircuitBreaker(provider?: AIProvider): void {
    if (this.circuitBreaker && provider) {
      this.circuitBreaker.reset(provider);
    }
  }

  /**
   * Export metrics as JSON (if enabled)
   */
  exportMetrics(): string | null {
    if (!this.metricsCollector) {
      return null;
    }
    return this.metricsCollector.export();
  }

  /**
   * Update cache configuration (if enabled)
   */
  updateCacheConfig(config: Partial<CacheConfig>): void {
    if (this.cache) {
      this.cache.updateConfig(config);
    }
  }

  /**
   * Update retry configuration (if enabled)
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    if (this.retryHandler) {
      this.retryHandler.updateConfig(config);
    }
  }
}

/**
 * Create a SmartAdapter with production-optimized settings
 */
export function createProductionAdapter(config: UniversalAIConfig): SmartAdapter {
  return new SmartAdapter({
    ...config,
    cache: {
      enabled: true,
      preset: 'production'
    },
    rateLimit: {
      enabled: true
    },
    retry: {
      enabled: true,
      config: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
      }
    },
    circuitBreaker: {
      enabled: true
    },
    metrics: {
      enabled: true
    }
  });
}

/**
 * Create a SmartAdapter with development-optimized settings
 */
export function createDevelopmentAdapter(config: UniversalAIConfig): SmartAdapter {
  return new SmartAdapter({
    ...config,
    verbose: true,
    cache: {
      enabled: true,
      preset: 'development'
    },
    rateLimit: {
      enabled: false // Disable for faster development
    },
    retry: {
      enabled: true,
      config: {
        maxRetries: 1 // Fewer retries for faster feedback
      }
    },
    circuitBreaker: {
      enabled: false // Disable for easier debugging
    },
    metrics: {
      enabled: true
    }
  });
}
