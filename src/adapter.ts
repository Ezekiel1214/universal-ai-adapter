import { 
  UniversalAIConfig, 
  ChatRequest, 
  ChatResponse, 
  AIProvider,
  ProviderStatus,
  AIAdapterError
} from './types.js';
import { BaseProvider } from './providers/base.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OllamaProvider } from './providers/ollama.js';
import { GroqProvider } from './providers/groq.js';
import { DeepSeekProvider } from './providers/deepseek.js';
import { StreamChunk, StreamAggregator } from './streaming.js';

/**
 * Universal AI Adapter
 * 
 * Provides a unified interface to multiple AI providers with automatic fallback
 */
export class UniversalAIAdapter {
  private config: UniversalAIConfig;
  private currentProvider: BaseProvider | null = null;
  private providerCache: Map<AIProvider, BaseProvider> = new Map();

  constructor(config: UniversalAIConfig) {
    this.config = {
      enableFallback: true,
      fallbackOrder: ['ollama', 'groq', 'openai', 'anthropic', 'deepseek'],
      verbose: false,
      timeout: 60000,
      ...config
    };

    this.initializeProvider(this.config.provider);
  }

  /**
   * Initialize a provider
   */
  private initializeProvider(provider: AIProvider): void {
    if (provider === 'none') {
      this.currentProvider = null;
      return;
    }

    // Check cache first
    if (this.providerCache.has(provider)) {
      this.currentProvider = this.providerCache.get(provider)!;
      return;
    }

    const providers = this.config.providers || {};

    try {
      let instance: BaseProvider | null = null;

      switch (provider) {
        case 'openai':
          if (!providers.openai?.apiKey) {
            throw new Error('OpenAI API key not provided');
          }
          instance = new OpenAIProvider(
            providers.openai.apiKey,
            providers.openai.model,
            providers.openai.baseURL
          );
          break;

        case 'anthropic':
          if (!providers.anthropic?.apiKey) {
            throw new Error('Anthropic API key not provided');
          }
          instance = new AnthropicProvider(
            providers.anthropic.apiKey,
            providers.anthropic.model
          );
          break;

        case 'groq':
          if (!providers.groq?.apiKey) {
            throw new Error('Groq API key not provided');
          }
          instance = new GroqProvider(
            providers.groq.apiKey,
            providers.groq.model
          );
          break;

        case 'deepseek':
          if (!providers.deepseek?.apiKey) {
            throw new Error('DeepSeek API key not provided');
          }
          instance = new DeepSeekProvider(
            providers.deepseek.apiKey,
            providers.deepseek.model
          );
          break;

        case 'ollama':
          instance = new OllamaProvider(
            providers.ollama?.baseURL,
            providers.ollama?.model
          );
          break;

        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      if (instance) {
        this.providerCache.set(provider, instance);
        this.currentProvider = instance;
        
        if (this.config.verbose) {
          console.log(`✅ Initialized provider: ${provider}`);
        }
      }
    } catch (error: any) {
      if (this.config.verbose) {
        console.warn(`⚠️  Failed to initialize ${provider}: ${error.message}`);
      }
      throw new AIAdapterError(
        `Failed to initialize ${provider}: ${error.message}`,
        provider,
        error
      );
    }
  }

  /**
   * Send a chat request with automatic fallback
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const providersToTry = this.config.enableFallback
      ? [this.config.provider, ...(this.config.fallbackOrder || [])]
      : [this.config.provider];

    const errors: Array<{ provider: AIProvider; error: Error }> = [];

    for (const provider of providersToTry) {
      if (provider === 'none') continue;

      try {
        // Initialize provider if not current
        if (!this.currentProvider || this.currentProvider.name !== provider) {
          this.initializeProvider(provider);
        }

        if (!this.currentProvider) continue;

        // Check if provider is available
        const isAvailable = await this.currentProvider.isAvailable();
        if (!isAvailable) {
          if (this.config.verbose) {
            console.warn(`⚠️  Provider ${provider} is not available`);
          }
          continue;
        }

        // Attempt chat
        const response = await this.currentProvider.chat(request);
        
        // Mark if this was a fallback
        if (provider !== this.config.provider) {
          response.isFallback = true;
          if (this.config.verbose) {
            console.log(`✅ Fallback to ${provider} successful`);
          }
        }

        return response;

      } catch (error: any) {
        errors.push({ provider, error });
        
        if (this.config.verbose) {
          console.error(`❌ Provider ${provider} failed:`, error.message);
        }

        // Continue to next provider in fallback chain
        continue;
      }
    }

    // All providers failed
    throw new AIAdapterError(
      `All providers failed. Errors: ${errors.map(e => `${e.provider}: ${e.error.message}`).join(', ')}`,
      this.config.provider
    );
  }

  /**
   * Get status of all configured providers
   */
  async getProviderStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];
    const providers = this.config.providers || {};

    for (const provider of Object.keys(providers) as AIProvider[]) {
      try {
        this.initializeProvider(provider);
        if (!this.currentProvider) continue;

        const available = await this.currentProvider.healthCheck();
        statuses.push({
          provider,
          available,
          model: this.currentProvider.getModel()
        });
      } catch (error: any) {
        statuses.push({
          provider,
          available: false,
          error: error.message
        });
      }
    }

    return statuses;
  }

  /**
   * Get current provider info
   */
  getCurrentProvider(): { provider: AIProvider; model: string; available: boolean } {
    if (!this.currentProvider) {
      return { provider: 'none', model: 'none', available: false };
    }

    return {
      provider: this.config.provider,
      model: this.currentProvider.getModel(),
      available: true
    };
  }

  /**
   * Switch to a different provider
   */
  switchProvider(provider: AIProvider): void {
    this.config.provider = provider;
    this.initializeProvider(provider);
  }

  /**
   * Simple chat helper with string messages
   */
  async simpleChat(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system' as const, content: systemPrompt });
    }
    
    messages.push({ role: 'user' as const, content: prompt });

    const response = await this.chat({
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    });

    return response.content;
  }

  /**
   * Check if current provider supports streaming
   */
  supportsStreaming(): boolean {
    if (!this.currentProvider) {
      return false;
    }
    return this.currentProvider.supportsStreaming?.() ?? false;
  }

  /**
   * Stream chat response (if provider supports it)
   */
  async* stream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.currentProvider) {
      throw new AIAdapterError('No provider initialized', 'none');
    }

    if (!this.currentProvider.stream) {
      throw new AIAdapterError(
        `Provider ${this.currentProvider.name} does not support streaming`,
        this.config.provider
      );
    }

    yield* this.currentProvider.stream(request);
  }

  /**
   * Stream chat with automatic aggregation
   */
  async streamChat(request: ChatRequest): Promise<{ content: string; stream: AsyncGenerator<StreamChunk, void, unknown> }> {
    const aggregator = new StreamAggregator();
    
    const stream = this.stream(request);
    
    return {
      stream,
      get content() {
        return aggregator.getContent();
      }
    };
  }
}
