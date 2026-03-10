import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../../shared/src/types.js';
import { StreamChunk } from '../../shared/src/streaming.js';
import { toError } from './openai-compatible.js';

interface AnthropicInputSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export class AnthropicProvider implements BaseProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new AIAdapterError('Anthropic API key is required', 'anthropic');
    }

    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-3-5-sonnet-20241022';
  }

  supportsStreaming(): boolean {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      return !!this.client;
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
      } else if (chunk.type === 'message_delta') {
        yield {
          content: undefined,
          done: true,
          provider: 'anthropic',
          model: this.model
        };
      }
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
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
          } as AnthropicInputSchema
        })),
        temperature: request.temperature ?? 0.7
      });

      const textContent = response.content
        .filter((contentBlock): contentBlock is Anthropic.TextBlock => contentBlock.type === 'text')
        .map(contentBlock => contentBlock.text)
        .join('\n');

      const toolUse = response.content.filter(
        (contentBlock): contentBlock is Anthropic.ToolUseBlock => contentBlock.type === 'tool_use'
      );

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
    } catch (error: unknown) {
      const normalizedError = toError(error);
      throw new AIAdapterError(`Anthropic chat failed: ${normalizedError.message}`, 'anthropic', normalizedError);
    }
  }
}
