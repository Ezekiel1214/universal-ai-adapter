import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse } from '../types.js';
export declare class OllamaProvider implements BaseProvider {
    get name(): "ollama";
    private client;
    private model;
    private baseURL;
    constructor(baseURL?: string, model?: string);
    isAvailable(): Promise<boolean>;
    healthCheck(): Promise<boolean>;
    getModel(): string;
    chat(request: ChatRequest): Promise<ChatResponse>;
}
