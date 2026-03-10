import { AIProvider } from '../../shared/src/types.js';

/**
 * Request metrics for monitoring
 */
export interface RequestMetrics {
  provider: AIProvider;
  model: string;
  timestamp: number;
  duration: number; // milliseconds
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cached: boolean;
  retries: number;
  success: boolean;
  error?: string;
}

/**
 * Aggregated metrics per provider
 */
export interface ProviderMetrics {
  provider: AIProvider;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number; // USD
  averageDuration: number;
  cacheHitRate: number;
  averageRetries: number;
  uptime: number; // percentage
}

/**
 * Cost per 1K tokens (in USD)
 */
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'llama-3.1-70b': { input: 0.00059, output: 0.00079 }, // Groq
  'llama-3.1-8b': { input: 0.00005, output: 0.00008 }, // Groq
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
  'ollama': { input: 0, output: 0 } // Local, free
};

/**
 * Metrics collector and analyzer
 */
export class MetricsCollector {
  private metrics: RequestMetrics[] = [];
  private readonly maxMetrics: number;

  constructor(maxMetrics: number = 10000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Record a request
   */
  recordRequest(metric: RequestMetrics): void {
    this.metrics.push(metric);

    // Trim if exceeding max size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): RequestMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific provider
   */
  getProviderMetrics(provider: AIProvider): ProviderMetrics {
    const providerData = this.metrics.filter(m => m.provider === provider);

    if (providerData.length === 0) {
      return {
        provider,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        averageRetries: 0,
        uptime: 0
      };
    }

    const successful = providerData.filter(m => m.success);
    const cached = providerData.filter(m => m.cached);
    const totalTokens = providerData.reduce(
      (sum, m) => sum + (m.tokens?.total || 0),
      0
    );
    const totalCost = this.calculateTotalCost(providerData);
    const totalDuration = providerData.reduce((sum, m) => sum + m.duration, 0);
    const totalRetries = providerData.reduce((sum, m) => sum + m.retries, 0);

    return {
      provider,
      totalRequests: providerData.length,
      successfulRequests: successful.length,
      failedRequests: providerData.length - successful.length,
      totalTokens,
      totalCost,
      averageDuration: totalDuration / providerData.length,
      cacheHitRate: cached.length / providerData.length,
      averageRetries: totalRetries / providerData.length,
      uptime: (successful.length / providerData.length) * 100
    };
  }

  /**
   * Get aggregated metrics for all providers
   */
  getAllProviderMetrics(): ProviderMetrics[] {
    const providers = new Set(this.metrics.map(m => m.provider));
    return Array.from(providers).map(p => this.getProviderMetrics(p));
  }

  /**
   * Calculate total cost from metrics
   */
  private calculateTotalCost(metrics: RequestMetrics[]): number {
    return metrics.reduce((total, m) => {
      if (!m.tokens) return total;

      const costs = TOKEN_COSTS[m.model] || TOKEN_COSTS['gpt-4']; // Default fallback
      const inputCost = (m.tokens.prompt / 1000) * costs.input;
      const outputCost = (m.tokens.completion / 1000) * costs.output;

      return total + inputCost + outputCost;
    }, 0);
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    totalRequests: number;
    successRate: number;
    totalCost: number;
    totalTokens: number;
    averageDuration: number;
    cacheHitRate: number;
    topProvider: AIProvider | null;
  } {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        totalCost: 0,
        totalTokens: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        topProvider: null
      };
    }

    const successful = this.metrics.filter(m => m.success);
    const cached = this.metrics.filter(m => m.cached);
    const totalTokens = this.metrics.reduce(
      (sum, m) => sum + (m.tokens?.total || 0),
      0
    );
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);

    // Find top provider by request count
    const providerCounts = new Map<AIProvider, number>();
    this.metrics.forEach(m => {
      providerCounts.set(m.provider, (providerCounts.get(m.provider) || 0) + 1);
    });
    const topProvider = Array.from(providerCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || null;

    return {
      totalRequests: this.metrics.length,
      successRate: (successful.length / this.metrics.length) * 100,
      totalCost: this.calculateTotalCost(this.metrics),
      totalTokens,
      averageDuration: totalDuration / this.metrics.length,
      cacheHitRate: (cached.length / this.metrics.length) * 100,
      topProvider
    };
  }

  /**
   * Get metrics for time window
   */
  getMetricsWindow(
    startTime: number,
    endTime: number = Date.now()
  ): RequestMetrics[] {
    return this.metrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Get recent metrics (last N minutes)
   */
  getRecentMetrics(minutes: number = 5): RequestMetrics[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics to JSON
   */
  export(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      summary: this.getSummary(),
      providerMetrics: this.getAllProviderMetrics(),
      recentMetrics: this.getRecentMetrics(60) // Last hour
    }, null, 2);
  }

  /**
   * Get cost breakdown by provider
   */
  getCostBreakdown(): Array<{ provider: AIProvider; cost: number; percentage: number }> {
    const providers = new Set(this.metrics.map(m => m.provider));
    const breakdown: Array<{ provider: AIProvider; cost: number; percentage: number }> = [];
    const totalCost = this.calculateTotalCost(this.metrics);

    providers.forEach(provider => {
      const providerMetrics = this.metrics.filter(m => m.provider === provider);
      const cost = this.calculateTotalCost(providerMetrics);
      breakdown.push({
        provider,
        cost,
        percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0
      });
    });

    return breakdown.sort((a, b) => b.cost - a.cost);
  }

  /**
   * Get error analysis
   */
  getErrorAnalysis(): Array<{
    error: string;
    count: number;
    providers: AIProvider[];
  }> {
    const errorMap = new Map<string, { count: number; providers: Set<AIProvider> }>();

    this.metrics
      .filter(m => !m.success && m.error)
      .forEach(m => {
        const existing = errorMap.get(m.error!) || { count: 0, providers: new Set() };
        existing.count++;
        existing.providers.add(m.provider);
        errorMap.set(m.error!, existing);
      });

    return Array.from(errorMap.entries())
      .map(([error, data]) => ({
        error,
        count: data.count,
        providers: Array.from(data.providers)
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get performance trends (hourly aggregation)
   */
  getPerformanceTrends(hours: number = 24): Array<{
    hour: number;
    requests: number;
    successRate: number;
    averageDuration: number;
  }> {
    const now = Date.now();
    const trends: Array<{
      hour: number;
      requests: number;
      successRate: number;
      averageDuration: number;
    }> = [];

    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = now - (i + 1) * 60 * 60 * 1000;
      const hourEnd = now - i * 60 * 60 * 1000;
      const hourMetrics = this.getMetricsWindow(hourStart, hourEnd);

      if (hourMetrics.length > 0) {
        const successful = hourMetrics.filter(m => m.success);
        trends.push({
          hour: i,
          requests: hourMetrics.length,
          successRate: (successful.length / hourMetrics.length) * 100,
          averageDuration:
            hourMetrics.reduce((sum, m) => sum + m.duration, 0) / hourMetrics.length
        });
      }
    }

    return trends;
  }
}

/**
 * Real-time metrics dashboard data
 */
export interface DashboardData {
  summary: ReturnType<MetricsCollector['getSummary']>;
  providers: ProviderMetrics[];
  costBreakdown: ReturnType<MetricsCollector['getCostBreakdown']>;
  errors: ReturnType<MetricsCollector['getErrorAnalysis']>;
  trends: ReturnType<MetricsCollector['getPerformanceTrends']>;
  lastUpdated: number;
}

/**
 * Generate dashboard data
 */
export function generateDashboard(collector: MetricsCollector): DashboardData {
  return {
    summary: collector.getSummary(),
    providers: collector.getAllProviderMetrics(),
    costBreakdown: collector.getCostBreakdown(),
    errors: collector.getErrorAnalysis(),
    trends: collector.getPerformanceTrends(24),
    lastUpdated: Date.now()
  };
}
