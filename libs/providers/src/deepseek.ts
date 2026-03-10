import OpenAI from 'openai';
import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../../shared/src/types.js';
import { StreamChunk } from '../../shared/src/streaming.js';
import { mapOpenAIToolCalls, toError, toOpenAITools } from './openai-compatible.js';

export class DeepSeekProvider implements BaseProvider {
  readonly name = 'deepseek';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new AIAdapterError('DeepSeek API key is required', 'deepseek');
    }

    this.client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com/v1' });
    this.model = model || 'deepseek-chat';
  }

  supportsStreaming(): boolean {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.isAvailable();
  }

  getModel(): string {
    return this.model;
  }

  async* stream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      tools: toOpenAITools(request.tools),
      tool_choice: request.tools && request.tools.length > 0 ? 'auto' : undefined,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      yield {
        content: delta?.content || undefined,
        toolCalls: mapOpenAIToolCalls(delta?.tool_calls),
        done: chunk.choices[0]?.finish_reason !== null,
        provider: 'deepseek',
        model: this.model
      };
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: request.messages.map(m => ({ role: m.role, content: m.content })),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: false
      });

      const message = completion.choices[0].message;
      return {
        content: message.content || '',
        toolCalls: mapOpenAIToolCalls(message.tool_calls),
        provider: 'deepseek',
        model: this.model,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      };
    } catch (error: unknown) {
      const normalizedError = toError(error);
      throw new AIAdapterError(`DeepSeek chat failed: ${normalizedError.message}`, 'deepseek', normalizedError);
    }
  }
}
