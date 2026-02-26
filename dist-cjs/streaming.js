"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamAggregator = exports.StreamManager = void 0;
exports.createStreamGenerator = createStreamGenerator;
exports.collectStream = collectStream;
/**
 * Stream state management
 */
class StreamManager {
    activeStreams = new Map();
    /**
     * Register a new stream
     */
    registerStream(streamId, controller) {
        this.activeStreams.set(streamId, controller);
    }
    /**
     * Cancel a specific stream
     */
    cancelStream(streamId) {
        const controller = this.activeStreams.get(streamId);
        if (controller) {
            controller.abort();
            this.activeStreams.delete(streamId);
        }
    }
    /**
     * Cancel all active streams
     */
    cancelAllStreams() {
        for (const controller of this.activeStreams.values()) {
            controller.abort();
        }
        this.activeStreams.clear();
    }
    /**
     * Get number of active streams
     */
    getActiveStreamCount() {
        return this.activeStreams.size;
    }
    /**
     * Check if a stream is active
     */
    isStreamActive(streamId) {
        return this.activeStreams.has(streamId);
    }
}
exports.StreamManager = StreamManager;
/**
 * Aggregate streaming chunks into complete response
 */
class StreamAggregator {
    content = '';
    toolCalls = new Map();
    /**
     * Add a chunk to the aggregator
     */
    addChunk(chunk) {
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
    getContent() {
        return this.content;
    }
    /**
     * Get aggregated tool calls
     */
    getToolCalls() {
        return Array.from(this.toolCalls.values()).filter((tc) => tc.id !== undefined &&
            tc.type !== undefined &&
            tc.function !== undefined &&
            tc.function.name !== undefined &&
            tc.function.arguments !== undefined);
    }
    /**
     * Reset the aggregator
     */
    reset() {
        this.content = '';
        this.toolCalls.clear();
    }
}
exports.StreamAggregator = StreamAggregator;
/**
 * Helper to create a streaming response
 */
async function* createStreamGenerator(streamFn) {
    try {
        for await (const chunk of streamFn()) {
            yield chunk;
        }
    }
    catch (error) {
        console.error('Stream error:', error);
        throw error;
    }
}
/**
 * Helper to collect all chunks from a stream
 */
async function collectStream(stream) {
    const aggregator = new StreamAggregator();
    for await (const chunk of stream) {
        aggregator.addChunk(chunk);
    }
    return aggregator.getContent();
}
