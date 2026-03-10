import { AIProvider, Message } from '../../shared/src/types.js';

/**
 * Task types for routing decisions
 */
export type TaskType = 
  | 'coding'
  | 'writing'
  | 'analysis'
  | 'chat'
  | 'math'
  | 'reasoning'
  | 'creative'
  | 'translation'
  | 'summarization'
  | 'general';

/**
 * Routing strategy
 */
export type RoutingStrategy = 
  | 'cost'        // Minimize cost
  | 'speed'       // Minimize latency
  | 'quality'     // Maximize quality
  | 'balanced'    // Balance cost/speed/quality
  | 'custom';     // Custom scoring

/**
 * Model capabilities and characteristics
 */
export interface ModelProfile {
  provider: AIProvider;
  model: string;
  
  // Capabilities (0-1 scale)
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
  
  // Performance characteristics
  performance: {
    costPer1kTokens: number;  // USD
    avgLatency: number;        // milliseconds
    maxTokens: number;
    quality: number;           // 0-1 scale
  };
  
  // Availability
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
  
  // Strategy weights (for balanced/custom)
  weights?: {
    cost: number;
    speed: number;
    quality: number;
    capability: number;
  };
  
  // Custom scoring function
  customScoreFn?: (profile: ModelProfile, context: RouterContext) => number;
  
  // Fallback if no good match
  fallbackProvider?: AIProvider;
  
  // Enable verbose logging
  verbose?: boolean;
}

/**
 * Context for routing decisions
 */
export interface RouterContext {
  taskType?: TaskType;
  messages: Message[];
  estimatedTokens?: number;
  maxCost?: number;           // USD
  maxLatency?: number;        // milliseconds
  minQuality?: number;        // 0-1 scale
  preferLocal?: boolean;      // Prefer local models (Ollama)
}

/**
 * Model Router - Intelligently route requests to optimal provider/model
 */
export class ModelRouter {
  private profiles: Map<string, ModelProfile> = new Map();
  private config: Required<RouterConfig>;

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = {
      strategy: config.strategy || 'balanced',
      weights: config.weights || {
        cost: 0.3,
        speed: 0.3,
        quality: 0.3,
        capability: 0.1
      },
      customScoreFn: config.customScoreFn || ((profile: ModelProfile, _context: RouterContext): number => profile.performance.quality),
      fallbackProvider: config.fallbackProvider || 'ollama',
      verbose: config.verbose || false
    };

    this.initializeDefaultProfiles();
  }

  private initializeDefaultProfiles(): void {
    this.addProfile({
      provider: 'openai',
      model: 'gpt-4-turbo',
      capabilities: {
        coding: 0.95,
        writing: 0.95,
        analysis: 0.95,
        chat: 0.95,
        math: 0.90,
        reasoning: 0.95,
        creative: 0.90,
        summarization: 0.90,
        translation: 0.85
      },
      performance: {
        costPer1kTokens: 0.01,
        avgLatency: 2000,
        maxTokens: 128000,
        quality: 0.95
      },
      available: true
    });

    this.addProfile({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      capabilities: {
        coding: 0.75,
        writing: 0.80,
        analysis: 0.75,
        chat: 0.80,
        math: 0.70,
        reasoning: 0.75,
        creative: 0.75,
        summarization: 0.75,
        translation: 0.80
      },
      performance: {
        costPer1kTokens: 0.0005,
        avgLatency: 1000,
        maxTokens: 16000,
        quality: 0.75
      },
      available: true
    });

    this.addProfile({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      capabilities: {
        coding: 0.98,
        writing: 0.95,
        analysis: 0.95,
        chat: 0.95,
        math: 0.85,
        reasoning: 0.95,
        creative: 0.92,
        summarization: 0.93,
        translation: 0.90
      },
      performance: {
        costPer1kTokens: 0.003,
        avgLatency: 2500,
        maxTokens: 200000,
        quality: 0.95
      },
      available: true
    });

    this.addProfile({
      provider: 'groq',
      model: 'llama-3.1-70b',
      capabilities: {
        coding: 0.85,
        writing: 0.85,
        analysis: 0.80,
        chat: 0.82,
        math: 0.75,
        reasoning: 0.80,
        creative: 0.80,
        summarization: 0.78,
        translation: 0.75
      },
      performance: {
        costPer1kTokens: 0.00059,
        avgLatency: 500,
        maxTokens: 8000,
        quality: 0.80
      },
      available: true
    });

    this.addProfile({
      provider: 'deepseek',
      model: 'deepseek-chat',
      capabilities: {
        coding: 0.90,
        writing: 0.80,
        analysis: 0.85,
        chat: 0.88,
        math: 0.85,
        reasoning: 0.85,
        creative: 0.75,
        summarization: 0.80,
        translation: 0.70
      },
      performance: {
        costPer1kTokens: 0.00014,
        avgLatency: 1500,
        maxTokens: 64000,
        quality: 0.82
      },
      available: true
    });

    this.addProfile({
      provider: 'ollama',
      model: 'llama3.2',
      capabilities: {
        coding: 0.70,
        writing: 0.75,
        analysis: 0.70,
        chat: 0.72,
        math: 0.65,
        reasoning: 0.70,
        creative: 0.70,
        summarization: 0.68,
        translation: 0.65
      },
      performance: {
        costPer1kTokens: 0,
        avgLatency: 3000,
        maxTokens: 128000,
        quality: 0.70
      },
      available: true
    });
  }

  addProfile(profile: ModelProfile): void {
    const key = `${profile.provider}:${profile.model}`;
    this.profiles.set(key, profile);
  }

  removeProfile(provider: AIProvider, model: string): void {
    const key = `${provider}:${model}`;
    this.profiles.delete(key);
  }

  updateAvailability(provider: AIProvider, model: string, available: boolean): void {
    const key = `${provider}:${model}`;
    const profile = this.profiles.get(key);
    if (profile) {
      profile.available = available;
    }
  }

  route(context: RouterContext): RoutingDecision {
    const availableProfiles = Array.from(this.profiles.values())
      .filter(p => p.available)
      .filter(p => this.meetsConstraints(p, context));

    if (availableProfiles.length === 0) {
      return {
        provider: this.config.fallbackProvider,
        model: 'default',
        score: 0,
        reasoning: 'No profiles meet constraints, using fallback',
        alternatives: []
      };
    }

    const scored = availableProfiles.map(profile => ({
      profile,
      score: this.scoreProfile(profile, context)
    }));

    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternatives = scored.slice(1, 4).map(s => ({
      provider: s.profile.provider,
      model: s.profile.model,
      score: s.score
    }));

    const reasoning = this.explainDecision(best.profile, context);

    if (this.config.verbose) {
      process.stdout.write(
        [
          '[router] Model Router Decision:',
          `  Provider: ${best.profile.provider}`,
          `  Model: ${best.profile.model}`,
          `  Score: ${best.score.toFixed(2)}`,
          `  Reasoning: ${reasoning}`
        ].join('\n') + '\n'
      );
    }

    return {
      provider: best.profile.provider,
      model: best.profile.model,
      score: best.score,
      reasoning,
      alternatives
    };
  }

  private meetsConstraints(profile: ModelProfile, context: RouterContext): boolean {
    if (context.maxCost && context.estimatedTokens) {
      const estimatedCost = (context.estimatedTokens / 1000) * profile.performance.costPer1kTokens;
      if (estimatedCost > context.maxCost) {
        return false;
      }
    }

    if (context.maxLatency && profile.performance.avgLatency > context.maxLatency) {
      return false;
    }

    if (context.minQuality && profile.performance.quality < context.minQuality) {
      return false;
    }

    if (context.preferLocal && profile.provider !== 'ollama') {
      return false;
    }

    return true;
  }

  private scoreProfile(profile: ModelProfile, context: RouterContext): number {
    switch (this.config.strategy) {
      case 'cost':
        return this.scoreCost(profile);
      case 'speed':
        return this.scoreSpeed(profile);
      case 'quality':
        return this.scoreQuality(profile, context);
      case 'balanced':
        return this.scoreBalanced(profile, context);
      case 'custom':
        return this.config.customScoreFn
          ? this.config.customScoreFn(profile, context)
          : this.scoreBalanced(profile, context);
      default:
        return this.scoreBalanced(profile, context);
    }
  }

  private scoreCost(profile: ModelProfile): number {
    const maxCost = 0.1;
    return 1 - Math.min(profile.performance.costPer1kTokens / maxCost, 1);
  }

  private scoreSpeed(profile: ModelProfile): number {
    const maxLatency = 10000;
    return 1 - Math.min(profile.performance.avgLatency / maxLatency, 1);
  }

  private scoreQuality(profile: ModelProfile, context: RouterContext): number {
    let score = profile.performance.quality;

    if (context.taskType && context.taskType !== 'general') {
      const capability = profile.capabilities[context.taskType] || 0.5;
      score = (score + capability) / 2;
    }

    return score;
  }

  private scoreBalanced(profile: ModelProfile, context: RouterContext): number {
    const costScore = this.scoreCost(profile);
    const speedScore = this.scoreSpeed(profile);
    const qualityScore = this.scoreQuality(profile, context);

    const weights = this.config.weights;
    
    return (
      costScore * weights.cost +
      speedScore * weights.speed +
      qualityScore * (weights.quality + weights.capability)
    );
  }

  private explainDecision(profile: ModelProfile, context: RouterContext): string {
    const reasons: string[] = [];

    if (this.config.strategy === 'cost') {
      reasons.push(`lowest cost ($${profile.performance.costPer1kTokens.toFixed(4)}/1k tokens)`);
    }

    if (this.config.strategy === 'speed') {
      reasons.push(`fastest response (~${profile.performance.avgLatency}ms)`);
    }

    if (this.config.strategy === 'quality') {
      reasons.push(`highest quality (${(profile.performance.quality * 100).toFixed(0)}%)`);
    }

    if (context.taskType && context.taskType !== 'general') {
      const capability = profile.capabilities[context.taskType];
      if (capability > 0.85) {
        reasons.push(`excellent for ${context.taskType} tasks`);
      }
    }

    if (profile.provider === 'ollama') {
      reasons.push('free local inference');
    }

    return reasons.length > 0 
      ? reasons.join(', ')
      : 'best overall match for request';
  }

  getProfiles(): ModelProfile[] {
    return Array.from(this.profiles.values());
  }

  getProfilesByProvider(provider: AIProvider): ModelProfile[] {
    return Array.from(this.profiles.values())
      .filter(p => p.provider === provider);
  }

  detectTaskType(messages: Message[]): TaskType {
    const content = messages.map(m => m.content.toLowerCase()).join(' ');

    if (/(code|function|class|debug|implement|algorithm|syntax)/i.test(content)) {
      return 'coding';
    }

    if (/(calculate|equation|math|solve|formula)/i.test(content)) {
      return 'math';
    }

    if (/(translate|translation|language)/i.test(content)) {
      return 'translation';
    }

    if (/(summarize|summary|tldr|brief)/i.test(content)) {
      return 'summarization';
    }

    if (/(analyze|analysis|compare|evaluate)/i.test(content)) {
      return 'analysis';
    }

    if (/(creative|story|poem|imagine|generate)/i.test(content)) {
      return 'creative';
    }

    return 'chat';
  }

  estimateTokens(messages: Message[]): number {
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4);
  }

  updateStrategy(strategy: RoutingStrategy, weights?: RouterConfig['weights']): void {
    this.config.strategy = strategy;
    if (weights) {
      this.config.weights = weights;
    }
  }

  getStatistics(): {
    totalProfiles: number;
    availableProfiles: number;
    providerCounts: Record<AIProvider, number>;
    avgCost: number;
    avgLatency: number;
  } {
    const profiles = Array.from(this.profiles.values());
    const available = profiles.filter(p => p.available);

    const providerCounts = profiles.reduce((acc, p) => {
      acc[p.provider] = (acc[p.provider] || 0) + 1;
      return acc;
    }, {} as Record<AIProvider, number>);

    const avgCost = profiles.reduce((sum, p) => sum + p.performance.costPer1kTokens, 0) / profiles.length;
    const avgLatency = profiles.reduce((sum, p) => sum + p.performance.avgLatency, 0) / profiles.length;

    return {
      totalProfiles: profiles.length,
      availableProfiles: available.length,
      providerCounts,
      avgCost,
      avgLatency
    };
  }
}

export function createCostRouter(config: Partial<RouterConfig> = {}): ModelRouter {
  return new ModelRouter({
    ...config,
    strategy: 'cost'
  });
}

export function createSpeedRouter(config: Partial<RouterConfig> = {}): ModelRouter {
  return new ModelRouter({
    ...config,
    strategy: 'speed'
  });
}

export function createQualityRouter(config: Partial<RouterConfig> = {}): ModelRouter {
  return new ModelRouter({
    ...config,
    strategy: 'quality'
  });
}
