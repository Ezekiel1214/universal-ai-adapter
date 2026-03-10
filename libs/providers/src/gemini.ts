import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../../shared/src/types.js';
import { StreamChunk } from '../../shared/src/streaming.js';
import { toError } from './openai-compatible.js';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
}

export class GeminiProvider implements BaseProvider {
  readonly name = 'gemini';
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(apiKey: string, model?: string, baseURL?: string) {
    if (!apiKey) {
      throw new AIAdapterError('Google Gemini API key is required', 'gemini');
    }

    this.apiKey = apiKey;
    this.model = model || 'gemini-2.0-flash';
    this.baseURL = baseURL || 'https://generativelanguage.googleapis.com';
  }

  supportsStreaming(): boolean {
    return false;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.baseURL}/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(url);
      return res.ok;
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

  async* stream(_request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    yield* [];
    throw new AIAdapterError('Streaming not supported for Gemini', 'gemini');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const contents = request.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await fetch(`${this.baseURL}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 2048,
            topP: 0.95,
            topK: 40
          }
        })
      });

      let data: GeminiResponse;
      try {
        data = await response.json() as GeminiResponse;
      } catch {
        throw new Error('Failed to parse Gemini response');
      }

      if (!response.ok) {
        throw new Error(data.error?.message || `Gemini API error: ${response.status}`);
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return {
        content,
        toolCalls: [],
        provider: 'gemini',
        model: this.model,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error: unknown) {
      const normalizedError = toError(error);
      throw new AIAdapterError(`Gemini chat failed: ${normalizedError.message}`, 'gemini', normalizedError);
    }
  }
}
