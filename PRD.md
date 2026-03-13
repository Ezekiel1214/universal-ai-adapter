# Universal AI Adapter - Product Requirements Document (PRD)

**Version:** 1.7.0  
**Date:** March 1, 2026  
**Status:** Production Ready

---

## 1. Executive Summary

### Purpose
Universal AI Adapter is a TypeScript library that provides a unified interface for 14 AI providers (Ollama, LocalAI, Cerebras, OpenRouter, Qwen, Mistral, Perplexity, Minimax, Z AI, OpenAI, Anthropic, Groq, DeepSeek, Gemini) with automatic fallback, caching, rate limiting, retry logic, and streaming support. It also includes a Web UI with Compare All feature and Custom Agents.

### Problem Statement
Developers face significant complexity when integrating multiple AI providers:
- Different APIs and authentication methods
- No built-in fallback mechanisms
- Manual error handling and retry logic
- No unified TypeScript types
- Difficult to switch providers for cost/performance optimization
- No easy way to compare responses across providers
- Need for custom AI agents with specific behaviors

### Solution
A single, type-safe TypeScript library that abstracts all provider differences and provides production-grade features out of the box, plus a complete Web UI for non-technical users.

---

## 2. Target Audience

### Primary Users
- **Web Developers** building AI-powered applications
- **Node.js Backend Engineers** needing unified AI integration
- **Startup Teams** wanting to avoid vendor lock-in
- **Enterprise Developers** requiring reliability and fallback capabilities
- **Researchers** comparing AI model responses
- **Non-technical users** wanting to chat with multiple AIs

### Technical Requirements
- Node.js 18+
- TypeScript 5.3+
- npm or yarn package manager

---

## 3. Product Features

### 3.1 Core Features (v1.0.0)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Unified Interface** | Single API for all 5 providers | Required |
| **Automatic Fallback** | Seamless provider switching on failure | Required |
| **Type Safety** | Full TypeScript with .d.ts declarations | Required |
| **Tool Calling** | Function calling support (where available) | Required |
| **Provider Health Checks** | Check availability of all providers | Required |
| **Verbose Logging** | Debug mode for provider switches | Required |
| **Simple Chat** | String-based chat helper | Required |

### 3.2 Advanced Features (v1.1.0)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Response Caching** | SHA-256 based with LRU eviction | Required |
| **Rate Limiting** | Per-provider request/token limits | Required |
| **Retry Logic** | Exponential backoff with jitter | Required |
| **Circuit Breaker** | Prevent cascading failures | Required |
| **Streaming Support** | Real-time response streaming | Required |
| **Model Router** | Intelligent provider selection | Optional |

### 3.3 Web UI Features (v1.7.0)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Compare All** | Compare multiple AI responses side-by-side | Required |
| **Provider Selection** | Select which providers to compare | Required |
| **Custom Agents** | Define purpose, instructions, tone, guardrails | Required |
| **Knowledge Base** | Upload documents for RAG queries | Required |
| **VPN/Proxy** | Route traffic through proxy | Required |
| **Voice Input/Output** | F1/F2 keys for voice | Required |
| **Dashboard** | Analytics and usage tracking | Required |
| **Tools/Skills/MCPs** | Select tools for AI agents | Required |

### 3.4 Future Features (Roadmap)

| Feature | Description | Target |
|---------|-------------|--------|
| **Multi-agent orchestration** | Multiple agents working together | v2.0.0 |
| **Custom Plugins** | User-defined providers | v2.0.0 |
| **Browser Extension** | Chrome/Firefox extension | v2.1.0 |
| **Desktop App** | Electron desktop application | v2.2.0 |

---

## 4. Technical Specification

### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Universal AI Adapter                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │  Cache  │  │  Rate   │  │  Retry  │  │Circuit  │      │
│  │  Layer  │  │ Limiter │  │ Handler │  │Breaker  │      │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │Streaming│  │ Metrics │  │  Model  │  │  Voice  │      │
│  │ Manager │  │         │  │ Router  │  │ Support │      │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
├─────────────────────────────────────────────────────────────┤
│                    Provider Layer                             │
│  ┌──────┬──────┬──────┬───────┬──────┬───────┬──────┐   │
│  │OpenAI│Claude│ Groq │DeepSeek│Ollama│LocalAI│Gemini│   │
│  └──────┴──────┴──────┴───────┴──────┴───────┴──────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Web UI Layer                             │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌────────┐ │
│  │Simple    │  │ Compare   │  │  Custom    │  │Dashboard│ │
│  │Chat      │  │   All     │  │  Agents    │  │        │ │
│  └──────────┘  └───────────┘  └────────────┘  └────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Supported Providers

| Provider | API Type | Streaming | Tool Calling | Free Tier |
|----------|----------|-----------|--------------|-----------|
| OpenAI | OpenAI SDK | ✅ | ✅ | ❌ |
| Anthropic | Anthropic SDK | ✅ | ✅ | ❌ |
| Groq | OpenAI SDK | ✅ | ✅ | ✅ |
| DeepSeek | OpenAI SDK | ✅ | ✅ | ✅ |
| Ollama | HTTP | ❌ | ❌ | ✅ |
| LocalAI | HTTP | ✅ | ✅ | ✅ |
| Gemini | Google SDK | ✅ | ✅ | ✅ |
| Qwen | OpenAI SDK | ✅ | ✅ | ✅ |

### 4.3 Supported Models

| Provider | Models |
|----------|--------|
| **OpenAI** | gpt-5.2, o1, o1-mini, o4-mini |
| **Anthropic** | claude-sonnet-4-6, claude-opus-4-6, claude-haiku-3-5 |
| **Groq** | llama-3.3-70b, llama-3.1-70b, mixtral-8x7b |
| **DeepSeek** | deepseek-chat, deepseek-coder-v2, deepseek-v4 (coming) |
| **Ollama** | llama3.3, llama3.2, mistral, codellama, phi4 |
| **LocalAI** | llama3.3, mistral, gemma2 |
| **Gemini** | gemini-3.1-pro, gemini-3-flash, gemini-2.5-pro, gemini-2.5-flash |
| **Qwen** | qwen3-235b-a22b, qwen3-30b-a3b, qwen3-8b-plus, qwen2.5 |

### 4.4 Dependencies

**Production:**
- `openai@^4.20.0` - OpenAI, Groq, DeepSeek SDK
- `@anthropic-ai/sdk@^0.27.0` - Anthropic SDK
- `axios@^1.7.0` - HTTP client for Ollama, LocalAI

**Development:**
- TypeScript 5.3+
- Jest 29+
- ESLint 8+
- Nx 22+

---

## 5. API Specification

### 5.1 UniversalAIAdapter

```typescript
class UniversalAIAdapter {
  constructor(config: UniversalAIConfig)
  chat(request: ChatRequest): Promise<ChatResponse>
  simpleChat(prompt: string, systemPrompt?: string, options?): Promise<string>
  stream(request: ChatRequest): AsyncGenerator<StreamChunk>
  supportsStreaming(): boolean
  getProviderStatuses(): Promise<ProviderStatus[]>
  getCurrentProvider(): { provider, model, available }
  switchProvider(provider: AIProvider): void
}
```

### 5.2 SmartAdapter

```typescript
class SmartAdapter {
  constructor(config: SmartAdapterConfig)
  chat(options: SmartRequestOptions): Promise<SmartResponse>
  routeRequest(taskType: TaskType, messages: Message[]): RoutingDecision
  switchForTask(taskType: TaskType, messages: Message[]): Promise<boolean>
  getStatus(): { provider, features }
  getMetrics(): MetricsCollector
  getDashboard(): DashboardData
  clearCache(): void
}
```

### 5.3 Configuration Types

```typescript
type AIProvider = 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'ollama' | 'localai' | 'gemini' | 'none';

interface UniversalAIConfig {
  provider: AIProvider;
  providers?: {
    openai?: { apiKey: string; model?: string; baseURL?: string };
    anthropic?: { apiKey: string; model?: string };
    groq?: { apiKey: string; model?: string };
    deepseek?: { apiKey: string; model?: string };
    ollama?: { baseURL?: string; model?: string };
    localai?: { baseURL?: string; model?: string };
    gemini?: { apiKey: string; model?: string };
  };
  enableFallback?: boolean;
  fallbackOrder?: AIProvider[];
  verbose?: boolean;
  timeout?: number;
}
```

---

## 6. Server API Specification

### 6.1 REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Unified chat for all 14 providers |
| `/api/models` | GET | Get available models per provider |
| `/api/providers/status` | POST | Check provider health |
| `/api/compare` | POST | Compare all providers simultaneously |
| `/api/knowledge/upload` | POST | Upload knowledge base files |
| `/api/knowledge/query` | POST | Query knowledge base |
| `/api/knowledge/files` | GET | List knowledge files |
| `/api/dashboard` | GET | Analytics and metrics |
| `/api/dashboard/track` | POST | Track usage |

### 6.2 One API for All Providers

The unified API allows switching providers without code changes:

```javascript
// Same interface for all 14 providers!
POST /api/chat
{
  "provider": "cerebras", // or ollama, openai, anthropic, etc.
  "apiKey": "...",
  "messages": [{"role": "user", "content": "Hello"}]
}

// Compare ALL at once!
POST /api/compare
{
  "message": "What is AI?",
  "providers": ["ollama", "qwen", "openai", "anthropic", "groq", "deepseek", "gemini"],
  "apiKeys": { "openai": "sk-...", "anthropic": "sk-ant-..." }
}
```

---

## 7. Web UI Specification

### 6.1 Views

1. **Simple Chat** - Single AI chat interface
2. **Compare All** - Multi-provider comparison
3. **Custom Agent** - Agent configuration
4. **Dashboard** - Analytics and metrics

### 6.2 Compare All Feature

- Checkbox selection for each provider
- Real-time status indicators
- Side-by-side response cards
- Scrollable content areas

### 6.3 Custom Agent Configuration

- **Purpose** - What the agent should do
- **Instructions** - Detailed behavior guidelines
- **Tone** - Professional, Friendly, Humorous, Technical
- **Guardrails** - Constraints and restrictions
- **Knowledge Base** - Uploaded documents for context

---

## 8. Non-Functional Requirements

### 7.1 Performance
- **Latency:** < 50ms overhead for adapter routing
- **Memory:** < 10MB base footprint
- **Bundle Size:** < 100KB gzipped

### 7.2 Reliability
- **Uptime:** 99.9% (excluding provider outages)
- **Error Handling:** Graceful degradation with fallback
- **Circuit Breaker:** Prevents cascading failures

### 7.3 Security
- No telemetry or data collection
- API keys never logged or exposed
- Support for environment variable configuration
- VPN/Proxy support for privacy

### 7.4 Compatibility
- Node.js 18, 20, 21
- TypeScript 5.3+
- ESM modules

---

## 8. Success Metrics

### 8.1 Adoption
- NPM downloads per month
- GitHub stars
- Number of contributors

### 8.2 Quality
- Test coverage: > 80%
- Zero critical bugs
- < 48hr response to issues

### 8.3 Performance
- Average response time
- Cache hit rate
- Fallback success rate

---

## 9. Release Plan

### v1.7.0 (Current)
- ✅ 7 AI Providers (added Gemini)
- ✅ Compare All feature
- ✅ Custom Agents
- ✅ Knowledge Base
- ✅ VPN/Proxy support
- ✅ Voice Input/Output
- ✅ Dashboard
- ✅ Tools/Skills/MCPs

### v1.3.0 (Q2 2026)
- Multi-agent orchestration
- Browser extension prototype

### v2.0.0 (Q4 2026)
- Custom provider plugins
- Breaking changes for major improvements

---

## 10. Competitor Analysis

| Feature | This Library | LangChain | LiteLLM | AiSuite |
|---------|-------------|-----------|---------|---------|
| Setup Time | 2 min | 30+ min | 10 min | 5 min |
| Fallback | ✅ Built-in | ❌ Manual | ✅ Built-in | ❌ |
| Type Safety | ✅ Full TS | ⚠️ Partial | ❌ None | ❌ |
| Bundle Size | ~50KB | ~500KB | ~100KB | ~80KB |
| Free Option | ✅ Ollama | ❌ | ✅ Ollama | ✅ Ollama |
| Compare All | ✅ Built-in | ❌ | ❌ | ❌ |
| Custom Agents | ✅ Built-in | ✅ | ❌ | ❌ |
| Web UI | ✅ Built-in | ❌ | ❌ | ❌ |
| VPN/Proxy | ✅ Built-in | ❌ | ❌ | ❌ |

---

## 11. Conclusion

Universal AI Adapter provides a production-ready solution for multi-provider AI integration. With automatic fallback, caching, rate limiting, streaming support, Compare All feature, and Custom Agents, it addresses the key challenges developers face when building AI-powered applications.

The library is available on NPM and ready for production use. The Web UI makes it accessible to non-technical users who want to compare AI responses or create custom AI agents.

**Get Started:**
```bash
npm install universal-ai-adapter
npm run start
```

**Web UI:** http://localhost:3000

**Documentation:** https://github.com/Ezekiel1214/universal-ai-adapter#readme


