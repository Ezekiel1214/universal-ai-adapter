import OpenAI from 'openai';
import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../../shared/src/types.js';
import { StreamChunk } from '../../shared/src/streaming.js';
import { toError } from './openai-compatible.js';

export class PerplexityProvider implements BaseProvider {
  readonly name = 'perplexity';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new AIAdapterError('Perplexity API key is required', 'perplexity');
    }

    this.client = new OpenAI({ apiKey, baseURL: 'https://api.perplexity.ai' });
    this.model = model || 'llama-3.1-sonar-small-128k-online';
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
        provider: 'perplexity',
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
        provider: 'perplexity',
        model: this.model,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      };
    } catch (error: unknown) {
      const normalizedError = toError(error);
      throw new AIAdapterError(`Perplexity chat failed: ${normalizedError.message}`, 'perplexity', normalizedError);
    }
  }
}
