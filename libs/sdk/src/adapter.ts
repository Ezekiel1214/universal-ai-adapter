import { 
  UniversalAIConfig, 
  ChatRequest, 
  ChatResponse, 
  AIProvider,
  ProviderStatus,
  AIAdapterError,
  Message
} from '../../shared/src/types.js';
import { BaseProvider } from '../../providers/src/base.js';
import { OpenAIProvider } from '../../providers/src/openai.js';
import { AnthropicProvider } from '../../providers/src/anthropic.js';
import { OllamaProvider } from '../../providers/src/ollama.js';
import { LocalAIProvider } from '../../providers/src/localai.js';
import { GroqProvider } from '../../providers/src/groq.js';
import { DeepSeekProvider } from '../../providers/src/deepseek.js';
import { GeminiProvider } from '../../providers/src/gemini.js';
import { QwenProvider } from '../../providers/src/qwen.js';
import { MistralProvider } from '../../providers/src/mistral.js';
import { PerplexityProvider } from '../../providers/src/perplexity.js';
import { MinimaxProvider } from '../../providers/src/minimax.js';
import { ZhipuProvider } from '../../providers/src/zhipu.js';
import { OpenRouterProvider } from '../../providers/src/openrouter.js';
import { CerebrasProvider } from '../../providers/src/cerebras.js';
import { KimiProvider } from '../../providers/src/kimi.js';
import { StreamChunk, StreamAggregator } from '../../shared/src/streaming.js';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function logInfo(message: string): void {
  // eslint-disable-next-line no-console
  console.log(message);
}

function logWarn(message: string): void {
  // eslint-disable-next-line no-console
  console.warn(message);
}

function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(message);
}

export class UniversalAIAdapter {
  private config: UniversalAIConfig;
  private currentProvider: BaseProvider | null = null;
  private providerCache: Map<AIProvider, BaseProvider> = new Map();

  constructor(config: UniversalAIConfig) {
    this.config = {
      enableFallback: true,
      fallbackOrder: ['ollama', 'localai', 'cerebras', 'openrouter', 'qwen', 'kimi', 'groq', 'mistral', 'perplexity', 'zhipu', 'gemini', 'openai', 'anthropic', 'deepseek', 'minimax'],
      verbose: false,
      timeout: 60000,
      ...config
    };

    this.initializeProvider(this.config.provider);
  }

  private initializeProvider(provider: AIProvider): void {
    if (provider === 'none') {
      this.currentProvider = null;
      return;
    }

    if (this.providerCache.has(provider)) {
      this.currentProvider = this.providerCache.get(provider) ?? null;
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
          instance = new OpenAIProvider(providers.openai.apiKey, providers.openai.model, providers.openai.baseURL);
          break;
        case 'anthropic':
          if (!providers.anthropic?.apiKey) {
            throw new Error('Anthropic API key not provided');
          }
          instance = new AnthropicProvider(providers.anthropic.apiKey, providers.anthropic.model);
          break;
        case 'groq':
          if (!providers.groq?.apiKey) {
            throw new Error('Groq API key not provided');
          }
          instance = new GroqProvider(providers.groq.apiKey, providers.groq.model);
          break;
        case 'deepseek':
          if (!providers.deepseek?.apiKey) {
            throw new Error('DeepSeek API key not provided');
          }
          instance = new DeepSeekProvider(providers.deepseek.apiKey, providers.deepseek.model);
          break;
        case 'ollama':
          instance = new OllamaProvider(providers.ollama?.baseURL, providers.ollama?.model);
          break;
        case 'localai':
          instance = new LocalAIProvider(providers.localai?.baseURL || 'http://localhost:8080', providers.localai?.model);
          break;
        case 'gemini':
          if (!providers.gemini?.apiKey) {
            throw new Error('Google Gemini API key not provided');
          }
          instance = new GeminiProvider(providers.gemini.apiKey, providers.gemini.model);
          break;
        case 'qwen':
          if (!providers.qwen?.apiKey) {
            throw new Error('Qwen API key not provided');
          }
          instance = new QwenProvider(providers.qwen.apiKey, providers.qwen.model, providers.qwen.baseURL);
          break;
        case 'mistral':
          if (!providers.mistral?.apiKey) {
            throw new Error('Mistral API key not provided');
          }
          instance = new MistralProvider(providers.mistral.apiKey, providers.mistral.model);
          break;
        case 'perplexity':
          if (!providers.perplexity?.apiKey) {
            throw new Error('Perplexity API key not provided');
          }
          instance = new PerplexityProvider(providers.perplexity.apiKey, providers.perplexity.model);
          break;
        case 'minimax':
          if (!providers.minimax?.apiKey) {
            throw new Error('Minimax API key not provided');
          }
          instance = new MinimaxProvider(providers.minimax.apiKey, providers.minimax.model, providers.minimax.baseURL);
          break;
        case 'zhipu':
          if (!providers.zhipu?.apiKey) {
            throw new Error('Zhipu (Z AI) API key not provided');
          }
          instance = new ZhipuProvider(providers.zhipu.apiKey, providers.zhipu.model, providers.zhipu.baseURL);
          break;
        case 'openrouter':
          if (!providers.openrouter?.apiKey) {
            throw new Error('OpenRouter API key not provided');
          }
          instance = new OpenRouterProvider(providers.openrouter.apiKey, providers.openrouter.model, providers.openrouter.baseURL);
          break;
        case 'cerebras':
          if (!providers.cerebras?.apiKey) {
            throw new Error('Cerebras API key not provided');
          }
          instance = new CerebrasProvider(providers.cerebras.apiKey, providers.cerebras.model, providers.cerebras.baseURL);
          break;
        case 'kimi':
          if (!providers.kimi?.apiKey) {
            throw new Error('Kimi (Moonshot AI) API key not provided');
          }
          instance = new KimiProvider(providers.kimi.apiKey, providers.kimi.model, providers.kimi.baseURL);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      if (instance) {
        this.providerCache.set(provider, instance);
        this.currentProvider = instance;
        if (this.config.verbose) {
          logInfo(`[adapter] Initialized provider: ${provider}`);
        }
      }
    } catch (error: unknown) {
      const normalizedError = toError(error);
      if (this.config.verbose) {
        logWarn(`[adapter] Failed to initialize ${provider}: ${normalizedError.message}`);
      }
      throw new AIAdapterError(`Failed to initialize ${provider}: ${normalizedError.message}`, provider, normalizedError);
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const providersToTry = this.config.enableFallback
      ? [this.config.provider, ...(this.config.fallbackOrder || [])]
      : [this.config.provider];

    const errors: Array<{ provider: AIProvider; error: Error }> = [];

    for (const provider of providersToTry) {
      if (provider === 'none') continue;

      try {
        if (!this.currentProvider || this.currentProvider.name !== provider) {
          this.initializeProvider(provider);
        }

        if (!this.currentProvider) continue;

        const isAvailable = await this.currentProvider.isAvailable();
        if (!isAvailable) {
          if (this.config.verbose) {
            logWarn(`[adapter] Provider ${provider} is not available`);
          }
          continue;
        }

        const response = await this.currentProvider.chat(request);

        if (provider !== this.config.provider) {
          response.isFallback = true;
          if (this.config.verbose) {
            logInfo(`[adapter] Fallback to ${provider} successful`);
          }
        }

        return response;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        errors.push({ provider, error: normalizedError });

        if (this.config.verbose) {
          logError(`[adapter] Provider ${provider} failed: ${normalizedError.message}`);
        }
      }
    }

    throw new AIAdapterError(
      `All providers failed. Errors: ${errors.map(e => `${e.provider}: ${e.error.message}`).join(', ')}`,
      this.config.provider
    );
  }

  async getProviderStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];
    const providers = this.config.providers || {};

    for (const provider of Object.keys(providers) as AIProvider[]) {
      try {
        this.initializeProvider(provider);
        if (!this.currentProvider) continue;

        const available = await this.currentProvider.healthCheck();
        statuses.push({ provider, available, model: this.currentProvider.getModel() });
      } catch (error: unknown) {
        const normalizedError = toError(error);
        statuses.push({ provider, available: false, error: normalizedError.message });
      }
    }

    return statuses;
  }

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

  switchProvider(provider: AIProvider): void {
    this.config.provider = provider;
    this.initializeProvider(provider);
  }

  async simpleChat(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const messages: Message[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.chat({
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    });

    return response.content;
  }

  supportsStreaming(): boolean {
    if (!this.currentProvider) {
      return false;
    }
    return this.currentProvider.supportsStreaming?.() ?? false;
  }

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

  async streamChat(request: ChatRequest): Promise<{ content: string; stream: AsyncGenerator<StreamChunk, void, unknown> }> {
    const aggregator = new StreamAggregator();
    const stream = this.stream(request);

    return {
      stream,
      get content(): string {
        return aggregator.getContent();
      }
    };
  }
}
