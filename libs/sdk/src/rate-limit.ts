import { AIProvider } from '../../shared/src/types.js';

interface RetryableError {
  code?: string;
  status?: number;
  message?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  tokensPerMinute?: number;
  concurrent?: number;
}

interface RateLimitState {
  requests: number[];
  tokens: number[];
  activeRequests: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

function logWarn(message: string): void {
  // eslint-disable-next-line no-console
  console.warn(message);
}

export class RateLimiter {
  private limits: Map<AIProvider, RateLimitConfig> = new Map();
  private state: Map<AIProvider, RateLimitState> = new Map();

  constructor() {
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
      concurrent: 3
    });
  }

  setProviderLimits(provider: AIProvider, config: RateLimitConfig): void {
    this.limits.set(provider, config);

    if (!this.state.has(provider)) {
      this.state.set(provider, {
        requests: [],
        tokens: [],
        activeRequests: 0
      });
    }
  }

  getProviderLimits(provider: AIProvider): RateLimitConfig | undefined {
    return this.limits.get(provider);
  }

  async canProceed(provider: AIProvider, estimatedTokens?: number): Promise<boolean> {
    const config = this.limits.get(provider);
    const state = this.state.get(provider);

    if (!config || !state) {
      return true;
    }

    const now = Date.now();
    state.requests = state.requests.filter(t => now - t < 60000);
    state.tokens = state.tokens.filter(t => now - t < 60000);

    if (config.concurrent && state.activeRequests >= config.concurrent) {
      return false;
    }

    if (state.requests.length >= config.requestsPerMinute) {
      return false;
    }

    if (estimatedTokens && config.tokensPerMinute) {
      const tokensUsed = state.tokens.reduce((sum, _) => sum + 1, 0);
      if (tokensUsed + estimatedTokens > config.tokensPerMinute) {
        return false;
      }
    }

    return true;
  }

  async waitForSlot(provider: AIProvider, estimatedTokens?: number): Promise<void> {
    while (!(await this.canProceed(provider, estimatedTokens))) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  recordRequest(provider: AIProvider, tokens?: number): void {
    const state = this.state.get(provider);
    if (!state) return;

    const now = Date.now();
    state.requests.push(now);

    if (tokens) {
      state.tokens.push(now);
    }

    state.activeRequests++;
  }

  recordCompletion(provider: AIProvider): void {
    const state = this.state.get(provider);
    if (!state) return;

    state.activeRequests = Math.max(0, state.activeRequests - 1);
  }

  getStatus(provider: AIProvider): {
    requestsThisMinute: number;
    tokensThisMinute: number;
    activeRequests: number;
    canProceed: boolean;
  } {
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

  reset(provider?: AIProvider): void {
    if (provider) {
      const state = this.state.get(provider);
      if (state) {
        state.requests = [];
        state.tokens = [];
        state.activeRequests = 0;
      }
      return;
    }

    for (const state of this.state.values()) {
      state.requests = [];
      state.tokens = [];
      state.activeRequests = 0;
    }
  }
}

export class RetryHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      ...config
    };
  }

  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.config.initialDelay;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.isRetryable(error) || attempt === this.config.maxRetries) {
          throw error;
        }

        const jitter = Math.random() * 0.3 * delay;
        const actualDelay = Math.min(delay + jitter, this.config.maxDelay);

        if (context) {
          logWarn(`${context} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), retrying in ${Math.round(actualDelay)}ms...`);
        }

        await this.sleep(actualDelay);
        delay *= this.config.backoffMultiplier;
      }
    }

    throw lastError;
  }

  private isRetryable(error: unknown): boolean {
    const retryableError = (error ?? {}) as RetryableError;

    if (retryableError.code === 'ECONNRESET' || retryableError.code === 'ETIMEDOUT' || retryableError.code === 'ENOTFOUND') {
      return true;
    }

    if (retryableError.status && this.config.retryableStatusCodes.includes(retryableError.status)) {
      return true;
    }

    if (retryableError.message && retryableError.message.toLowerCase().includes('rate limit')) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

export class CircuitBreaker {
  private failures: Map<AIProvider, number> = new Map();
  private lastFailure: Map<AIProvider, number> = new Map();
  private readonly threshold = 5;
  private readonly timeout = 60000;

  isOpen(provider: AIProvider): boolean {
    const failures = this.failures.get(provider) || 0;
    const lastFail = this.lastFailure.get(provider) || 0;

    if (failures >= this.threshold) {
      if (Date.now() - lastFail > this.timeout) {
        this.reset(provider);
        return false;
      }
      return true;
    }

    return false;
  }

  recordFailure(provider: AIProvider): void {
    const current = this.failures.get(provider) || 0;
    this.failures.set(provider, current + 1);
    this.lastFailure.set(provider, Date.now());
  }

  recordSuccess(provider: AIProvider): void {
    this.reset(provider);
  }

  reset(provider: AIProvider): void {
    this.failures.set(provider, 0);
  }

  getStatus(provider: AIProvider): {
    failures: number;
    isOpen: boolean;
    lastFailure: number | null;
  } {
    return {
      failures: this.failures.get(provider) || 0,
      isOpen: this.isOpen(provider),
      lastFailure: this.lastFailure.get(provider) || null
    };
  }
}
