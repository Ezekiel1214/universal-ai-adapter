import { UniversalAIAdapter } from '../adapter';
import { AIAdapterError } from '../types';
import { jest } from '@jest/globals';

describe('UniversalAIAdapter', () => {
  describe('Constructor', () => {
    it('should create adapter with valid config', () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: {
            baseURL: 'http://localhost:11434',
            model: 'llama3.2'
          }
        }
      });

      expect(adapter).toBeInstanceOf(UniversalAIAdapter);
    });

    it('should throw error for invalid provider without config', () => {
      expect(() => {
        new UniversalAIAdapter({
          provider: 'openai',
          providers: {} // Missing OpenAI config
        });
      }).toThrow(AIAdapterError);
    });

    it('should set default fallback config', () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: {
            baseURL: 'http://localhost:11434'
          }
        }
      });

      const provider = adapter.getCurrentProvider();
      expect(provider.provider).toBe('ollama');
    });

    it('should respect custom fallback order', () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        fallbackOrder: ['groq', 'openai'],
        providers: {
          ollama: {
            baseURL: 'http://localhost:11434'
          }
        }
      });

      expect(adapter).toBeInstanceOf(UniversalAIAdapter);
    });
  });

  describe('getCurrentProvider()', () => {
    it('should return current provider info', () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: {
            baseURL: 'http://localhost:11434',
            model: 'llama3.2'
          }
        }
      });

      const info = adapter.getCurrentProvider();
      
      expect(info.provider).toBe('ollama');
      expect(info.model).toBe('llama3.2');
      expect(info.available).toBe(true);
    });

    it('should return none for no provider', () => {
      const adapter = new UniversalAIAdapter({
        provider: 'none'
      });

      const info = adapter.getCurrentProvider();
      
      expect(info.provider).toBe('none');
      expect(info.available).toBe(false);
    });
  });

  describe('switchProvider()', () => {
    it('should switch to different provider', () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: {
            baseURL: 'http://localhost:11434',
            model: 'llama3.2'
          },
          groq: {
            apiKey: 'test-key',
            model: 'llama-3.1-70b-versatile'
          }
        }
      });

      adapter.switchProvider('groq');
      const info = adapter.getCurrentProvider();
      
      expect(info.provider).toBe('groq');
      expect(info.model).toBe('llama-3.1-70b-versatile');
    });

    it('should throw error for invalid provider', () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: {
            baseURL: 'http://localhost:11434'
          }
        }
      });

      expect(() => {
        adapter.switchProvider('openai' as any);
      }).toThrow();
    });
  });

  describe('chat()', () => {
    it('should throw error when all providers fail', async () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        enableFallback: false,
        providers: {
          ollama: {
            baseURL: 'http://localhost:99999' // Invalid port
          }
        }
      });

      await expect(
        adapter.chat({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      ).rejects.toThrow(AIAdapterError);
    });
  });

  describe('simpleChat()', () => {
    it('should accept string prompt', async () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        enableFallback: false,
        providers: {
          ollama: {
            baseURL: 'http://localhost:99999' // Will fail
          }
        }
      });

      await expect(
        adapter.simpleChat('Hello')
      ).rejects.toThrow();
    });

    it('should accept system prompt', async () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        enableFallback: false,
        providers: {
          ollama: {
            baseURL: 'http://localhost:99999'
          }
        }
      });

      await expect(
        adapter.simpleChat('Hello', 'You are helpful')
      ).rejects.toThrow();
    });
  });

  describe('Verbose Mode', () => {
    it('should enable verbose logging', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        verbose: true,
        providers: {
          ollama: {
            baseURL: 'http://localhost:11434'
          }
        }
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
