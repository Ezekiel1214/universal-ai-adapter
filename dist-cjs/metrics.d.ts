import { AIProvider } from './types.js';
/**
 * Request metrics for monitoring
 */
export interface RequestMetrics {
    provider: AIProvider;
    model: string;
    timestamp: number;
    duration: number;
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
    totalCost: number;
    averageDuration: number;
    cacheHitRate: number;
    averageRetries: number;
    uptime: number;
}
/**
 * Metrics collector and analyzer
 */
export declare class MetricsCollector {
    private metrics;
    private readonly maxMetrics;
    constructor(maxMetrics?: number);
    /**
     * Record a request
     */
    recordRequest(metric: RequestMetrics): void;
    /**
     * Get all metrics
     */
    getAllMetrics(): RequestMetrics[];
    /**
     * Get metrics for a specific provider
     */
    getProviderMetrics(provider: AIProvider): ProviderMetrics;
    /**
     * Get aggregated metrics for all providers
     */
    getAllProviderMetrics(): ProviderMetrics[];
    /**
     * Calculate total cost from metrics
     */
    private calculateTotalCost;
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
    };
    /**
     * Get metrics for time window
     */
    getMetricsWindow(startTime: number, endTime?: number): RequestMetrics[];
    /**
     * Get recent metrics (last N minutes)
     */
    getRecentMetrics(minutes?: number): RequestMetrics[];
    /**
     * Clear all metrics
     */
    clear(): void;
    /**
     * Export metrics to JSON
     */
    export(): string;
    /**
     * Get cost breakdown by provider
     */
    getCostBreakdown(): Array<{
        provider: AIProvider;
        cost: number;
        percentage: number;
    }>;
    /**
     * Get error analysis
     */
    getErrorAnalysis(): Array<{
        error: string;
        count: number;
        providers: AIProvider[];
    }>;
    /**
     * Get performance trends (hourly aggregation)
     */
    getPerformanceTrends(hours?: number): Array<{
        hour: number;
        requests: number;
        successRate: number;
        averageDuration: number;
    }>;
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
export declare function generateDashboard(collector: MetricsCollector): DashboardData;
