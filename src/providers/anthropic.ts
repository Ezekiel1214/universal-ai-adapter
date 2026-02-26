import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../types.js';

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

  async isAvailable(): Promise<boolean> {
    try {
      // Anthropic doesn't have a simple health check, so we'll assume it's available if client is initialized
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

  async chat(request: ChatRequest): Promise<ChatResponse> {
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
          } as any
        })),
        temperature: request.temperature ?? 0.7
      });

      // Extract content
      const textContent = response.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map(c => c.text)
        .join('\n');

      // Extract tool calls
      const toolUse = response.content.filter(
        (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use'
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
    } catch (error: any) {
      throw new AIAdapterError(
        `Anthropic chat failed: ${error.message}`,
        'anthropic',
        error
      );
    }
  }
}
