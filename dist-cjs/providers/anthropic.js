"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const types_js_1 = require("../types.js");
class AnthropicProvider {
    name = 'anthropic';
    client;
    model;
    constructor(apiKey, model) {
        if (!apiKey) {
            throw new types_js_1.AIAdapterError('Anthropic API key is required', 'anthropic');
        }
        this.client = new sdk_1.default({ apiKey });
        this.model = model || 'claude-3-5-sonnet-20241022';
    }
    supportsStreaming() {
        return true;
    }
    async isAvailable() {
        try {
            return !!this.client;
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
        const systemMessage = request.messages.find(m => m.role === 'system');
        const userMessages = request.messages.filter(m => m.role !== 'system');
        const stream = await this.client.messages.stream({
            model: this.model,
            max_tokens: request.maxTokens || 4096,
            system: systemMessage?.content,
            messages: userMessages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            })),
            temperature: request.temperature ?? 0.7
        });
        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                yield {
                    content: chunk.delta.text || undefined,
                    done: false,
                    provider: 'anthropic',
                    model: this.model
                };
            }
            else if (chunk.type === 'message_delta') {
                yield {
                    content: undefined,
                    done: true,
                    provider: 'anthropic',
                    model: this.model
                };
            }
        }
    }
    async chat(request) {
        try {
            // Separate system message from other messages
            const systemMessage = request.messages.find(m => m.role === 'system');
            const userMessages = request.messages.filter(m => m.role !== 'system');
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: request.maxTokens || 4096,
                system: systemMessage?.content,
                messages: userMessages.map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                })),
                tools: request.tools?.map(t => ({
                    name: t.function.name,
                    description: t.function.description,
                    input_schema: {
                        type: 'object',
                        ...t.function.parameters
                    }
                })),
                temperature: request.temperature ?? 0.7
            });
            // Extract content
            const textContent = response.content
                .filter((c) => c.type === 'text')
                .map(c => c.text)
                .join('\n');
            // Extract tool calls
            const toolUse = response.content.filter((c) => c.type === 'tool_use');
            return {
                content: textContent,
                toolCalls: toolUse.map(tu => ({
                    id: tu.id,
                    type: 'function',
                    function: {
                        name: tu.name,
                        arguments: JSON.stringify(tu.input)
                    }
                })),
                provider: 'anthropic',
                model: this.model,
                usage: {
                    promptTokens: response.usage.input_tokens,
                    completionTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens
                }
            };
        }
        catch (error) {
            throw new types_js_1.AIAdapterError(`Anthropic chat failed: ${error.message}`, 'anthropic', error);
        }
    }
}
exports.AnthropicProvider = AnthropicProvider;
