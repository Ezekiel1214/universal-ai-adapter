import axios, { AxiosInstance } from 'axios';
import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../types.js';

export class OllamaProvider implements BaseProvider {
  get name() {
    return 'ollama' as const;
  }
  private client: AxiosInstance;
  private model: string;
  private baseURL: string;

  constructor(baseURL?: string, model?: string) {
    this.baseURL = baseURL || 'http://localhost:11434';
    this.model = model || 'llama3.2';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 120000 // 2 minutes for local models
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/api/tags');
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      return models.some((m: any) => m.name.includes(this.model));
    } catch {
      return false;
    }
  }

  getModel(): string {
    return this.model;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await this.client.post('/api/chat', {
        model: this.model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens
        }
      });

      return {
        content: response.data.message.content,
        toolCalls: [], // Ollama doesn't support function calling yet
        provider: 'ollama',
        model: this.model,
        usage: {
          promptTokens: response.data.prompt_eval_count || 0,
          completionTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
        }
      };
    } catch (error: any) {
      throw new AIAdapterError(
        `Ollama chat failed: ${error.message}`,
        'ollama',
        error
      );
    }
  }
}
