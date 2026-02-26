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
export class StreamManager {
  private activeStreams: Map<string, AbortController> = new Map();

  /**
   * Register a new stream
   */
  registerStream(streamId: string, controller: AbortController): void {
    this.activeStreams.set(streamId, controller);
  }

  /**
   * Cancel a specific stream
   */
  cancelStream(streamId: string): void {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Cancel all active streams
   */
  cancelAllStreams(): void {
    for (const controller of this.activeStreams.values()) {
      controller.abort();
    }
    this.activeStreams.clear();
  }

  /**
   * Get number of active streams
   */
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Check if a stream is active
   */
  isStreamActive(streamId: string): boolean {
    return this.activeStreams.has(streamId);
  }
}

/**
 * Aggregate streaming chunks into complete response
 */
export class StreamAggregator {
  private content: string = '';
  private toolCalls: Map<string, Partial<ToolCall>> = new Map();

  /**
   * Add a chunk to the aggregator
   */
  addChunk(chunk: StreamChunk): void {
    if (chunk.content) {
      this.content += chunk.content;
    }

    if (chunk.toolCalls) {
      for (const toolCall of chunk.toolCalls) {
        if (toolCall.id) {
          const existing = this.toolCalls.get(toolCall.id) || {};
          this.toolCalls.set(toolCall.id, {
            ...existing,
            ...toolCall
          });
        }
      }
    }
  }

  /**
   * Get aggregated content
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Get aggregated tool calls
   */
  getToolCalls(): ToolCall[] {
    return Array.from(this.toolCalls.values()).filter(
      (tc): tc is ToolCall => 
        tc.id !== undefined && 
        tc.type !== undefined && 
        tc.function !== undefined &&
        tc.function.name !== undefined &&
        tc.function.arguments !== undefined
    );
  }

  /**
   * Reset the aggregator
   */
  reset(): void {
    this.content = '';
    this.toolCalls.clear();
  }
}

/**
 * Helper to create a streaming response
 */
export async function* createStreamGenerator(
  streamFn: () => AsyncIterable<StreamChunk>
): AsyncGenerator<StreamChunk, void, unknown> {
  try {
    for await (const chunk of streamFn()) {
      yield chunk;
    }
  } catch (error) {
    console.error('Stream error:', error);
    throw error;
  }
}

/**
 * Helper to collect all chunks from a stream
 */
export async function collectStream(
  stream: AsyncGenerator<StreamChunk, void, unknown>
): Promise<string> {
  const aggregator = new StreamAggregator();
  
  for await (const chunk of stream) {
    aggregator.addChunk(chunk);
  }
  
  return aggregator.getContent();
}
