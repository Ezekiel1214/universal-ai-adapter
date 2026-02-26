import { ChatRequest, ChatResponse } from '../types.js';
import { StreamChunk } from '../streaming.js';
/**
 * Base interface all providers must implement
 */
export interface BaseProvider {
    /**
     * Provider name
     */
    readonly name: string;
    /**
     * Check if provider is available and configured
     */
    isAvailable(): Promise<boolean>;
    /**
     * Send chat request to provider
     */
    chat(request: ChatRequest): Promise<ChatResponse>;
    /**
     * Stream chat response (optional - providers may not support it)
     */
    stream?(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown>;
    /**
     * Check if provider supports streaming
     */
    supportsStreaming?(): boolean;
    /**
     * Get current model being used
     */
    getModel(): string;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
}
