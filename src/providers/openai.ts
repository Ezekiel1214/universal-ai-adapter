import OpenAI from 'openai';
import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../types.js';

export class OpenAIProvider implements BaseProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string, baseURL?: string) {
    if (!apiKey) {
      throw new AIAdapterError('OpenAI API key is required', 'openai');
    }

    this.client = new OpenAI({ 
      apiKey,
      baseURL 
    });
    this.model = model || 'gpt-4-turbo-preview';
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
        tools: request.tools as any,
        tool_choice: request.tools && request.tools.length > 0 ? 'auto' : undefined,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: false // Force non-streaming for type safety
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
        provider: 'openai',
        model: this.model,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      };
    } catch (error: any) {
      throw new AIAdapterError(
        `OpenAI chat failed: ${error.message}`,
        'openai',
        error
      );
    }
  }
}
