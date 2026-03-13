# Universal AI Adapter

> A unified TypeScript library for integrating multiple AI providers with automatic fallback, Compare All feature, and Custom Agents.

[![npm version](https://img.shields.io/npm/v/universal-ai-adapter.svg)](https://www.npmjs.com/package/universal-ai-adapter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

### Core Features
✅ **Unified Interface** - One API for all providers  
✅ **15 AI Providers** - Ollama, LocalAI, Cerebras, OpenRouter, Qwen, Kimi, Mistral, Perplexity, Minimax, Z AI, OpenAI, Anthropic, Groq, DeepSeek, Gemini  
✅ **Automatic Fallback** - Seamlessly switch providers on failure  
✅ **Type Safe** - Full TypeScript support  
✅ **Response Caching** - Built-in caching with multiple presets  
✅ **Rate Limiting** - Per-provider rate limit management  
✅ **Retry Logic** - Exponential backoff with jitter  
✅ **Circuit Breaker** - Prevent cascading failures  
✅ **Streaming Support** - Real-time response streaming for ALL providers  
✅ **Model Router** - Intelligent provider selection  

### Advanced Features
✅ **Compare All** - Compare responses from multiple AIs side-by-side  
✅ **Provider Selection** - Select which providers to compare  
✅ **Custom Agents** - Define purpose, instructions, tone, guardrails  
✅ **Knowledge Base** - Upload documents for RAG-style queries  
✅ **VPN/Proxy Support** - Route traffic through proxy for privacy  
✅ **Voice Input/Output** - Use F1/F2 keys for voice  
✅ **Dashboard** - Analytics and usage tracking  
✅ **Tools/Skills/MCPs** - Select tools for AI agents  
✅ **Web UI** - Modern chat interface  
✅ **CLI Tool** - Command-line interface  

## Supported Providers

| Provider | Status | Streaming | Free Tier | Latest Models |
|----------|--------|-----------|-----------|---------------|
| **Ollama** | ✅ | ✅ | ✅ Free (Local) | llama3.3, mistral, codellama |
| **LocalAI** | ✅ | ✅ | ✅ Free (Local) | llama3.3, mistral, gemma2 |
| **Cerebras** | ✅ | ✅ | ✅ Free (API) | llama-3.3-70b, llama-3.1-70b |
| **OpenRouter** | ✅ | ✅ | ✅ Free (API) | llama-3.3-70b, deepseek-r1 |
| **Qwen** | ✅ | ✅ | ✅ Free (API) | qwen3-235b-a22b, qwen3-30b-a3b |
| **Kimi** | ✅ | ✅ | ✅ Free (API) | kimi-k2.5, kimi-k2, kimi-k1.5 |
| **Mistral** | ✅ | ✅ | ✅ Free | mistral-large-latest, mistral-small |
| **Perplexity** | ✅ | ✅ | ✅ Free | sonar-small, sonar-large |
| **Minimax** | ✅ | ✅ | ✅ Budget | MiniMax-Text-01 |
| **Z AI** | ✅ | ✅ | ✅ Free | glm-5, glm-4-flash |
| **OpenAI** | ✅ | ✅ | ❌ Paid | gpt-5.2, o1, o1-mini |
| **Anthropic** | ✅ | ✅ | ❌ Paid | claude-sonnet-4-6, claude-opus-4-6 |
| **Groq** | ✅ | ✅ | ✅ Free | llama-3.3-70b, mixtral-8x7b |
| **DeepSeek** | ✅ | ✅ | ✅ Budget | deepseek-chat, deepseek-coder-v2 |
| **Gemini** | ✅ | ✅ | ✅ Free | gemini-3.1-pro, gemini-3-flash |

## Quick Start

### 1. Web UI (Recommended)

```bash
# Start the server
npm run start

# Open in browser
http://localhost:3000
```

### 2. Use as NPM Package

```bash
npm install universal-ai-adapter
```

```typescript
import { UniversalAIAdapter } from 'universal-ai-adapter';

const adapter = new UniversalAIAdapter({
  provider: 'ollama',
  providers: {
    ollama: { baseURL: 'http://localhost:11434', model: 'llama3.2' }
  }
});

const response = await adapter.simpleChat('Hello!');
console.log(response);
```

### 3. CLI

```bash
# Install globally
npm install -g universal-ai-adapter

# Run
universal-ai-adapter --prompt "Hello"
```

## Web UI Features

### Simple Chat
- Select from ALL available models in one dropdown
- Provider status indicators
- Markdown support with syntax highlighting
- Loading states and typing indicators

### Compare All
- Compare responses from multiple AI providers simultaneously
- Select/deselect which providers to include
- Real-time status tracking per provider
- Side-by-side comparison view
- Scrollable response cards

### Custom Agent
- Define agent **purpose** and **instructions**
- Set **tone** (Professional, Friendly, Humorous, Technical)
- Add **guardrails** (No medical advice, stay on topic, etc.)
- Upload **knowledge base** documents for RAG
- VPN/Proxy toggle for privacy

### Tools/Skills/MCPs
- Select available tools for AI agents
- MCP server configuration
- Function calling support
- Custom skill definitions

### Voice Features
- **F1** - Voice input (hold to speak)
- **F2** - Voice output (read responses aloud)

### Dashboard
- Token usage tracking
- Cost analytics
- Provider performance metrics
- Request history

### Navigation
- Home/Landing page
- Simple Chat view
- Compare All view
- Custom Agent view
- Settings panel

## Configuration

### Environment Variables

```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=...
GEMINI_API_KEY=...
CEREBRAS_API_KEY=...
OPENROUTER_API_KEY=...
KIMI_API_KEY=...

# Ollama (optional)
OLLAMA_BASE_URL=http://localhost:11434

# Proxy (optional)
HTTP_PROXY=https://proxy:8080
HTTPS_PROXY=https://proxy:8080

# Server Configuration (optional)
PORT=3000
ENABLE_AUTH=true              # Require API key for access
API_KEY=your-secret-key      # Custom API key
ENABLE_RATE_LIMIT=true       # Enable rate limiting (default: true)
RATE_LIMIT_MAX=100            # Max requests per window (default: 100)
RATE_LIMIT_WINDOW=60000        # Window in ms (default: 60000 = 1 min)
```

### Authentication

When `ENABLE_AUTH=true`, all API requests require an API key:

```bash
# Via header (recommended)
curl -H "X-API-Key: your-secret-key" http://localhost:3000/api/chat

# Via query parameter
curl http://localhost:3000/api/chat?apiKey=your-secret-key
```

### Rate Limiting

Rate limiting is enabled by default (100 requests per minute). Check your remaining quota:

```bash
# Get rate limit status
curl http://localhost:3000/api/rate-limit/status

# Response:
# { "remaining": 95, "resetTime": 1234567890, "limit": 100 }
```

### Programmatic Configuration

```typescript
const adapter = new UniversalAIAdapter({
  provider: 'openai',
  providers: {
    ollama: { baseURL: 'http://localhost:11434', model: 'llama3.3' },
    qwen: { apiKey: process.env.QWEN_API_KEY, model: 'qwen3-235b-a22b' },
    openai: { apiKey: process.env.OPENAI_API_KEY, model: 'gpt-5.2' },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' },
    groq: { apiKey: process.env.GROQ_API_KEY, model: 'llama-3.3-70b' },
    deepseek: { apiKey: process.env.DEEPSEEK_API_KEY, model: 'deepseek-chat' },
    gemini: { apiKey: process.env.GEMINI_API_KEY, model: 'gemini-3.1-pro' }
  },
  fallbackOrder: ['ollama', 'qwen', 'groq', 'gemini', 'openai', 'anthropic', 'deepseek'],
  
  // Advanced options
  cache: {
    enabled: true,
    ttl: 1000 * 60 * 60, // 1 hour
    maxSize: 100
  },
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60 * 1000 // 1 minute
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 30 * 1000
  }
});
```

## API Reference

### `UniversalAIAdapter`

#### Constructor
```typescript
new UniversalAIAdapter(config: UniversalAIConfig)
```

#### Methods

| Method | Description |
|--------|-------------|
| `chat(request)` | Send a chat request |
| `stream(request)` | Stream responses (if supported) |
| `simpleChat(message)` | Simple single-message chat |
| `getProviderStatuses()` | Check all provider statuses |

### Server API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send chat message (any provider) |
| `/api/models` | GET | Get available models (14 providers) |
| `/api/providers/status` | POST | Check provider status |
| `/api/compare` | POST | Compare ALL providers at once |
| `/api/knowledge/upload` | POST | Upload knowledge base file |
| `/api/knowledge/query` | POST | Query knowledge base |
| `/api/knowledge/files` | GET | List knowledge files |
| `/api/knowledge/files/:filename` | GET | Get single file content |
| `/api/knowledge/files/:filename` | PUT | Update file content |
| `/api/knowledge/files/:filename` | DELETE | Delete a file |
| `/api/knowledge/clear` | DELETE | Clear all knowledge files |
| `/api/dashboard` | GET | Analytics & metrics |
| `/api/dashboard/track` | POST | Track usage |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Start server
npm run start

# Build CLI
npm run build:cli
```

## Docker

```bash
# Build
docker build -t universal-ai-adapter .

# Run
docker run -p 3000:3000 universal-ai-adapter
```

## Use Cases

### 1. Multi-Provider Comparison
Compare responses from GPT-4, Claude, Gemini, and local Ollama models to find the best answer for your specific use case.

### 2. Cost Optimization
Route requests through free providers (Ollama, Groq, Gemini) for development and testing, switch to premium for production.

### 3. Reliability & Fallback
Automatically fall back to alternative providers when your primary provider experiences issues.

### 4. Local-First Development
Use Ollama for free local development without API costs, then deploy with cloud providers.

### 5. Custom AI Agents
Create specialized agents with custom instructions, tone, and guardrails for specific tasks.

### 6. Knowledge-Augmented AI
Upload documents to create a knowledge base for RAG-style queries.

## Project Structure

```
universal-ai-adapter/
├── src/
│   ├── index.ts          # Main exports
│   ├── adapter.ts        # Core adapter
│   ├── types.ts          # TypeScript types
│   ├── cache.ts         # Caching
│   ├── rate-limit.ts    # Rate limiting & circuit breaker
│   ├── streaming.ts     # Streaming utilities
│   ├── metrics.ts       # Analytics & metrics
│   ├── model-router.ts  # Intelligent routing
│   ├── smart-adapter.ts # Advanced adapter
│   └── providers/       # Provider implementations
│       ├── openai.ts
│       ├── anthropic.ts
│       ├── groq.ts
│       ├── deepseek.ts
│       ├── ollama.ts
│       ├── localai.ts
│       └── gemini.ts
├── web/public/          # Web UI
│   ├── index.html       # Unified chat interface
│   └── landing.html     # Landing page
├── download/            # Download website
│   └── index.html
├── server.js            # Express server
├── cli.cjs              # CLI tool
└── package.json
```

## Comparison with Alternatives

| Feature | Universal AI Adapter | LangChain | LiteLLM | AiSuite |
|---------|---------------------|-----------|---------|---------|
| Providers | 15 | 100+ | 100+ | 10+ |
| Setup Time | 2 min | 30+ min | 10 min | 5 min |
| Fallback | ✅ Built-in | ❌ Manual | ✅ Built-in | ❌ |
| Type Safety | ✅ Full TS | ⚠️ Partial | ❌ None | ❌ |
| Bundle Size | ~50KB | ~500KB | ~100KB | ~80KB |
| Free Options | Yes | No | Yes | Yes |
| Compare All | ✅ Built-in | ❌ | ❌ | ❌ |
| Custom Agents | ✅ Built-in | ✅ | ❌ | ❌ |
| Web UI | ✅ Built-in | ❌ | ❌ | ❌ |
| VPN/Proxy | ✅ Built-in | ❌ | ❌ | ❌ |

## License

MIT License - See LICENSE file for details.

## Support

- [GitHub Issues](https://github.com/Ezekiel1214/universal-ai-adapter/issues)
- [NPM Package](https://www.npmjs.com/package/universal-ai-adapter)


