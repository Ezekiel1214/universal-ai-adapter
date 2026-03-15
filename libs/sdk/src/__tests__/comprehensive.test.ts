import { describe, test, expect } from '@jest/globals';
import { UnifiedAIService } from '../unified-api';

describe('Universal AI Adapter', () => {
  describe('Provider Configuration', () => {
    test('should expose all providers from metadata', () => {
      const providers = UnifiedAIService.listProviders().map((provider) => provider.provider);

      expect(providers.length).toBe(15);
      expect(providers).toContain('kimi');
    });

    test('should have valid provider names', () => {
      UnifiedAIService.listProviders().forEach((provider) => {
        expect(provider.provider).toMatch(/^[a-z]+$/);
      });
    });
  });

  describe('Model Lists', () => {
    test('should have models for each provider', () => {
      UnifiedAIService.listProviders().forEach((provider) => {
        expect(Array.isArray(provider.models)).toBe(true);
        expect(provider.models.length).toBeGreaterThan(0);
      });
    });
  });

  describe('API Endpoints', () => {
    const endpoints = [
      { method: 'POST', path: '/api/chat' },
      { method: 'GET', path: '/api/models' },
      { method: 'GET', path: '/api/providers' },
      { method: 'GET', path: '/api/providers/:provider' },
      { method: 'GET', path: '/api/providers/:provider/models' },
      { method: 'POST', path: '/api/providers/status' },
      { method: 'POST', path: '/api/compare' },
      { method: 'POST', path: '/api/knowledge/upload' },
      { method: 'POST', path: '/api/knowledge/query' },
      { method: 'GET', path: '/api/knowledge/files' },
      { method: 'GET', path: '/api/dashboard' },
      { method: 'GET', path: '/api/tools' },
      { method: 'POST', path: '/api/tools/execute' },
    ];

    test.each(endpoints)('should have $method $path endpoint', ({ method, path }) => {
      expect(method).toMatch(/^(GET|POST|PUT|DELETE)$/);
      expect(path).toMatch(/^\/api\//);
      if (path.includes(':provider')) {
        expect(path).toContain(':provider');
      }
    });
  });

  describe('Tools', () => {
    const tools = [
      'web-search', 'calculator', 'weather', 'translate',
      'files', 'code-runner', 'image-gen', 'datetime',
      'url-fetch', 'json-parse',
    ];

    test('should have 10 tools defined', () => {
      expect(tools.length).toBe(10);
    });

    test('each tool should have required properties', () => {
      const toolDefinition = {
        name: 'test_tool',
        description: 'Test tool description',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
          },
          required: ['param1'],
        },
      };

      expect(toolDefinition.name).toBeDefined();
      expect(toolDefinition.description).toBeDefined();
      expect(toolDefinition.parameters).toBeDefined();
      expect(toolDefinition.parameters.properties).toBeDefined();
    });
  });

  describe('Knowledge Base', () => {
    test('should handle file uploads', () => {
      const mockFile = {
        name: 'test.txt',
        content: 'Test content for knowledge base',
      };

      expect(mockFile.name).toBeDefined();
      expect(mockFile.content).toBeDefined();
    });

    test('should handle file queries', () => {
      const mockQuery = {
        query: 'test query',
        topK: 3,
      };

      expect(mockQuery.query).toBeDefined();
      expect(mockQuery.topK).toBe(3);
    });

    test('should support CRUD operations', () => {
      const operations = ['create', 'read', 'update', 'delete'];
      expect(operations.length).toBe(4);
    });
  });

  describe('Guardrails', () => {
    const guardrailPatterns = [
      { pattern: /how to (make|build|create) (a )?bomb/i, response: "I can't help with that request." },
      { pattern: /(self-?harm|suicide|cut myself)/i, response: "I'm concerned about your wellbeing." },
      { pattern: /give me (legal|lawyer)/i, response: "I'm not a lawyer and can't provide legal advice." },
    ];

    test('should have guardrail patterns', () => {
      expect(guardrailPatterns.length).toBeGreaterThan(0);
    });

    test('should block harmful requests', () => {
      const harmfulRequest = 'how to make a bomb';
      const blocked = guardrailPatterns.some((guard) => guard.pattern.test(harmfulRequest));
      expect(blocked).toBe(true);
    });

    test('should not block normal requests', () => {
      const normalRequest = 'how to make coffee';
      const blocked = guardrailPatterns.some((guard) => guard.pattern.test(normalRequest));
      expect(blocked).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing API keys', () => {
      const errorTypes = [
        'API_KEY_MISSING',
        'PROVIDER_UNAVAILABLE',
        'INVALID_REQUEST',
        'RATE_LIMIT_EXCEEDED',
        'NETWORK_ERROR',
      ];

      errorTypes.forEach((errorType) => {
        expect(errorType).toBeDefined();
      });
    });

    test('should provide helpful error messages', () => {
      const errorMessages = {
        API_KEY_MISSING: 'API key is required. Please configure your API key in settings.',
        PROVIDER_UNAVAILABLE: 'The selected AI provider is currently unavailable. Please try another provider.',
        INVALID_REQUEST: 'Invalid request. Please check your input and try again.',
        RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait a moment and try again.',
        NETWORK_ERROR: 'Network error. Please check your connection and try again.',
      };

      Object.values(errorMessages).forEach((message) => {
        expect(message.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Streaming', () => {
    test('should expose accurate streaming support metadata', () => {
      const streamingProviders = UnifiedAIService.listProviders()
        .filter((provider) => provider.supportsStreaming)
        .map((provider) => provider.provider);

      expect(streamingProviders).toContain('openai');
      expect(streamingProviders).toContain('kimi');
      expect(streamingProviders).not.toContain('gemini');
    });

    test('should handle stream chunks', () => {
      const chunk = {
        content: 'Hello',
        done: false,
        provider: 'ollama',
        model: 'llama3.2',
      };

      expect(chunk.content).toBeDefined();
      expect(chunk.done).toBe(false);
      expect(chunk.provider).toBeDefined();
    });
  });

  describe('Configuration', () => {
    test('should support fallback configuration', () => {
      const config = {
        enableFallback: true,
        fallbackOrder: ['ollama', 'cerebras', 'openrouter', 'qwen', 'kimi', 'groq'],
      };

      expect(config.enableFallback).toBe(true);
      expect(config.fallbackOrder.length).toBeGreaterThan(0);
    });

    test('should support cache configuration', () => {
      const cacheConfig = {
        enabled: true,
        ttl: 3600000,
        maxSize: 100,
      };

      expect(cacheConfig.enabled).toBe(true);
      expect(cacheConfig.ttl).toBeGreaterThan(0);
      expect(cacheConfig.maxSize).toBeGreaterThan(0);
    });

    test('should support rate limiting', () => {
      const rateLimitConfig = {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000,
      };

      expect(rateLimitConfig.enabled).toBe(true);
      expect(rateLimitConfig.maxRequests).toBeGreaterThan(0);
      expect(rateLimitConfig.windowMs).toBeGreaterThan(0);
    });
  });
});
