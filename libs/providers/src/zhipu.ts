import OpenAI from 'openai';
import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../../shared/src/types.js';
import { StreamChunk } from '../../shared/src/streaming.js';
import { toError } from './openai-compatible.js';

export class ZhipuProvider implements BaseProvider {
  readonly name = 'zhipu';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string, baseURL?: string) {
    if (!apiKey) {
      throw new AIAdapterError('Zhipu (Z AI) API key is required', 'zhipu');
    }

    this.client = new OpenAI({ apiKey, baseURL: baseURL || 'https://open.bigmodel.cn/api/paas/v4' });
    this.model = model || 'glm-5';
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
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      yield {
        content: delta?.content || undefined,
        done: chunk.choices[0]?.finish_reason !== null,
        provider: 'zhipu',
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
        provider: 'zhipu',
        model: this.model,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      };
    } catch (error: unknown) {
      const normalizedError = toError(error);
      throw new AIAdapterError(`Zhipu (Z AI) chat failed: ${normalizedError.message}`, 'zhipu', normalizedError);
    }
  }
}
