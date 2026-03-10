import { OllamaProvider } from '../../../providers/src/ollama';
import { AIAdapterError } from '../types';

describe('Providers', () => {
  describe('OllamaProvider', () => {
    it('should create provider with default config', () => {
      const provider = new OllamaProvider();
      
      expect(provider.name).toBe('ollama');
      expect(provider.getModel()).toBe('llama3.2');
    });

    it('should create provider with custom config', () => {
      const provider = new OllamaProvider('http://localhost:11434', 'codellama');
      
      expect(provider.getModel()).toBe('codellama');
    });

    it('should return correct model name', () => {
      const provider = new OllamaProvider('http://localhost:11434', 'llama3.2');
      
      expect(provider.getModel()).toBe('llama3.2');
    });

    it('should have readonly name property', () => {
      const provider = new OllamaProvider();
      
      expect(provider.name).toBe('ollama');
      // @ts-expect-error - Testing readonly
      expect(() => { provider.name = 'test'; }).toThrow();
    });
  });

  describe('Provider Interface', () => {
    it('should implement BaseProvider interface', () => {
      const provider = new OllamaProvider();
      
      expect(typeof provider.isAvailable).toBe('function');
      expect(typeof provider.healthCheck).toBe('function');
      expect(typeof provider.chat).toBe('function');
      expect(typeof provider.getModel).toBe('function');
    });

    it('should have correct method signatures', async () => {
      const provider = new OllamaProvider();
      
      // isAvailable returns Promise<boolean>
      const available = provider.isAvailable();
      expect(available).toBeInstanceOf(Promise);
      
      // healthCheck returns Promise<boolean>
      const health = provider.healthCheck();
      expect(health).toBeInstanceOf(Promise);
      
      // getModel returns string
      const model = provider.getModel();
      expect(typeof model).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should throw AIAdapterError on chat failure', async () => {
      const provider = new OllamaProvider('http://localhost:99999');
      
      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      ).rejects.toThrow(AIAdapterError);
    });

    it('should include provider name in error', async () => {
      const provider = new OllamaProvider('http://localhost:99999');
      
      try {
        await provider.chat({
          messages: [{ role: 'user', content: 'Hello' }]
        });
      } catch (error: any) {
        expect(error).toBeInstanceOf(AIAdapterError);
        if (error instanceof AIAdapterError) {
          expect(error.provider).toBe('ollama');
        }
      }
    });

    it('should include original error as cause', async () => {
      const provider = new OllamaProvider('http://localhost:99999');
      
      try {
        await provider.chat({
          messages: [{ role: 'user', content: 'Hello' }]
        });
      } catch (error: any) {
        expect(error).toBeInstanceOf(AIAdapterError);
        if (error instanceof AIAdapterError) {
          expect(error.cause).toBeDefined();
        }
      }
    });
  });

  describe('Health Checks', () => {
    it('should return false for unavailable provider', async () => {
      const provider = new OllamaProvider('http://localhost:99999');
      
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    it('should return false for health check when unavailable', async () => {
      const provider = new OllamaProvider('http://localhost:99999');
      
      const healthy = await provider.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  describe('Chat Request', () => {
    it('should accept valid chat request', async () => {
      const provider = new OllamaProvider('http://localhost:99999');
      
      const request = {
        messages: [
          { role: 'user' as const, content: 'Hello' }
        ],
        temperature: 0.7,
        maxTokens: 100
      };

      await expect(provider.chat(request)).rejects.toThrow();
    });

    it('should accept messages with system role', async () => {
      const provider = new OllamaProvider('http://localhost:99999');
      
      const request = {
        messages: [
          { role: 'system' as const, content: 'You are helpful' },
          { role: 'user' as const, content: 'Hello' }
        ]
      };

      await expect(provider.chat(request)).rejects.toThrow();
    });

    it('should accept messages with assistant role', async () => {
      const provider = new OllamaProvider('http://localhost:99999');
      
      const request = {
        messages: [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' },
          { role: 'user' as const, content: 'How are you?' }
        ]
      };

      await expect(provider.chat(request)).rejects.toThrow();
    });
  });
});
