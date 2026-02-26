/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'ollama' | 'none';
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
        parameters: Record<string, any>;
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
export declare class AIAdapterError extends Error {
    provider?: AIProvider | undefined;
    cause?: Error | undefined;
    constructor(message: string, provider?: AIProvider | undefined, cause?: Error | undefined);
}
