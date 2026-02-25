import OpenAI from 'openai';
import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../types.js';

export class DeepSeekProvider implements BaseProvider {
  readonly name = 'deepseek';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new AIAdapterError('DeepSeek API key is required', 'deepseek');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1'
    });
    this.model = model || 'deepseek-chat';
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

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: false
      });

      const message = completion.choices[0].message;

      return {
        content: message.content || '',
        toolCalls: message.tool_calls?.map((tc: any) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        })),
        provider: 'deepseek',
        model: this.model,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      };
    } catch (error: any) {
      throw new AIAdapterError(
        `DeepSeek chat failed: ${error.message}`,
        'deepseek',
        error
      );
    }
  }
}
