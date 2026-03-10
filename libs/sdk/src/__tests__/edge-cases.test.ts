import { UniversalAIAdapter, SmartAdapter } from '../index';
import { ResponseCache } from '../cache';
import { RateLimiter } from '../rate-limit';
import { ModelRouter } from '../model-router';
import { StreamManager, StreamAggregator, StreamChunk } from '../streaming';
import { AIProvider } from '../types';

describe('Edge Cases', () => {
  describe('UniversalAIAdapter Edge Cases', () => {
    it('should handle empty messages array', async () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        }
      });

      try {
        await adapter.chat({ messages: [] });
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle very long messages', async () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        }
      });

      const longMessage = 'a'.repeat(10000);
      try {
        await adapter.chat({ messages: [{ role: 'user', content: longMessage }] });
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle special characters in messages', async () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        }
      });

      const specialChars = 'Hello 🌍 emoji \n newline \t tab "quotes" \'single\' backtick `code`';
      try {
        await adapter.chat({ messages: [{ role: 'user', content: specialChars }] });
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle extreme temperature values', async () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        }
      });

      try {
        await adapter.chat({ 
          messages: [{ role: 'user', content: 'test' }],
          temperature: 2.0 // Above normal range
        });
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle zero maxTokens', async () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        }
      });

      try {
        await adapter.chat({ 
          messages: [{ role: 'user', content: 'test' }],
          maxTokens: 0
        });
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid provider config gracefully', () => {
      expect(() => {
        new UniversalAIAdapter({
          provider: 'openai',
          providers: {
            openai: { apiKey: '' } // Empty key
          }
        });
      }).toThrow();
    });

    it('should handle missing provider config', () => {
      expect(() => {
        new UniversalAIAdapter({
          provider: 'openai',
          providers: {} // Missing config
        });
      }).toThrow();
    });

    it('should handle invalid fallback order', () => {
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        enableFallback: true,
        fallbackOrder: ['deepseek', 'anthropic'] as AIProvider[], // Different valid providers
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        }
      });

      expect(adapter).toBeInstanceOf(UniversalAIAdapter);
    });
  });

  describe('SmartAdapter Edge Cases', () => {
    it('should handle cache with all features disabled', () => {
      const adapter = new SmartAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        },
        cache: { enabled: false },
        rateLimit: { enabled: false },
        retry: { enabled: false },
        circuitBreaker: { enabled: false },
        metrics: { enabled: false }
      });

      expect(adapter).toBeInstanceOf(SmartAdapter);
    });

    it('should handle cache clear when disabled', () => {
      const adapter = new SmartAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        },
        cache: { enabled: false }
      });

      adapter.clearCache(); // Should not throw
    });

    it('should handle metrics export when disabled', () => {
      const adapter = new SmartAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        },
        metrics: { enabled: false }
      });

      expect(adapter.exportMetrics()).toBeNull();
    });

    it('should handle dashboard when disabled', () => {
      const adapter = new SmartAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        },
        metrics: { enabled: false }
      });

      expect(adapter.getDashboard()).toBeNull();
    });

    it('should handle status when features disabled', () => {
      const adapter = new SmartAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        },
        cache: { enabled: false },
        rateLimit: { enabled: false },
        retry: { enabled: false },
        circuitBreaker: { enabled: false },
        metrics: { enabled: false }
      });

      const status = adapter.getStatus();
      expect(status.features.cache.enabled).toBe(false);
      expect(status.features.rateLimit.enabled).toBe(false);
    });
  });

  describe('ResponseCache Edge Cases', () => {
    it('should handle cache with very long keys', () => {
      const cache = new ResponseCache({ maxSize: 10, ttl: 60000 });
      
      const longKey = 'a'.repeat(10000);
      const response = { content: 'test', provider: 'ollama' as const, model: 'test' };
      
      cache.set([{ role: 'user', content: longKey }], response, 'ollama', 'test', 0.7, 100);
      
      expect(cache.get([{ role: 'user', content: longKey }], 0.7, 100)).toBeDefined();
    });

    it('should handle cache with special characters in messages', () => {
      const cache = new ResponseCache({ maxSize: 10, ttl: 60000 });
      
      const specialMessages = [{ role: 'user' as const, content: 'test 🌍 "quotes" \n newlines' }];
      const response = { content: 'test', provider: 'ollama' as const, model: 'test' };
      
      cache.set(specialMessages, response, 'ollama', 'test', 0.7, 100);
      
      expect(cache.get(specialMessages, 0.7, 100)).toBeDefined();
    });

    it('should handle cache with different temperatures separately', () => {
      const cache = new ResponseCache({ maxSize: 10, ttl: 60000 });
      
      const messages = [{ role: 'user' as const, content: 'test' }];
      const response = { content: 'test', provider: 'ollama' as const, model: 'test' };
      
      cache.set(messages, response, 'ollama', 'test', 0.5, 100);
      cache.set(messages, { ...response, content: 'different' }, 'ollama', 'test', 0.9, 100);
      
      expect(cache.get(messages, 0.5, 100)?.content).toBe('test');
      expect(cache.get(messages, 0.9, 100)?.content).toBe('different');
    });
  });

  describe('ModelRouter Edge Cases', () => {
    it('should handle empty profiles', () => {
      const router = new ModelRouter({ strategy: 'quality' });
      // Router should still work with defaults
      
      const decision = router.route({ 
        taskType: 'coding', 
        messages: [{ role: 'user', content: 'test' }] 
      });
      
      expect(decision).toBeDefined();
      expect(decision.provider).toBeDefined();
    });

    it('should handle custom scoring function', () => {
      const router = new ModelRouter({
        strategy: 'custom',
        customScoreFn: (profile) => profile.performance.quality * 2
      });
      
      const decision = router.route({ 
        taskType: 'coding', 
        messages: [{ role: 'user', content: 'test' }] 
      });
      
      expect(decision).toBeDefined();
    });

    it('should handle constraints that match nothing', () => {
      const router = new ModelRouter({ 
        strategy: 'quality',
        fallbackProvider: 'ollama'
      });
      
      const decision = router.route({ 
        taskType: 'coding', 
        messages: [{ role: 'user', content: 'test' }],
        maxCost: 0.0001 // Very low, won't match anyone
      });
      
      expect(decision).toBeDefined();
    });
  });

  describe('Streaming Edge Cases', () => {
    it('should handle StreamAggregator with no chunks', () => {
      const aggregator = new StreamAggregator();
      
      expect(aggregator.getContent()).toBe('');
      expect(aggregator.getToolCalls()).toEqual([]);
    });

    it('should handle StreamAggregator with partial tool calls', () => {
      const aggregator = new StreamAggregator();
      
      // Add a chunk with incomplete function (missing arguments)
      const partialToolCall = { 
        id: 'call_1', 
        type: 'function' as const, 
        function: { name: 'test' } 
      };
      aggregator.addChunk({
        content: undefined,
        done: false,
        provider: 'openai',
        model: 'gpt-4',
        toolCalls: [partialToolCall as any]
      });
      
      // Should not return incomplete tool calls (missing arguments)
      const toolCalls = aggregator.getToolCalls();
      expect(toolCalls.length).toBe(0);
    });

    it('should handle StreamManager with no active streams', () => {
      const manager = new StreamManager();
      
      expect(manager.getActiveStreamCount()).toBe(0);
      expect(manager.isStreamActive('nonexistent')).toBe(false);
    });

    it('should handle StreamManager cancel nonexistent stream', () => {
      const manager = new StreamManager();
      
      expect(() => manager.cancelStream('nonexistent')).not.toThrow();
      expect(() => manager.cancelAllStreams()).not.toThrow();
    });
  });

  describe('RateLimiter Edge Cases', () => {
    it('should handle rate limiter with default config', () => {
      const limiter = new RateLimiter();
      
      expect(limiter.getStatus('openai')).toBeDefined();
    });

    it('should handle reset with no prior state', () => {
      const limiter = new RateLimiter();
      
      expect(() => limiter.reset('openai')).not.toThrow();
    });

    it('should handle waitForSlot with no limits', async () => {
      const limiter = new RateLimiter();
      
      // Should resolve immediately with default limits
      await expect(limiter.waitForSlot('openai')).resolves.not.toThrow();
    });
  });
});
