# API Documentation

Complete API reference for Universal AI Adapter v1.7.0

## Table of Contents

- [UniversalAIAdapter](#universaiaiadapter)
- [SmartAdapter](#smartadapter)
- [Response Caching](#response-caching)
- [Streaming](#streaming)
- [Rate Limiting](#rate-limiting)
- [Model Router](#model-router)
- [Metrics & Dashboard](#metrics--dashboard)
- [Server API Endpoints](#server-api-endpoints)
- [Types & Interfaces](#types--interfaces)

---

## UniversalAIAdapter

Main adapter class for unified AI provider access.

### Constructor

```typescript
new UniversalAIAdapter(options?: AdapterOptions)
```

**Options:**

```typescript
interface AdapterOptions {
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    groq?: string;
    deepseek?: string;
    ollama?: string;
    localai?: string;
    gemini?: string;
    qwen?: string;
    mistral?: string;
    perplexity?: string;
    minimax?: string;
    zhipu?: string;
    openrouter?: string;
    cerebras?: string;
  };
  baseURLs?: {
    openai?: string;
    anthropic?: string;
    groq?: string;
    deepseek?: string;
    ollama?: string;
    localai?: string;
    gemini?: string;
    qwen?: string;
    mistral?: string;
    perplexity?: string;
    minimax?: string;
    zhipu?: string;
    openrouter?: string;
    cerebras?: string;
  };
  preferredProvider?: AIProvider;
  fallbackChain?: AIProvider[];
  verbose?: boolean;
  proxy?: string;
}
```

### Methods

#### `chat(options: ChatOptions): Promise<AIResponse>`

Send a chat request to the current provider.

**Parameters:**

```typescript
interface ChatOptions {
  messages: Message[];
  temperature?: number;    // 0.0 to 1.0
  maxTokens?: number;
  tools?: Tool[];
}
```

**Returns:** `Promise<AIResponse>`

**Example:**

```typescript
const response = await adapter.chat({
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7,
  maxTokens: 1000
});

console.log(response.content);
```

---

#### `simpleChat(userMessage: string): Promise<string>`

Simplified single-message chat.

**Parameters:**
- `userMessage: string` - User's message

**Returns:** `Promise<string>` - AI's response text

**Example:**

```typescript
const response = await adapter.simpleChat('What is TypeScript?');
console.log(response);
```

---

#### `getCurrentProvider(): AIProvider`

Get the currently active provider.

**Returns:** `'openai' | 'anthropic' | 'ollama' | 'groq' | 'deepseek'`

**Example:**

```typescript
const provider = adapter.getCurrentProvider();
console.log(`Using: ${provider}`);
```

---

#### `switchProvider(provider: AIProvider): void`

Manually switch to a specific provider.

**Parameters:**
- `provider: AIProvider` - Provider to switch to

**Example:**

```typescript
adapter.switchProvider('anthropic');
```

---

#### `getAvailableProviders(): AIProvider[]`

Get list of configured providers.

**Returns:** `AIProvider[]`

**Example:**

```typescript
const available = adapter.getAvailableProviders();
console.log('Available:', available);
```

---

## Response Caching

Cache AI responses to reduce API calls and costs.

### ResponseCache

```typescript
new ResponseCache(config?: Partial<CacheConfig>)
```

**Configuration:**

```typescript
interface CacheConfig {
  enabled: boolean;
  ttl: number;                      // Time-to-live in milliseconds
  maxSize: number;                  // Maximum cache entries
  includeSystemMessages?: boolean;  // Include system msgs in cache key
}
```

### Methods

#### `get(messages, temperature?, maxTokens?): AIResponse | null`

Retrieve cached response.

**Example:**

```typescript
const cached = cache.get(messages, 0.7);
if (cached) {
  console.log('Cache hit!', cached.content);
}
```

---

#### `set(messages, response, provider, model, temperature?, maxTokens?): void`

Store response in cache.

**Example:**

```typescript
cache.set(messages, response, 'openai', 'gpt-4', 0.7);
```

---

#### `getStats(): CacheStats`

Get cache statistics.

**Returns:**

```typescript
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}
```

---

#### `clear(): void`

Clear all cache entries.

---

#### `clearExpired(): void`

Remove only expired entries.

---

### Cache Presets

Pre-configured cache settings:

```typescript
import { CachePresets } from 'universal-ai-adapter';

// Production - aggressive caching
const cache = new ResponseCache(CachePresets.production);
// { enabled: true, ttl: 3600000, maxSize: 500 }

// Development - short-term caching
const cache = new ResponseCache(CachePresets.development);
// { enabled: true, ttl: 300000, maxSize: 50 }

// Testing - minimal caching
const cache = new ResponseCache(CachePresets.testing);
// { enabled: true, ttl: 60000, maxSize: 10 }

// Disabled - no caching
const cache = new ResponseCache(CachePresets.disabled);
```

---

## Streaming

Handle real-time streaming responses from AI providers.

### Interfaces

```typescript
interface StreamChunk {
  content?: string;
  toolCalls?: Partial<ToolCall>[];
  done: boolean;
  provider: AIProvider;
  model: string;
}

interface StreamOptions {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}
```

### StreamManager

Manage active streaming requests.

```typescript
const manager = new StreamManager();

// Register a stream
manager.registerStream(streamId, abortController);

// Cancel specific stream
manager.cancelStream(streamId);

// Cancel all streams
manager.cancelAllStreams();

// Check status
const count = manager.getActiveStreamCount();
const isActive = manager.isStreamActive(streamId);
```

### StreamAggregator

Collect streaming chunks into complete response.

```typescript
const aggregator = new StreamAggregator();

for await (const chunk of stream) {
  aggregator.addChunk(chunk);
}

const fullContent = aggregator.getContent();
const toolCalls = aggregator.getToolCalls();
```

### Helper Functions

#### `collectStream(stream): Promise<string>`

Collect all chunks from a stream into a single string.

```typescript
const fullResponse = await collectStream(stream);
```

---

## Rate Limiting

Prevent API quota violations and handle retries.

### RateLimiter

```typescript
const limiter = new RateLimiter();
```

#### Methods

##### `setProviderLimits(provider, config): void`

Configure rate limits for a provider.

```typescript
limiter.setProviderLimits('openai', {
  requestsPerMinute: 60,
  requestsPerHour: 3000,
  tokensPerMinute: 90000,
  concurrent: 10
});
```

---

##### `canProceed(provider, estimatedTokens?): Promise<boolean>`

Check if request can proceed within limits.

```typescript
if (await limiter.canProceed('openai')) {
  // Make request
}
```

---

##### `waitForSlot(provider, estimatedTokens?): Promise<void>`

Wait until request slot is available.

```typescript
await limiter.waitForSlot('openai');
limiter.recordRequest('openai');
// Make request
limiter.recordCompletion('openai');
```

---

##### `getStatus(provider): RateLimitStatus`

Get current rate limit status.

```typescript
const status = limiter.getStatus('openai');
console.log(`Requests this minute: ${status.requestsThisMinute}`);
console.log(`Can proceed: ${status.canProceed}`);
```

---

### RetryHandler

Automatic retry with exponential backoff.

```typescript
const retry = new RetryHandler({
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504]
});

const result = await retry.execute(async () => {
  return await adapter.chat({ messages });
}, 'Chat Request');
```

---

### CircuitBreaker

Prevent cascading failures.

```typescript
const breaker = new CircuitBreaker();

// Check before making request
if (breaker.isOpen('openai')) {
  throw new Error('Service unavailable');
}

try {
  const response = await adapter.chat({ messages });
  breaker.recordSuccess('openai');
} catch (error) {
  breaker.recordFailure('openai');
  throw error;
}

// Get status
const status = breaker.getStatus('openai');
console.log(`Failures: ${status.failures}`);
console.log(`Circuit open: ${status.isOpen}`);
```

---

## Types & Interfaces

### Message

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### AIResponse

```typescript
interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: ToolCall[];
}
```

### Tool

```typescript
interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}
```

### ToolCall

```typescript
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}
```

### AIProvider

```typescript
type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'groq' | 'deepseek';
```

### AIAdapterError

```typescript
class AIAdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: AIProvider
  )
}
```

---

## Complete Integration Example

```typescript
import {
  UniversalAIAdapter,
  ResponseCache,
  CachePresets,
  RateLimiter,
  RetryHandler,
  CircuitBreaker
} from 'universal-ai-adapter';

// Initialize components
const adapter = new UniversalAIAdapter({
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY
  },
  verbose: true
});

const cache = new ResponseCache(CachePresets.production);
const limiter = new RateLimiter();
const retry = new RetryHandler();
const breaker = new CircuitBreaker();

// Make request with all features
async function smartRequest(messages) {
  const provider = adapter.getCurrentProvider();

  // Check circuit breaker
  if (breaker.isOpen(provider)) {
    throw new Error('Circuit breaker open');
  }

  // Check cache first
  let response = cache.get(messages);
  if (response) return response;

  // Wait for rate limit
  await limiter.waitForSlot(provider);
  limiter.recordRequest(provider);

  try {
    // Execute with retry
    response = await retry.execute(async () => {
      return await adapter.chat({ messages });
    });

    // Cache success
    cache.set(messages, response, provider, response.model);
    breaker.recordSuccess(provider);

    return response;
  } catch (error) {
    breaker.recordFailure(provider);
    throw error;
  } finally {
    limiter.recordCompletion(provider);
  }
}

// Usage
const response = await smartRequest([
  { role: 'user', content: 'Hello!' }
]);

console.log(response.content);
console.log('Cache stats:', cache.getStats());
console.log('Rate limit:', limiter.getStatus(adapter.getCurrentProvider()));
```

---

## Error Handling

All errors thrown by the library extend `AIAdapterError`:

```typescript
try {
  const response = await adapter.chat({ messages });
} catch (error) {
  if (error instanceof AIAdapterError) {
    console.error(`Error [${error.code}] from ${error.provider}:`, error.message);
    
    switch (error.code) {
      case 'NO_PROVIDERS':
        // No providers configured
        break;
      case 'ALL_PROVIDERS_FAILED':
        // All providers in fallback chain failed
        break;
      case 'API_ERROR':
        // API request failed
        break;
      case 'RATE_LIMIT':
        // Rate limit exceeded
        break;
    }
  }
}
```

---

## Best Practices

### 1. Use Caching for Repeated Queries

```typescript
const cache = new ResponseCache(CachePresets.production);

// Check cache before making requests
const cached = cache.get(messages);
if (cached) return cached;

const response = await adapter.chat({ messages });
cache.set(messages, response, provider, model);
```

### 2. Implement Rate Limiting

```typescript
const limiter = new RateLimiter();

await limiter.waitForSlot('openai');
limiter.recordRequest('openai');

try {
  const response = await adapter.chat({ messages });
  return response;
} finally {
  limiter.recordCompletion('openai');
}
```

### 3. Use Circuit Breaker for Resilience

```typescript
const breaker = new CircuitBreaker();

if (breaker.isOpen('openai')) {
  // Try fallback provider
  adapter.switchProvider('anthropic');
}
```

### 4. Enable Verbose Logging for Debugging

```typescript
const adapter = new UniversalAIAdapter({
  apiKeys: { /* ... */ },
  verbose: true  // Enable detailed logs
});
```

### 5. Configure Custom Fallback Chain

```typescript
const adapter = new UniversalAIAdapter({
  apiKeys: { /* ... */ },
  preferredProvider: 'openai',
  fallbackChain: ['openai', 'anthropic', 'groq', 'ollama']
});
```

---

## Performance Tips

1. **Cache aggressively** - Use production preset for high-traffic applications
2. **Pre-warm cache** - Use `cache.warmUp()` for common queries
3. **Configure rate limits** - Match your API tier limits
4. **Use retry with jitter** - Prevents thundering herd
5. **Monitor circuit breakers** - Detect failing services early
6. **Clean expired cache** - Periodically call `cache.clearExpired()`

---

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  Message,
  AIResponse,
  Tool,
  ToolCall,
  AIProvider,
  CacheConfig,
  CacheStats,
  RateLimitConfig,
  RetryConfig,
  StreamChunk,
  StreamOptions
} from 'universal-ai-adapter';
```

---

## License

MIT License - see LICENSE file for details.

