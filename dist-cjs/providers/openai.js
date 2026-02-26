"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const types_js_1 = require("../types.js");
class OpenAIProvider {
    name = 'openai';
    client;
    model;
    constructor(apiKey, model, baseURL) {
        if (!apiKey) {
            throw new types_js_1.AIAdapterError('OpenAI API key is required', 'openai');
        }
        this.client = new openai_1.default({
            apiKey,
            baseURL
        });
        this.model = model || 'gpt-4-turbo-preview';
    }
    supportsStreaming() {
        return true;
    }
    async isAvailable() {
        try {
            await this.client.models.list();
            return true;
        }
        catch {
            return false;
        }
    }
    async healthCheck() {
        return this.isAvailable();
    }
    getModel() {
        return this.model;
    }
    async *stream(request) {
        const stream = await this.client.chat.completions.create({
            model: this.model,
            messages: request.messages.map(m => ({
                role: m.role,
                content: m.content
            })),
            tools: request.tools,
            tool_choice: request.tools && request.tools.length > 0 ? 'auto' : undefined,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            stream: true
        });
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            yield {
                content: delta?.content || undefined,
                toolCalls: delta?.tool_calls?.map((tc) => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.function?.name,
                        arguments: tc.function?.arguments
                    }
                })),
                done: chunk.choices[0]?.finish_reason !== null,
                provider: 'openai',
                model: this.model
            };
        }
    }
    async chat(request) {
        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: request.messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                tools: request.tools,
                tool_choice: request.tools && request.tools.length > 0 ? 'auto' : undefined,
                temperature: request.temperature ?? 0.7,
                max_tokens: request.maxTokens,
                stream: false
            });
            const message = completion.choices[0].message;
            return {
                content: message.content || '',
                toolCalls: message.tool_calls?.map((tc) => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments
                    }
                })),
                provider: 'openai',
                model: this.model,
                usage: completion.usage ? {
                    promptTokens: completion.usage.prompt_tokens,
                    completionTokens: completion.usage.completion_tokens,
                    totalTokens: completion.usage.total_tokens
                } : undefined
            };
        }
        catch (error) {
            throw new types_js_1.AIAdapterError(`OpenAI chat failed: ${error.message}`, 'openai', error);
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
