/**
 * Supported AI providers
 */
export type AIProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'groq' 
  | 'deepseek' 
  | 'ollama' 
  | 'localai'
  | 'gemini'
  | 'qwen'
  | 'mistral'
  | 'perplexity'
  | 'minimax'
  | 'zhipu'
  | 'openrouter'
  | 'cerebras'
  | 'kimi'
  | 'none';

/**
 * Configuration for each provider
 */
export interface ProviderConfig {
  openai?: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  };
  anthropic?: {
    apiKey: string;
    model?: string;
  };
  groq?: {
    apiKey: string;
    model?: string;
  };
  deepseek?: {
    apiKey: string;
    model?: string;
  };
  ollama?: {
    baseURL?: string;
    model?: string;
  };
  localai?: {
    baseURL?: string;
    model?: string;
  };
  gemini?: {
    apiKey: string;
    model?: string;
  };
  qwen?: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  };
  mistral?: {
    apiKey: string;
    model?: string;
  };
  perplexity?: {
    apiKey: string;
    model?: string;
  };
  minimax?: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  };
  zhipu?: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  };
  openrouter?: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  };
  cerebras?: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  };
  kimi?: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  };
}

/**
 * Universal AI Adapter configuration
 */
export interface UniversalAIConfig {
  /** Primary provider to use */
  provider: AIProvider;
  
  /** Provider-specific configurations */
  providers?: ProviderConfig;
  
  /** Enable automatic fallback to other providers */
  enableFallback?: boolean;
  
  /** Fallback order when primary fails */
  fallbackOrder?: AIProvider[];
  
  /** Enable verbose logging */
  verbose?: boolean;
  
  /** Timeout for requests in milliseconds */
  timeout?: number;
}

/**
 * Tool definition compatible with OpenAI function calling
 */
export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Message format
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Chat request parameters
 */
export interface ChatRequest {
  messages: Message[];
  tools?: AITool[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Tool call from AI
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Universal chat response
 */
export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  isFallback?: boolean;
}

/**
 * Provider status
 */
export interface ProviderStatus {
  provider: AIProvider;
  available: boolean;
  model?: string;
  error?: string;
}

/**
 * Error types
 */
export class AIAdapterError extends Error {
  constructor(
    message: string,
    public provider?: AIProvider,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AIAdapterError';
  }
}
