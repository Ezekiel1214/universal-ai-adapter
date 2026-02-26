import { AIProvider, Message, ToolCall } from './types.js';
/**
 * Streaming chunk from AI provider
 */
export interface StreamChunk {
    content?: string;
    toolCalls?: Partial<ToolCall>[];
    done: boolean;
    provider: AIProvider;
    model: string;
}
/**
 * Streaming options
 */
export interface StreamOptions {
    messages: Message[];
    temperature?: number;
    maxTokens?: number;
    onChunk?: (chunk: StreamChunk) => void;
    onComplete?: (fullContent: string) => void;
    onError?: (error: Error) => void;
}
/**
 * Stream response wrapper
 */
export interface StreamResponse {
    stream: AsyncGenerator<StreamChunk, void, unknown>;
    controller: AbortController;
}
/**
 * Stream state management
 */
export declare class StreamManager {
    private activeStreams;
    /**
     * Register a new stream
     */
    registerStream(streamId: string, controller: AbortController): void;
    /**
     * Cancel a specific stream
     */
    cancelStream(streamId: string): void;
    /**
     * Cancel all active streams
     */
    cancelAllStreams(): void;
    /**
     * Get number of active streams
     */
    getActiveStreamCount(): number;
    /**
     * Check if a stream is active
     */
    isStreamActive(streamId: string): boolean;
}
/**
 * Aggregate streaming chunks into complete response
 */
export declare class StreamAggregator {
    private content;
    private toolCalls;
    /**
     * Add a chunk to the aggregator
     */
    addChunk(chunk: StreamChunk): void;
    /**
     * Get aggregated content
     */
    getContent(): string;
    /**
     * Get aggregated tool calls
     */
    getToolCalls(): ToolCall[];
    /**
     * Reset the aggregator
     */
    reset(): void;
}
/**
 * Helper to create a streaming response
 */
export declare function createStreamGenerator(streamFn: () => AsyncIterable<StreamChunk>): AsyncGenerator<StreamChunk, void, unknown>;
/**
 * Helper to collect all chunks from a stream
 */
export declare function collectStream(stream: AsyncGenerator<StreamChunk, void, unknown>): Promise<string>;
