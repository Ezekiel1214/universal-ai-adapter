import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse } from '../../shared/src/types.js';
import { StreamChunk } from '../../shared/src/streaming.js';

interface ProviderJsonUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface ProviderJsonResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
    delta?: {
      content?: string;
    };
  }>;
  usage?: ProviderJsonUsage;
}

export class OpenRouterProvider implements BaseProvider {
  readonly name = 'openrouter';

  constructor(
    private apiKey: string,
    private model: string = 'meta-llama/llama-3.3-70b-instruct',
    private baseURL: string = 'https://openrouter.ai/api/v1'
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://universal-ai-adapter.dev',
        'X-Title': 'Universal AI Adapter'
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: false
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter error: ${res.status} - ${err}`);
    }

    const data = await res.json() as ProviderJsonResponse;
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'openrouter',
      model: data.model || this.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined
    };
  }

  async *stream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://universal-ai-adapter.dev',
        'X-Title': 'Universal AI Adapter'
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: true
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter error: ${res.status} - ${err}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { done: true, provider: 'openrouter', model: this.model };
          return;
        }
        try {
          const parsed = JSON.parse(data) as ProviderJsonResponse;
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            yield { content, done: false, provider: 'openrouter', model: this.model };
          }
        } catch {
          // Ignore malformed SSE chunks.
        }
      }
    }

    yield { done: true, provider: 'openrouter', model: this.model };
  }

  supportsStreaming(): boolean {
    return true;
  }

  getModel(): string {
    return this.model;
  }

  async healthCheck(): Promise<boolean> {
    return this.isAvailable();
  }
}
