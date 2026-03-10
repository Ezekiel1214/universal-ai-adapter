import {
  AIProvider,
  ChatRequest,
  ChatResponse,
  Message,
  ProviderConfig,
  ProviderStatus,
  UniversalAIConfig,
} from '../../shared/src/types.js';
import { StreamChunk } from '../../shared/src/streaming.js';
import { UniversalAIAdapter } from './adapter.js';

type ConfigurableProvider = Exclude<AIProvider, 'none'>;

export interface UnifiedProviderOptions {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export interface UnifiedApiConfig {
  provider: ConfigurableProvider;
  providers?: ProviderConfig;
  providerOptions?: UnifiedProviderOptions;
  enableFallback?: boolean;
  fallbackOrder?: AIProvider[];
  verbose?: boolean;
  timeout?: number;
}

export interface UnifiedChatRequest extends UnifiedApiConfig {
  messages: Message[];
  tools?: ChatRequest['tools'];
  temperature?: number;
  maxTokens?: number;
}

export interface UnifiedCompareRequest extends Omit<UnifiedChatRequest, 'provider'> {
  providersToCompare: ConfigurableProvider[];
}

export interface ProviderMetadata {
  provider: ConfigurableProvider;
  label: string;
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  defaultModel: string;
  defaultBaseURL?: string;
  models: string[];
}

export const PROVIDER_MODELS: Record<ConfigurableProvider, string[]> = {
  openai: ['gpt-5.2', 'o1', 'o1-mini', 'o4-mini', 'gpt-4o'],
  anthropic: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-3-5'],
  groq: ['llama-3.3-70b', 'llama-3.1-70b', 'llama-3.1-8b', 'mixtral-8x7b'],
  deepseek: ['deepseek-chat', 'deepseek-coder-v2', 'deepseek-reasoner'],
  ollama: ['llama3.2:latest', 'llama3.3', 'mistral'],
  localai: ['llama-3.2', 'llama-3.3', 'mistral'],
  gemini: ['gemini-3.1-pro', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  qwen: ['qwen3-235b-a22b', 'qwen3-30b-a3b', 'qwen3-8b-plus', 'qwen2.5-72b'],
  mistral: ['mistral-large-latest', 'mistral-small-latest', 'mistral-medium-latest'],
  perplexity: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'],
  minimax: ['MiniMax-Text-01', 'abab6.5s-chat'],
  zhipu: ['glm-5', 'glm-4-flash', 'glm-4-plus'],
  openrouter: ['meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash', 'deepseek/deepseek-r1'],
  cerebras: ['llama-3.3-70b', 'llama-3.1-70b', 'llama-3.1-8b'],
  kimi: ['kimi-k2.5', 'kimi-k2', 'kimi-k1.5', 'kimi-k1'],
};

const providerLabels: Record<ConfigurableProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
  deepseek: 'DeepSeek',
  ollama: 'Ollama',
  localai: 'LocalAI',
  gemini: 'Google Gemini',
  qwen: 'Qwen',
  mistral: 'Mistral',
  perplexity: 'Perplexity',
  minimax: 'MiniMax',
  zhipu: 'Zhipu',
  openrouter: 'OpenRouter',
  cerebras: 'Cerebras',
  kimi: 'Kimi',
};

const providerStreamingSupport: Record<ConfigurableProvider, boolean> = {
  openai: true,
  anthropic: true,
  groq: true,
  deepseek: true,
  ollama: true,
  localai: true,
  gemini: false,
  qwen: true,
  mistral: true,
  perplexity: true,
  minimax: true,
  zhipu: true,
  openrouter: true,
  cerebras: true,
  kimi: true,
};

const defaultProviderOptions: Record<ConfigurableProvider, Required<UnifiedProviderOptions>> = {
  openai: { apiKey: '', model: 'gpt-4o', baseURL: '' },
  anthropic: { apiKey: '', model: 'claude-sonnet-4-6', baseURL: '' },
  groq: { apiKey: '', model: 'llama-3.3-70b', baseURL: '' },
  deepseek: { apiKey: '', model: 'deepseek-chat', baseURL: '' },
  ollama: { apiKey: '', model: 'llama3.2:latest', baseURL: 'http://localhost:11434' },
  localai: { apiKey: '', model: 'llama-3.2', baseURL: 'http://localhost:8080' },
  gemini: { apiKey: '', model: 'gemini-2.0-flash', baseURL: '' },
  qwen: { apiKey: '', model: 'qwen3-235b-a22b', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  mistral: { apiKey: '', model: 'mistral-large-latest', baseURL: '' },
  perplexity: { apiKey: '', model: 'llama-3.1-sonar-small-128k-online', baseURL: '' },
  minimax: { apiKey: '', model: 'MiniMax-Text-01', baseURL: 'https://api.minimax.chat/v1' },
  zhipu: { apiKey: '', model: 'glm-5', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
  openrouter: { apiKey: '', model: 'meta-llama/llama-3.3-70b-instruct', baseURL: 'https://openrouter.ai/api/v1' },
  cerebras: { apiKey: '', model: 'llama-3.3-70b', baseURL: 'https://api.cerebras.ai/v1' },
  kimi: { apiKey: '', model: 'kimi-k2.5', baseURL: 'https://api.moonshot.ai/v1' },
};

export const PROVIDER_METADATA: Record<ConfigurableProvider, ProviderMetadata> = Object.fromEntries(
  Object.entries(PROVIDER_MODELS).map(([provider, models]) => {
    const typedProvider = provider as ConfigurableProvider;
    const defaults = defaultProviderOptions[typedProvider];
    return [
      typedProvider,
      {
        provider: typedProvider,
        label: providerLabels[typedProvider],
        requiresApiKey: typedProvider !== 'ollama' && typedProvider !== 'localai',
        supportsStreaming: providerStreamingSupport[typedProvider],
        defaultModel: defaults.model,
        defaultBaseURL: defaults.baseURL || undefined,
        models,
      } satisfies ProviderMetadata,
    ];
  })
) as Record<ConfigurableProvider, ProviderMetadata>;

export function createUnifiedConfig(config: UnifiedApiConfig): UniversalAIConfig {
  return {
    provider: config.provider,
    providers: config.providers ?? buildProviderConfig(config.provider, config.providerOptions),
    enableFallback: config.enableFallback,
    fallbackOrder: config.fallbackOrder,
    verbose: config.verbose,
    timeout: config.timeout,
  };
}

export function getDefaultProviderOptions(provider: ConfigurableProvider): Required<UnifiedProviderOptions> {
  return { ...defaultProviderOptions[provider] };
}

export function buildProviderConfig(
  provider: ConfigurableProvider,
  providerOptions?: UnifiedProviderOptions
): ProviderConfig {
  const options = { ...defaultProviderOptions[provider], ...providerOptions };

  switch (provider) {
    case 'openai':
      return { openai: { apiKey: options.apiKey, model: options.model, baseURL: options.baseURL || undefined } };
    case 'anthropic':
      return { anthropic: { apiKey: options.apiKey, model: options.model } };
    case 'groq':
      return { groq: { apiKey: options.apiKey, model: options.model } };
    case 'deepseek':
      return { deepseek: { apiKey: options.apiKey, model: options.model } };
    case 'ollama':
      return { ollama: { baseURL: options.baseURL, model: options.model } };
    case 'localai':
      return { localai: { baseURL: options.baseURL, model: options.model } };
    case 'gemini':
      return { gemini: { apiKey: options.apiKey, model: options.model } };
    case 'qwen':
      return { qwen: { apiKey: options.apiKey, model: options.model, baseURL: options.baseURL } };
    case 'mistral':
      return { mistral: { apiKey: options.apiKey, model: options.model } };
    case 'perplexity':
      return { perplexity: { apiKey: options.apiKey, model: options.model } };
    case 'minimax':
      return { minimax: { apiKey: options.apiKey, model: options.model, baseURL: options.baseURL } };
    case 'zhipu':
      return { zhipu: { apiKey: options.apiKey, model: options.model, baseURL: options.baseURL } };
    case 'openrouter':
      return { openrouter: { apiKey: options.apiKey, model: options.model, baseURL: options.baseURL } };
    case 'cerebras':
      return { cerebras: { apiKey: options.apiKey, model: options.model, baseURL: options.baseURL } };
    case 'kimi':
      return { kimi: { apiKey: options.apiKey, model: options.model, baseURL: options.baseURL } };
  }
}

export class UnifiedAIService {
  constructor(private readonly adapter: UniversalAIAdapter) {}

  static fromConfig(config: UnifiedApiConfig): UnifiedAIService {
    return new UnifiedAIService(new UniversalAIAdapter(createUnifiedConfig(config)));
  }

  static listModels(provider?: ConfigurableProvider): string[] | Record<ConfigurableProvider, string[]> {
    return provider ? PROVIDER_MODELS[provider] : PROVIDER_MODELS;
  }

  static listProviders(): ProviderMetadata[] {
    return Object.values(PROVIDER_METADATA);
  }

  static getProviderMetadata(provider: ConfigurableProvider): ProviderMetadata {
    return PROVIDER_METADATA[provider];
  }

  static getDefaultProviderOptions(provider: ConfigurableProvider): Required<UnifiedProviderOptions> {
    return getDefaultProviderOptions(provider);
  }

  async chat(request: Omit<UnifiedChatRequest, 'provider' | 'providers' | 'providerOptions' | 'enableFallback' | 'fallbackOrder' | 'verbose' | 'timeout'>): Promise<ChatResponse> {
    return this.adapter.chat({
      messages: request.messages,
      tools: request.tools,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });
  }

  async simpleChat(prompt: string, systemPrompt?: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    return this.adapter.simpleChat(prompt, systemPrompt, options);
  }

  stream(request: Omit<UnifiedChatRequest, 'provider' | 'providers' | 'providerOptions' | 'enableFallback' | 'fallbackOrder' | 'verbose' | 'timeout'>): AsyncGenerator<StreamChunk, void, unknown> {
    return this.adapter.stream({
      messages: request.messages,
      tools: request.tools,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      stream: true,
    });
  }

  async getProviderStatuses(): Promise<ProviderStatus[]> {
    return this.adapter.getProviderStatuses();
  }

  getCurrentProvider(): { provider: AIProvider; model: string; available: boolean } {
    return this.adapter.getCurrentProvider();
  }

  switchProvider(provider: AIProvider): void {
    this.adapter.switchProvider(provider);
  }

  async compare(request: UnifiedCompareRequest): Promise<ChatResponse[]> {
    const responses = await Promise.all(
      request.providersToCompare.map(async (provider) => {
        const service = UnifiedAIService.fromConfig({
          provider,
          providers: request.providers,
          providerOptions: request.providerOptions,
          enableFallback: request.enableFallback,
          fallbackOrder: request.fallbackOrder,
          verbose: request.verbose,
          timeout: request.timeout,
        });

        return service.chat({
          messages: request.messages,
          tools: request.tools,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        });
      })
    );

    return responses;
  }
}
