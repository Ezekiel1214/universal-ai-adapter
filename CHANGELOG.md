# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.5] - 2026-03-14

## What's Changed

- chore(repo): ignore generated release notes (253b853)

**Full Changelog**: https://github.com/Ezekiel1214/universal-ai-adapter/compare/v1.7.4...v1.7.5

## [1.7.4] - 2026-03-14

## What's Changed

- refactor(ci): move release logic into scripts (167e8b8)
- feat(ci): add repository dispatch release triggers (6a1ee75)
- fix(ci): harden release notes generation (c9c9e9f)
- feat(ci): improve release notes fallback (d108783)
- feat(ci): add dry-run release workflow (374d7d0)
- chore(ci): validate release prerequisites (b44aeb7)
- feat(ci): generate changelog in release workflow (6226371)
- chore(ci): harden release and clean build workflow (38eefc2)

**Full Changelog**: https://github.com/Ezekiel1214/universal-ai-adapter/compare/081719227f864cf29ae9e57297c9e075772ff824...v1.7.4

## [1.7.3] - 2026-03-13

### Fixed
- Trimmed the npm package contents to the runtime entrypoints and compiled SDK files actually used at install time
- Switched the repository metadata to the canonical git URL used by npm

## [1.7.2] - 2026-03-13

### Fixed
- Rebuilt the Windows launcher executable so the download binary starts the web app instead of the legacy Ollama-only CLI
- Aligned the Windows start scripts with the current `http://localhost:3000` app flow
- Kept the published package metadata in sync with the latest patch release

## [1.7.0] - 2026-03-10

### Changed
- Migrated the codebase into an Nx workspace with `apps/` and `libs/`
- Modernized and simplified the primary web workspace UI
- Updated repository metadata and docs to the Ezekiel1214 GitHub repo

### Added
- Unified API metadata test coverage
- Refresh of installer, download, and container collateral

## [1.6.0] - 2026-03-01

### Added
- **14 AI Providers** - Added 2 new free providers:
  - **Cerebras** - Free API with llama-3.3-70b, llama-3.1-70b
  - **OpenRouter** - Free API with meta-llama, deepseek-r1, mistral-large
- **Streaming for ALL Providers** - All 14 providers now support streaming
- **New Tools** - Added 5 more tools (was 5, now 10):
  - Code Runner, Image Gen, DateTime, URL Fetch, JSON Parse
- **Enhanced Web UI** - Modern dark theme with animations
- **Free Provider Badges** - Visual indicators for free providers
- **CLI Enhanced** - stream, status, models, compare commands

### Updated
- All documentation (README, download page, API docs)
- Package version to 1.6.0
- Fallback order with new providers

## [1.5.0] - 2026-02-28

### Added
- **12 AI Providers** - Added Z AI (GLM-5)
  - Z AI (zhipu) with glm-5 model
  - Latest GLM models: glm-5, glm-4-flash, glm-4-plus
- Updated all documentation

## [1.3.1] - 2026-02-28

### Fixed
- Ollama model name (llama3.2:latest)
- Duplicate JavaScript declarations in web UI
- API endpoint auto-detection
- Compare All endpoint for new providers

### Added
- **11 AI Providers** - Added 3 new providers:
  - Mistral (mistral-large-latest)
  - Perplexity (llama-3.1-sonar-small-128k-online)
  - Minimax (MiniMax-Text-01)
- Qwen provider to sidebar list
- Upload button for knowledge base files
- All 11 providers in UI
- Download page updates with alternative AI tools

## [1.3.0] - 2026-02-27

### Added
- **8 AI Providers** - Added Qwen as the 8th provider
  - Ollama, LocalAI, Qwen, Gemini, OpenAI, Anthropic, Groq, DeepSeek
  - Updated model lists with latest versions (GPT-5.2, Claude 4.6, Qwen3, Gemini 3, etc.)
- **One API for All Providers** - Unified `/api/chat` endpoint
  - Same interface works with all 8 providers
  - Provider switching without code changes
- **Compare All API** - `/api/compare` endpoint
  - Compare responses from multiple providers simultaneously
  - Returns duration, tokens, success/failure per provider
- **Dashboard API** - `/api/dashboard` and `/api/dashboard/track`
  - Analytics and usage metrics
  - Per-provider statistics
  - Token tracking and cost estimation
- **Compare All Feature** - Side-by-side multi-provider comparison
  - Checkbox selection for each provider
  - Real-time status tracking per provider
  - Scrollable response cards
- **Custom Agents** - Define purpose, instructions, tone, guardrails
- **VPN/Proxy Support** - Toggle in sidebar
- **Voice Input/Output** - F1/F2 keyboard shortcuts
- **Tools/Skills/MCPs** - Select tools for AI agents
- **Web UI Enhancements**
  - Modern dark theme
  - Provider status indicators
  - Markdown rendering

### Infrastructure
- Express server with REST API (9 endpoints)
- Updated `/api/models` with all 8 providers
- Knowledge base endpoints (upload, query, list)

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






