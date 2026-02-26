"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const types_js_1 = require("../types.js");
class OllamaProvider {
    get name() {
        return 'ollama';
    }
    client;
    model;
    baseURL;
    constructor(baseURL, model) {
        this.baseURL = baseURL || 'http://localhost:11434';
        this.model = model || 'llama3.2';
        this.client = axios_1.default.create({
            baseURL: this.baseURL,
            timeout: 120000 // 2 minutes for local models
        });
    }
    async isAvailable() {
        try {
            await this.client.get('/api/tags');
            return true;
        }
        catch {
            return false;
        }
    }
    async healthCheck() {
        try {
            const response = await this.client.get('/api/tags');
            const models = response.data.models || [];
            return models.some((m) => m.name.includes(this.model));
        }
        catch {
            return false;
        }
    }
    getModel() {
        return this.model;
    }
    async chat(request) {
        try {
            const response = await this.client.post('/api/chat', {
                model: this.model,
                messages: request.messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                stream: false,
                options: {
                    temperature: request.temperature ?? 0.7,
                    num_predict: request.maxTokens
                }
            });
            return {
                content: response.data.message.content,
                toolCalls: [], // Ollama doesn't support function calling yet
                provider: 'ollama',
                model: this.model,
                usage: {
                    promptTokens: response.data.prompt_eval_count || 0,
                    completionTokens: response.data.eval_count || 0,
                    totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
                }
            };
        }
        catch (error) {
            throw new types_js_1.AIAdapterError(`Ollama chat failed: ${error.message}`, 'ollama', error);
        }
    }
}
exports.OllamaProvider = OllamaProvider;
