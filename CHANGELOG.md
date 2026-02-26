# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Token usage tracking dashboard
- Azure OpenAI provider
- Google Gemini provider
- Custom provider plugins
- Anthropic streaming support
- Ollama streaming support

## [1.1.0] - 2026-02-26

### Added
- **Streaming Support** - Real-time response streaming
  - `stream()` method on adapter and providers
  - `supportsStreaming()` method to check capability
  - Streaming support for OpenAI, Groq, DeepSeek providers
  - `StreamManager` for controlling active streams
  - `StreamAggregator` for collecting chunks
- **Model Router Integration** - Intelligent model selection
  - Task-based routing (coding, writing, analysis, chat, math, reasoning, creative, translation, summarization)
  - Multiple routing strategies (cost, speed, quality, balanced)
  - Custom scoring functions
  - Integrated into SmartAdapter
- **Integration Tests** - Comprehensive test coverage
  - Fallback logic tests
  - Provider switching tests
  - Streaming support tests
  - Error handling tests

### Added (from v1.1.0 features previously)
- **Response Caching** (`cache.ts`) - SHA-256 based intelligent caching
  - Multiple cache presets (production, development, testing, disabled)
  - Configurable TTL (time-to-live) and max size
  - LRU (Least Recently Used) eviction policy
  - Cache statistics (hit rate, size, timestamps)
  - Cache warming for common queries
  - Optional system message inclusion in cache keys
- **Rate Limiting** (`rate-limit.ts`) - Per-provider rate management
  - Requests per minute/hour tracking
  - Token-based rate limiting
  - Concurrent request limiting
  - Conservative default limits for all 5 providers
  - Wait for available slots
  - Real-time rate limit status
- **Retry Logic** (`rate-limit.ts`) - Exponential backoff with jitter
  - Configurable max retries (default: 3)
  - Exponential backoff multiplier
  - Smart detection of retryable errors (429, 500, 502, 503, 504)
  - Network error handling (ECONNRESET, ETIMEDOUT, ENOTFOUND)
  - Retry context for logging
- **Circuit Breaker** (`rate-limit.ts`) - Prevent cascading failures
  - Automatic service failure detection (5 failures = open)
  - Auto-recovery after timeout (1 minute)
  - Status monitoring per provider
  - Failure count tracking
- **Streaming Support** (`streaming.ts`) - Stream management utilities
  - `StreamManager` for controlling active streams
  - `StreamAggregator` for collecting chunks into responses
  - `StreamChunk` interface with content and tool calls
  - Helper functions (`createStreamGenerator`, `collectStream`)
  - Stream cancellation (individual or all)
- SmartAdapter with all advanced features integrated
- Model router for intelligent provider selection

### Enhanced
- Updated README with advanced features section
- Expanded examples directory with production patterns
- Improved TypeScript type exports
- Enhanced error handling patterns
- Better documentation structure

### Infrastructure
- CI/CD pipeline with GitHub Actions
- Test coverage configuration
- Nx workspace configuration
- ESLint configuration

## [1.0.0] - 2026-02-25

### Added
- **Response Caching** (`cache.ts`) - SHA-256 based intelligent caching
  - Multiple cache presets (production, development, testing, disabled)
  - Configurable TTL (time-to-live) and max size
  - LRU (Least Recently Used) eviction policy
  - Cache statistics (hit rate, size, timestamps)
  - Cache warming for common queries
  - Optional system message inclusion in cache keys
- **Rate Limiting** (`rate-limit.ts`) - Per-provider rate management
  - Requests per minute/hour tracking
  - Token-based rate limiting
  - Concurrent request limiting
  - Conservative default limits for all 5 providers
  - Wait for available slots
  - Real-time rate limit status
- **Retry Logic** (`rate-limit.ts`) - Exponential backoff with jitter
  - Configurable max retries (default: 3)
  - Exponential backoff multiplier
  - Smart detection of retryable errors (429, 500, 502, 503, 504)
  - Network error handling (ECONNRESET, ETIMEDOUT, ENOTFOUND)
  - Retry context for logging
- **Circuit Breaker** (`rate-limit.ts`) - Prevent cascading failures
  - Automatic service failure detection (5 failures = open)
  - Auto-recovery after timeout (1 minute)
  - Status monitoring per provider
  - Failure count tracking
- **Streaming Support** (`streaming.ts`) - Stream management utilities
  - `StreamManager` for controlling active streams
  - `StreamAggregator` for collecting chunks into responses
  - `StreamChunk` interface with content and tool calls
  - Helper functions (`createStreamGenerator`, `collectStream`)
  - Stream cancellation (individual or all)
- Advanced features example (`examples/advanced-features.ts`)
- Comprehensive API documentation (`API.md` - 714 lines)

### Enhanced
- Updated README with advanced features section
- Expanded examples directory with production patterns
- Improved TypeScript type exports
- Enhanced error handling patterns
- Better documentation structure

## [1.0.0] - 2026-02-25

### Added
- Initial release of Universal AI Adapter
- Support for 5 AI providers:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude 3.5 Sonnet)
  - Ollama (Local, FREE)
  - Groq (LLaMA 3.1)
  - DeepSeek (DeepSeek Chat)
- Automatic fallback mechanism between providers
- Type-safe TypeScript implementation
- Unified interface for all providers
- Provider health checks
- Configurable fallback order
- Verbose logging mode
- Tool/function calling support (where available)
- Error handling with custom `AIAdapterError` class
- Provider caching for efficiency
- Simple chat helper method
- Environment-based configuration
- Complete documentation (README, HANDOVER, CONTRIBUTING)
- Example files (basic.ts, express-server.ts)
- Test script (test.js)

### Documentation
- Comprehensive README with all features
- HANDOVER.md for project handover
- CONTRIBUTING.md for contributors
- API reference documentation
- Usage examples for all providers
- Deployment guides
- Troubleshooting section

### Infrastructure
- TypeScript build configuration
- ESM module support
- npm package configuration
- Git ignore rules
- npm ignore rules for publishing
- MIT License

## [0.1.0] - 2026-02-24

### Added
- Initial project structure
- Base provider interface
- OpenAI provider implementation
- Anthropic provider implementation
- Ollama provider implementation

---

## Version History Summary

| Version | Date | Changes | Breaking |
|---------|------|---------|----------|
| 1.1.0 | 2026-02-26 | Streaming, Model Router, Integration Tests | No |
| 1.0.0 | 2026-02-25 | Initial release with 5 providers | N/A |
| 0.1.0 | 2026-02-24 | Project started | N/A |

---

## Migration Guides

### Upgrading to 1.1.0

**Breaking Changes:** None ✅

New features are opt-in and don't affect existing code.

New in 1.1.0:
- `adapter.stream()` - Returns async generator for streaming responses
- `adapter.supportsStreaming()` - Check if current provider supports streaming
- SmartAdapter with ModelRouter integration
- New routing strategies: cost, speed, quality, balanced

Example of new streaming feature:
```typescript
const adapter = new UniversalAIAdapter({
  provider: 'openai',
  providers: { openai: { apiKey: 'sk-...' } }
});

// Check streaming support
if (adapter.supportsStreaming()) {
  for await (const chunk of adapter.stream(request)) {
    console.log(chunk.content);
  }
}
```

### Upgrading to 1.0.0
This is the first stable release. No migration needed.

---

## Deprecation Warnings

None yet.

---

## Security Updates

None yet.

---

## Performance Improvements

None yet (baseline).

---

## Bug Fixes

None yet (first release).
