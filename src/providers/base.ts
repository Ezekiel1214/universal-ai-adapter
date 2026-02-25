import { ChatRequest, ChatResponse } from '../types.js';

/**
 * Base interface all providers must implement
 */
export interface BaseProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Check if provider is available and configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Send chat request to provider
   */
  chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Get current model being used
   */
  getModel(): string;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}
