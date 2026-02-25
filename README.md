# Universal AI Adapter

> A unified TypeScript library for integrating multiple AI providers with automatic fallback support.

[![npm version](https://img.shields.io/npm/v/universal-ai-adapter.svg)](https://www.npmjs.com/package/universal-ai-adapter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

✅ **Unified Interface** - One API for all providers  
✅ **Automatic Fallback** - Seamlessly switch providers on failure  
✅ **Type Safe** - Full TypeScript support  
✅ **Response Caching** - Built-in caching with multiple presets  
✅ **Rate Limiting** - Per-provider rate limit management  
✅ **Retry Logic** - Exponential backoff with jitter  
✅ **Circuit Breaker** - Prevent cascading failures  
✅ **Streaming Support** - Stream management utilities  
✅ **Zero Config** - Works with environment variables  
✅ **Local-First** - Free Ollama support out of the box  
✅ **Tool Calling** - Function calling support where available

## Supported Providers

| Provider | Status | Tool Calling | Free Tier |
|----------|--------|--------------|-----------|
| **Ollama** | ✅ | ❌ | ✅ Free (Local) |
| **OpenAI** | ✅ | ✅ | ❌ Paid |
| **Anthropic** | ✅ | ✅ | ❌ Paid |
| **Groq** | ✅ | ✅ | ✅ Free Tier |
| **DeepSeek** | ✅ | ✅ | ✅ Budget |

## Installation

```bash
npm install universal-ai-adapter
```

### Peer Dependencies

```bash
# For OpenAI, Groq, DeepSeek (all use OpenAI SDK)
npm install openai

# For Anthropic
npm install @anthropic-ai/sdk

# For HTTP requests (Ollama)
npm install axios
```

## Quick Start

### 1. Basic Usage (Free with Ollama)

```typescript
import { UniversalAIAdapter } from 'universal-ai-adapter';

const adapter = new UniversalAIAdapter({
  provider: 'ollama',
  providers: {
    ollama: {
      baseURL: 'http://localhost:11434',
      model: 'llama3.2'
    }
  }
});

const response = await adapter.simpleChat(
  'Explain quantum computing in one sentence',
  'You are a helpful assistant'
);

console.log(response); // AI response
```

### 2. With Automatic Fallback

```typescript
const adapter = new UniversalAIAdapter({
  provider: 'openai', // Primary
  enableFallback: true,
  fallbackOrder: ['groq', 'ollama'], // Try these if OpenAI fails
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview'
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama-3.1-70b-versatile'
    },
    ollama: {
      baseURL: 'http://localhost:11434',
      model: 'llama3.2'
    }
  }
});

// Will try OpenAI → Groq → Ollama automatically
const response = await adapter.chat({
  messages: [
    { role: 'system', content: 'You are a code expert' },
    { role: 'user', content: 'Write a sorting function in Python' }
  ],
  temperature: 0.7
});

console.log(response.content);
console.log(response.provider); // Which provider was actually used
console.log(response.isFallback); // true if not primary provider
```

### 3. Environment-Based Configuration

```typescript
// .env file
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

// Code
import { UniversalAIAdapter } from 'universal-ai-adapter';

const adapter = new UniversalAIAdapter({
  provider: (process.env.AI_PROVIDER as any) || 'ollama',
  enableFallback: true,
  verbose: true, // Log provider switches
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4-turbo-preview'
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY!
    },
    ollama: {
      baseURL: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_MODEL
    }
  }
});
```

### 4. With Tool/Function Calling

```typescript
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name'
          }
        },
        required: ['location']
      }
    }
  }
];

const response = await adapter.chat({
  messages: [
    { role: 'user', content: 'What\'s the weather in London?' }
  ],
  tools
});

if (response.toolCalls && response.toolCalls.length > 0) {
  const toolCall = response.toolCalls[0];
  console.log('Function:', toolCall.function.name);
  console.log('Arguments:', JSON.parse(toolCall.function.arguments));
  // { location: "London" }
}
```

## API Reference

### Constructor

```typescript
new UniversalAIAdapter(config: UniversalAIConfig)
```

**Config Options:**

```typescript
interface UniversalAIConfig {
  provider: 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'ollama' | 'none';
  providers?: {
    openai?: { apiKey: string; model?: string; baseURL?: string };
    anthropic?: { apiKey: string; model?: string };
    groq?: { apiKey: string; model?: string };
    deepseek?: { apiKey: string; model?: string };
    ollama?: { baseURL?: string; model?: string };
  };
  enableFallback?: boolean; // Default: true
  fallbackOrder?: AIProvider[]; // Default: ['ollama', 'groq', 'openai', 'anthropic', 'deepseek']
  verbose?: boolean; // Default: false
  timeout?: number; // Default: 60000ms
}
```

### Methods

#### `chat(request: ChatRequest): Promise<ChatResponse>`

Send a chat request.

```typescript
const response = await adapter.chat({
  messages: [
    { role: 'system', content: 'You are helpful' },
    { role: 'user', content: 'Hello!' }
  ],
  tools: [], // Optional
  temperature: 0.7, // Optional (0-1)
  maxTokens: 2000 // Optional
});
```

**Response:**

```typescript
interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  isFallback?: boolean; // true if not primary provider
}
```

#### `simpleChat(prompt, systemPrompt?, options?): Promise<string>`

Simplified chat interface.

```typescript
const answer = await adapter.simpleChat(
  'Explain TypeScript',
  'You are a teacher',
  { temperature: 0.5, maxTokens: 500 }
);
```

#### `getProviderStatuses(): Promise<ProviderStatus[]>`

Check health of all providers.

```typescript
const statuses = await adapter.getProviderStatuses();
// [
//   { provider: 'openai', available: true, model: 'gpt-4' },
//   { provider: 'ollama', available: true, model: 'llama3.2' }
// ]
```

#### `getCurrentProvider()`

Get current active provider.

```typescript
const info = adapter.getCurrentProvider();
// { provider: 'openai', model: 'gpt-4-turbo-preview', available: true }
```

#### `switchProvider(provider: AIProvider)`

Manually switch provider.

```typescript
adapter.switchProvider('groq');
```

## Use Cases

### 1. Cost Optimization

```typescript
// Use free Ollama for dev, paid APIs for production
const adapter = new UniversalAIAdapter({
  provider: process.env.NODE_ENV === 'production' ? 'openai' : 'ollama',
  providers: { /* ... */ }
});
```

### 2. Reliability

```typescript
// Never go down - automatic fallback chain
const adapter = new UniversalAIAdapter({
  provider: 'openai',
  enableFallback: true,
  fallbackOrder: ['anthropic', 'groq', 'ollama']
});
```

### 3. Privacy-First

```typescript
// Keep sensitive data local with Ollama
const adapter = new UniversalAIAdapter({
  provider: 'ollama',
  enableFallback: false // Never send to cloud
});
```

### 4. Multi-Model Ensemble

```typescript
// Get responses from multiple models
const providers: AIProvider[] = ['openai', 'anthropic', 'groq'];
const responses = await Promise.all(
  providers.map(p => {
    adapter.switchProvider(p);
    return adapter.simpleChat('Explain AI safety');
  })
);
```

## Error Handling

```typescript
import { AIAdapterError } from 'universal-ai-adapter';

try {
  const response = await adapter.chat({ messages });
} catch (error) {
  if (error instanceof AIAdapterError) {
    console.error(`Provider ${error.provider} failed:`, error.message);
    console.error('Cause:', error.cause);
  }
}
```

## Setup Ollama (Free)

```bash
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull a model (one-time, ~2GB)
ollama pull llama3.2

# 3. Start server
ollama serve

# 4. Use with adapter
const adapter = new UniversalAIAdapter({
  provider: 'ollama',
  providers: {
    ollama: {
      baseURL: 'http://localhost:11434',
      model: 'llama3.2'
    }
  }
});
```

## Express.js Integration

```typescript
import express from 'express';
import { UniversalAIAdapter } from 'universal-ai-adapter';

const app = express();
app.use(express.json());

const adapter = new UniversalAIAdapter({
  provider: 'ollama',
  enableFallback: true
});

app.post('/api/chat', async (req, res) => {
  try {
    const response = await adapter.chat({
      messages: req.body.messages
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## Testing

```typescript
// Mock provider for tests
const adapter = new UniversalAIAdapter({
  provider: 'none', // No real provider
  enableFallback: false
});

// Or use Ollama for integration tests (free)
const adapter = new UniversalAIAdapter({
  provider: 'ollama'
});
```

## Comparison

| Feature | This Library | LangChain | Raw SDK |
|---------|-------------|-----------|---------|
| Setup Time | 2 min | 30 min | Per provider |
| Fallback | ✅ Built-in | ❌ Manual | ❌ None |
| Type Safety | ✅ Full | ⚠️ Partial | ✅ Full |
| Bundle Size | ~50KB | ~500KB | ~20KB |
| Free Option | ✅ Ollama | ❌ | Depends |

## Advanced Features

See [API.md](API.md) for complete documentation.

### Response Caching

```typescript
import { ResponseCache, CachePresets } from 'universal-ai-adapter';

const cache = new ResponseCache(CachePresets.production);

// Check cache before making request
let response = cache.get(messages);
if (!response) {
  response = await adapter.chat({ messages });
  cache.set(messages, response, 'openai', 'gpt-4');
}

console.log('Cache stats:', cache.getStats());
```

### Rate Limiting

```typescript
import { RateLimiter } from 'universal-ai-adapter';

const limiter = new RateLimiter();

// Wait for available slot
await limiter.waitForSlot('openai');
limiter.recordRequest('openai');

try {
  const response = await adapter.chat({ messages });
  return response;
} finally {
  limiter.recordCompletion('openai');
}
```

### Retry with Exponential Backoff

```typescript
import { RetryHandler } from 'universal-ai-adapter';

const retry = new RetryHandler({
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2
});

const response = await retry.execute(async () => {
  return await adapter.chat({ messages });
}, 'Chat Request');
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from 'universal-ai-adapter';

const breaker = new CircuitBreaker();

if (!breaker.isOpen('openai')) {
  try {
    const response = await adapter.chat({ messages });
    breaker.recordSuccess('openai');
  } catch (error) {
    breaker.recordFailure('openai');
    throw error;
  }
}
```

## Roadmap

- [x] Streaming support
- [x] Response caching
- [x] Rate limiting
- [x] Retry logic with exponential backoff
- [x] Circuit breaker pattern
- [ ] Token usage tracking dashboard
- [ ] Model router (auto-select based on task)
- [ ] Azure OpenAI support
- [ ] Google Gemini support
- [ ] Custom provider plugins

## License

MIT

## Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Made with ❤️ for developers who want AI without the complexity**
