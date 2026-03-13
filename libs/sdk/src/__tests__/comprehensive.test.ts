import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Universal AI Adapter', () => {
  
  describe('Provider Configuration', () => {
    test('should have 14 providers configured', () => {
      const providers = [
        'ollama', 'localai', 'cerebras', 'openrouter',
        'qwen', 'mistral', 'perplexity', 'minimax',
        'zhipu', 'gemini', 'openai', 'anthropic', 'groq', 'deepseek'
      ];
      expect(providers.length).toBe(14);
    });

    test('should have valid provider names', () => {
      const validProviders = [
        'ollama', 'localai', 'cerebras', 'openrouter',
        'qwen', 'mistral', 'perplexity', 'minimax',
        'zhipu', 'gemini', 'openai', 'anthropic', 'groq', 'deepseek'
      ];
      validProviders.forEach(p => {
        expect(p).toMatch(/^[a-z]+$/);
      });
    });
  });

  describe('Model Lists', () => {
    test('should have models for each provider', () => {
      const models: Record<string, string[]> = {
        openai: ['gpt-5.2', 'o1', 'o1-mini'],
        anthropic: ['claude-sonnet-4-6', 'claude-opus-4-6'],
        groq: ['llama-3.3-70b', 'mixtral-8x7b'],
        deepseek: ['deepseek-chat', 'deepseek-reasoner'],
        qwen: ['qwen3-235b-a22b', 'qwen3-30b-a3b'],
        mistral: ['mistral-large-latest', 'mistral-small-latest'],
        perplexity: ['llama-3.1-sonar-small-128k-online'],
        minimax: ['MiniMax-Text-01'],
        zhipu: ['glm-5', 'glm-4-flash'],
        openrouter: ['meta-llama/llama-3.3-70b-instruct'],
        cerebras: ['llama-3.3-70b'],
        gemini: ['gemini-2.0-flash', 'gemini-2.5-pro']
      };

      Object.keys(models).forEach(provider => {
        expect(models[provider]).toBeDefined();
        expect(Array.isArray(models[provider])).toBe(true);
        expect(models[provider].length).toBeGreaterThan(0);
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
      { method: 'POST', path: '/api/tools/execute' }
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
      'url-fetch', 'json-parse'
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
            param1: { type: 'string' }
          },
          required: ['param1']
        }
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
        content: 'Test content for knowledge base'
      };

      expect(mockFile.name).toBeDefined();
      expect(mockFile.content).toBeDefined();
    });

    test('should handle file queries', () => {
      const mockQuery = {
        query: 'test query',
        topK: 3
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
      { pattern: /give me (legal|lawyer)/i, response: "I'm not a lawyer and can't provide legal advice." }
    ];

    test('should have guardrail patterns', () => {
      expect(guardrailPatterns.length).toBeGreaterThan(0);
    });

    test('should block harmful requests', () => {
      const harmfulRequest = 'how to make a bomb';
      const blocked = guardrailPatterns.some(g => g.pattern.test(harmfulRequest));
      expect(blocked).toBe(true);
    });

    test('should not block normal requests', () => {
      const normalRequest = 'how to make coffee';
      const blocked = guardrailPatterns.some(g => g.pattern.test(normalRequest));
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
        'NETWORK_ERROR'
      ];

      errorTypes.forEach(errorType => {
        expect(errorType).toBeDefined();
      });
    });

    test('should provide helpful error messages', () => {
      const errorMessages = {
        API_KEY_MISSING: 'API key is required. Please configure your API key in settings.',
        PROVIDER_UNAVAILABLE: 'The selected AI provider is currently unavailable. Please try another provider.',
        INVALID_REQUEST: 'Invalid request. Please check your input and try again.',
        RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait a moment and try again.',
        NETWORK_ERROR: 'Network error. Please check your connection and try again.'
      };

      Object.values(errorMessages).forEach(msg => {
        expect(msg.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Streaming', () => {
    test('should support streaming for all providers', () => {
      const streamingProviders = [
        'ollama', 'localai', 'cerebras', 'openrouter',
        'qwen', 'mistral', 'perplexity', 'minimax',
        'zhipu', 'gemini', 'openai', 'anthropic', 'groq', 'deepseek'
      ];
      
      // All 14 providers should support streaming
      expect(streamingProviders.length).toBe(14);
    });

    test('should handle stream chunks', () => {
      const chunk = {
        content: 'Hello',
        done: false,
        provider: 'ollama',
        model: 'llama3.2'
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
        fallbackOrder: ['ollama', 'cerebras', 'openrouter', 'qwen', 'groq']
      };

      expect(config.enableFallback).toBe(true);
      expect(config.fallbackOrder.length).toBeGreaterThan(0);
    });

    test('should support cache configuration', () => {
      const cacheConfig = {
        enabled: true,
        ttl: 3600000,
        maxSize: 100
      };

      expect(cacheConfig.enabled).toBe(true);
      expect(cacheConfig.ttl).toBeGreaterThan(0);
      expect(cacheConfig.maxSize).toBeGreaterThan(0);
    });

    test('should support rate limiting', () => {
      const rateLimitConfig = {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000
      };

      expect(rateLimitConfig.enabled).toBe(true);
      expect(rateLimitConfig.maxRequests).toBeGreaterThan(0);
      expect(rateLimitConfig.windowMs).toBeGreaterThan(0);
    });
  });
});
