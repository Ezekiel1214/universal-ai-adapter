import { UniversalAIAdapter } from './adapter.js';
import { ResponseCache, CacheConfig, CachePresets } from './cache.js';
import { RateLimiter, RetryHandler, CircuitBreaker, RateLimitConfig, RetryConfig } from './rate-limit.js';
import { MetricsCollector, generateDashboard, DashboardData } from './metrics.js';
import { ModelRouter, RouterConfig, TaskType, RoutingDecision } from './model-router.js';
import { AIProvider, Message, ChatRequest, ChatResponse, UniversalAIConfig } from '../../shared/src/types.js';

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

export interface SmartRequestOptions extends ChatRequest {
  skipCache?: boolean;
  skipRateLimit?: boolean;
  skipRetry?: boolean;
}

export interface SmartResponse extends ChatResponse {
  cached: boolean;
  duration: number;
  retries: number;
}

export interface SmartAdapterStatus {
  provider: AIProvider;
  features: {
    cache: {
      enabled: boolean;
      stats: ReturnType<ResponseCache['getStats']> | undefined;
    };
    rateLimit: {
      enabled: boolean;
      status: ReturnType<RateLimiter['getStatus']> | undefined;
    };
    retry: {
      enabled: boolean;
      config: RetryConfig | undefined;
    };
    circuitBreaker: {
      enabled: boolean;
      status: ReturnType<CircuitBreaker['getStatus']> | undefined;
    };
    metrics: {
      enabled: boolean;
      summary: ReturnType<MetricsCollector['getSummary']> | undefined;
    };
  };
  providerInfo: ReturnType<UniversalAIAdapter['getCurrentProvider']>;
}

interface ResolvedCacheConfig {
  enabled: boolean;
  preset: 'production' | 'development' | 'testing' | 'disabled';
  custom?: Partial<CacheConfig>;
}

interface ResolvedRateLimitConfig {
  enabled: boolean;
  customLimits?: Record<AIProvider, Partial<RateLimitConfig>>;
}

interface ResolvedRetryConfig {
  enabled: boolean;
  config?: Partial<RetryConfig>;
}

interface ResolvedCircuitBreakerConfig {
  enabled: boolean;
}

interface ResolvedMetricsConfig {
  enabled: boolean;
  maxMetrics: number;
}

interface ResolvedRouterConfig {
  enabled: boolean;
  config?: Partial<RouterConfig>;
}

interface ResolvedSmartAdapterConfig extends UniversalAIConfig {
  cache: ResolvedCacheConfig;
  rateLimit: ResolvedRateLimitConfig;
  retry: ResolvedRetryConfig;
  circuitBreaker: ResolvedCircuitBreakerConfig;
  metrics: ResolvedMetricsConfig;
  router: ResolvedRouterConfig;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export class SmartAdapter {
  private adapter: UniversalAIAdapter;
  private cache?: ResponseCache;
  private rateLimiter?: RateLimiter;
  private retryHandler?: RetryHandler;
  private circuitBreaker?: CircuitBreaker;
  private metricsCollector?: MetricsCollector;
  private modelRouter?: ModelRouter;
  private config: ResolvedSmartAdapterConfig;

  constructor(config: SmartAdapterConfig) {
    this.config = {
      ...config,
      cache: {
        enabled: config.cache?.enabled ?? true,
        preset: config.cache?.preset ?? 'development',
        custom: config.cache?.custom
      },
      rateLimit: {
        enabled: config.rateLimit?.enabled ?? true,
        customLimits: config.rateLimit?.customLimits
      },
      retry: {
        enabled: config.retry?.enabled ?? true,
        config: config.retry?.config
      },
      circuitBreaker: {
        enabled: config.circuitBreaker?.enabled ?? true
      },
      metrics: {
        enabled: config.metrics?.enabled ?? true,
        maxMetrics: config.metrics?.maxMetrics ?? 10000
      },
      router: {
        enabled: config.router?.enabled ?? false,
        config: config.router?.config
      }
    };

    this.adapter = new UniversalAIAdapter(config);

    if (this.config.router.enabled && this.config.router.config) {
      this.modelRouter = new ModelRouter(this.config.router.config);
    }

    this.initializeFeatures();
  }

  private initializeFeatures(): void {
    if (this.config.cache.enabled) {
      const cacheConfig = this.config.cache.custom || CachePresets[this.config.cache.preset];
      this.cache = new ResponseCache(cacheConfig);
    }

    if (this.config.rateLimit.enabled) {
      this.rateLimiter = new RateLimiter();

      if (this.config.rateLimit.customLimits) {
        for (const [provider, limits] of Object.entries(this.config.rateLimit.customLimits)) {
          const typedProvider = provider as AIProvider;
          const currentLimits = this.rateLimiter.getProviderLimits(typedProvider);
          if (currentLimits) {
            this.rateLimiter.setProviderLimits(typedProvider, { ...currentLimits, ...limits });
          }
        }
      }
    }

    if (this.config.retry.enabled) {
      this.retryHandler = new RetryHandler(this.config.retry.config);
    }

    if (this.config.circuitBreaker.enabled) {
      this.circuitBreaker = new CircuitBreaker();
    }

    if (this.config.metrics.enabled) {
      this.metricsCollector = new MetricsCollector(this.config.metrics.maxMetrics);
    }
  }

  async chat(options: SmartRequestOptions): Promise<SmartResponse> {
    const startTime = Date.now();
    const providerInfo = this.adapter.getCurrentProvider();
    const provider = providerInfo.provider;
    let retryCount = 0;

    try {
      if (this.circuitBreaker && !options.skipRateLimit && this.circuitBreaker.isOpen(provider)) {
        throw new Error(`Circuit breaker is open for ${provider}. Service temporarily unavailable.`);
      }

      if (this.cache && !options.skipCache) {
        const cachedResponse = this.cache.get(options.messages, options.temperature, options.maxTokens);

        if (cachedResponse) {
          const duration = Date.now() - startTime;

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

      if (this.rateLimiter && !options.skipRateLimit) {
        await this.rateLimiter.waitForSlot(provider);
        this.rateLimiter.recordRequest(provider);
      }

      let response: ChatResponse;

      if (this.retryHandler && !options.skipRetry) {
        response = await this.retryHandler.execute(async () => {
          retryCount++;
          return this.adapter.chat(options);
        }, `${provider} chat request`);
      } else {
        response = await this.adapter.chat(options);
      }

      const duration = Date.now() - startTime;

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

      if (this.circuitBreaker) {
        this.circuitBreaker.recordSuccess(provider);
      }

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
    } catch (error: unknown) {
      const normalizedError = toError(error);
      const duration = Date.now() - startTime;

      if (this.circuitBreaker) {
        this.circuitBreaker.recordFailure(provider);
      }

      if (this.metricsCollector) {
        this.metricsCollector.recordRequest({
          provider,
          model: 'unknown',
          timestamp: startTime,
          duration,
          cached: false,
          retries: retryCount,
          success: false,
          error: normalizedError.message
        });
      }

      throw normalizedError;
    } finally {
      if (this.rateLimiter && !options.skipRateLimit) {
        this.rateLimiter.recordCompletion(provider);
      }
    }
  }

  async simpleChat(userMessage: string, systemMessage?: string): Promise<string> {
    const messages: Message[] = [];

    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await this.chat({ messages });
    return response.content;
  }

  getAdapter(): UniversalAIAdapter {
    return this.adapter;
  }

  getCurrentProvider(): AIProvider {
    return this.adapter.getCurrentProvider().provider;
  }

  switchProvider(provider: AIProvider): void {
    this.adapter.switchProvider(provider);
  }

  async getAvailableProviders(): Promise<AIProvider[]> {
    const statuses = await this.adapter.getProviderStatuses();
    return statuses.filter(s => s.available).map(s => s.provider);
  }

  getCache(): ResponseCache | undefined {
    return this.cache;
  }

  getRateLimiter(): RateLimiter | undefined {
    return this.rateLimiter;
  }

  getRetryHandler(): RetryHandler | undefined {
    return this.retryHandler;
  }

  getCircuitBreaker(): CircuitBreaker | undefined {
    return this.circuitBreaker;
  }

  getMetrics(): MetricsCollector | undefined {
    return this.metricsCollector;
  }

  getDashboard(): DashboardData | null {
    if (!this.metricsCollector) {
      return null;
    }
    return generateDashboard(this.metricsCollector);
  }

  getStatus(): SmartAdapterStatus {
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
      providerInfo
    };
  }

  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
    }
  }

  resetRateLimits(provider?: AIProvider): void {
    if (this.rateLimiter) {
      this.rateLimiter.reset(provider);
    }
  }

  resetCircuitBreaker(provider?: AIProvider): void {
    if (this.circuitBreaker && provider) {
      this.circuitBreaker.reset(provider);
    }
  }

  exportMetrics(): string | null {
    if (!this.metricsCollector) {
      return null;
    }
    return this.metricsCollector.export();
  }

  updateCacheConfig(config: Partial<CacheConfig>): void {
    if (this.cache) {
      this.cache.updateConfig(config);
    }
  }

  updateRetryConfig(config: Partial<RetryConfig>): void {
    if (this.retryHandler) {
      this.retryHandler.updateConfig(config);
    }
  }

  getRouter(): ModelRouter | undefined {
    return this.modelRouter;
  }

  routeRequest(taskType: TaskType, messages: Message[]): RoutingDecision | null {
    if (!this.modelRouter) {
      return null;
    }
    return this.modelRouter.route({ taskType, messages });
  }

  async switchForTask(taskType: TaskType, messages: Message[]): Promise<boolean> {
    if (!this.modelRouter) {
      return false;
    }

    const decision = this.modelRouter.route({ taskType, messages });
    if (decision) {
      this.adapter.switchProvider(decision.provider);
      return true;
    }
    return false;
  }
}

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

export function createDevelopmentAdapter(config: UniversalAIConfig): SmartAdapter {
  return new SmartAdapter({
    ...config,
    verbose: true,
    cache: {
      enabled: true,
      preset: 'development'
    },
    rateLimit: {
      enabled: false
    },
    retry: {
      enabled: true,
      config: {
        maxRetries: 1
      }
    },
    circuitBreaker: {
      enabled: false
    },
    metrics: {
      enabled: true
    }
  });
}
