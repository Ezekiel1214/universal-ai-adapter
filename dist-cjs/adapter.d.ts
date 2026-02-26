import { UniversalAIConfig, ChatRequest, ChatResponse, AIProvider, ProviderStatus } from './types.js';
import { StreamChunk } from './streaming.js';
/**
 * Universal AI Adapter
 *
 * Provides a unified interface to multiple AI providers with automatic fallback
 */
export declare class UniversalAIAdapter {
    private config;
    private currentProvider;
    private providerCache;
    constructor(config: UniversalAIConfig);
    /**
     * Initialize a provider
     */
    private initializeProvider;
    /**
     * Send a chat request with automatic fallback
     */
    chat(request: ChatRequest): Promise<ChatResponse>;
    /**
     * Get status of all configured providers
     */
    getProviderStatuses(): Promise<ProviderStatus[]>;
    /**
     * Get current provider info
     */
    getCurrentProvider(): {
        provider: AIProvider;
        model: string;
        available: boolean;
    };
    /**
     * Switch to a different provider
     */
    switchProvider(provider: AIProvider): void;
    /**
     * Simple chat helper with string messages
     */
    simpleChat(prompt: string, systemPrompt?: string, options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<string>;
    /**
     * Check if current provider supports streaming
     */
    supportsStreaming(): boolean;
    /**
     * Stream chat response (if provider supports it)
     */
    stream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown>;
    /**
     * Stream chat with automatic aggregation
     */
    streamChat(request: ChatRequest): Promise<{
        content: string;
        stream: AsyncGenerator<StreamChunk, void, unknown>;
    }>;
}
