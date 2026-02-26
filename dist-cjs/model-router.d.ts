import { AIProvider, Message } from './types.js';
/**
 * Task types for routing decisions
 */
export type TaskType = 'coding' | 'writing' | 'analysis' | 'chat' | 'math' | 'reasoning' | 'creative' | 'translation' | 'summarization' | 'general';
/**
 * Routing strategy
 */
export type RoutingStrategy = 'cost' | 'speed' | 'quality' | 'balanced' | 'custom';
/**
 * Model capabilities and characteristics
 */
export interface ModelProfile {
    provider: AIProvider;
    model: string;
    capabilities: {
        coding: number;
        writing: number;
        analysis: number;
        math: number;
        reasoning: number;
        creative: number;
        chat: number;
        translation: number;
        summarization: number;
    };
    performance: {
        costPer1kTokens: number;
        avgLatency: number;
        maxTokens: number;
        quality: number;
    };
    available: boolean;
}
/**
 * Routing decision with reasoning
 */
export interface RoutingDecision {
    provider: AIProvider;
    model: string;
    score: number;
    reasoning: string;
    alternatives: Array<{
        provider: AIProvider;
        model: string;
        score: number;
    }>;
}
/**
 * Router configuration
 */
export interface RouterConfig {
    strategy: RoutingStrategy;
    weights?: {
        cost: number;
        speed: number;
        quality: number;
        capability: number;
    };
    customScoreFn?: (profile: ModelProfile, context: RouterContext) => number;
    fallbackProvider?: AIProvider;
    verbose?: boolean;
}
/**
 * Context for routing decisions
 */
export interface RouterContext {
    taskType?: TaskType;
    messages: Message[];
    estimatedTokens?: number;
    maxCost?: number;
    maxLatency?: number;
    minQuality?: number;
    preferLocal?: boolean;
}
/**
 * Model Router - Intelligently route requests to optimal provider/model
 */
export declare class ModelRouter {
    private profiles;
    private config;
    constructor(config?: Partial<RouterConfig>);
    /**
     * Initialize default model profiles with realistic data
     */
    private initializeDefaultProfiles;
    /**
     * Add or update a model profile
     */
    addProfile(profile: ModelProfile): void;
    /**
     * Remove a model profile
     */
    removeProfile(provider: AIProvider, model: string): void;
    /**
     * Update model availability
     */
    updateAvailability(provider: AIProvider, model: string, available: boolean): void;
    /**
     * Route a request to the optimal provider/model
     */
    route(context: RouterContext): RoutingDecision;
    /**
     * Check if profile meets hard constraints
     */
    private meetsConstraints;
    /**
     * Score a profile based on strategy
     */
    private scoreProfile;
    /**
     * Score based on cost (lower is better)
     */
    private scoreCost;
    /**
     * Score based on speed (faster is better)
     */
    private scoreSpeed;
    /**
     * Score based on quality and task capability
     */
    private scoreQuality;
    /**
     * Score with balanced weights
     */
    private scoreBalanced;
    /**
     * Generate human-readable explanation
     */
    private explainDecision;
    /**
     * Get all available profiles
     */
    getProfiles(): ModelProfile[];
    /**
     * Get profiles by provider
     */
    getProfilesByProvider(provider: AIProvider): ModelProfile[];
    /**
     * Detect task type from messages (simple heuristic)
     */
    detectTaskType(messages: Message[]): TaskType;
    /**
     * Estimate token count (rough approximation)
     */
    estimateTokens(messages: Message[]): number;
    /**
     * Update strategy
     */
    updateStrategy(strategy: RoutingStrategy, weights?: RouterConfig['weights']): void;
    /**
     * Get routing statistics
     */
    getStatistics(): {
        totalProfiles: number;
        availableProfiles: number;
        providerCounts: Record<AIProvider, number>;
        avgCost: number;
        avgLatency: number;
    };
}
/**
 * Create a cost-optimized router
 */
export declare function createCostRouter(config?: Partial<RouterConfig>): ModelRouter;
/**
 * Create a speed-optimized router
 */
export declare function createSpeedRouter(config?: Partial<RouterConfig>): ModelRouter;
/**
 * Create a quality-optimized router
 */
export declare function createQualityRouter(config?: Partial<RouterConfig>): ModelRouter;
