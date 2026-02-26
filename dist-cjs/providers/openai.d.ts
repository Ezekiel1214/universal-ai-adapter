import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse } from '../types.js';
import { StreamChunk } from '../streaming.js';
export declare class OpenAIProvider implements BaseProvider {
    readonly name = "openai";
    private client;
    private model;
    constructor(apiKey: string, model?: string, baseURL?: string);
    supportsStreaming(): boolean;
    isAvailable(): Promise<boolean>;
    healthCheck(): Promise<boolean>;
    getModel(): string;
    stream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown>;
    chat(request: ChatRequest): Promise<ChatResponse>;
}
