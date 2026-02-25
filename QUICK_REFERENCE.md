# Quick Reference Guide

All commands and options for Universal AI Adapter in one place.

---

## 🚀 Quick Start Commands

```bash
# Build the library
npm run build

# Run health check
node health-check.cjs

# Run tests
npm test

# Check file structure
dir /S /B src\*.ts

# View all exports
node -e "const lib = require('./dist/index.js'); console.log(Object.keys(lib))"
```

---

## 📦 All Available Exports

The library exports the following modules:

### Core
- `UniversalAIAdapter` - Main adapter class
- `BaseProvider` - Base provider interface

### Types & Interfaces
- `AIProvider` - Type for provider names
- `Message` - Message interface
- `ChatResponse` - Response interface  
- `ChatRequest` - Request interface
- `AITool` - Tool/function definition
- `ToolCall` - Tool call from AI
- `AIAdapterError` - Custom error class

### Caching
- `ResponseCache` - Cache manager
- `CachePresets` - Pre-configured cache settings
- `CacheConfig` - Cache configuration interface
- `CacheEntry` - Cache entry interface
- `CacheStats` - Cache statistics interface

### Rate Limiting & Resilience
- `RateLimiter` - Rate limit manager
- `RetryHandler` - Retry with exponential backoff
- `CircuitBreaker` - Circuit breaker pattern
- `RateLimitConfig` - Rate limit configuration
- `RetryConfig` - Retry configuration

### Streaming
- `StreamManager` - Stream control
- `StreamAggregator` - Collect stream chunks
- `StreamChunk` - Stream chunk interface
- `StreamOptions` - Streaming options
- `createStreamGenerator` - Helper function
- `collectStream` - Helper function

### Metrics
- `MetricsCollector` - Metrics collection and analysis
- `RequestMetrics` - Individual request metrics
- `ProviderMetrics` - Provider-level metrics
- `DashboardData` - Dashboard data interface
- `generateDashboard` - Generate dashboard data

---

## 🔍 Verification Commands

### Build & Compilation
```bash
# Standard build
npm run build

# Clean build
rmdir /S /Q dist
npm run build

# TypeScript type check only
npx tsc --noEmit
```

### File Structure
```bash
# List all TypeScript files
dir /S /B src\*.ts

# List examples
dir examples\*.ts

# List documentation
dir *.md

# Count lines of code
powershell -Command "Get-ChildItem -Recurse -Include *.ts | Get-Content | Measure-Object -Line"
```

### Testing
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- adapter.test.ts

# Run in watch mode
npm test -- --watch

# Run integration test
node test.cjs
```

### Health & Status
```bash
# Full health check
node health-check.cjs

# Check exports
node -e "console.log(Object.keys(require('./dist/index.js')))"

# Check package info
npm info . name version description

# List dependencies
npm list --depth=0

# Security audit
npm audit
```

---

## 📝 Usage Examples

### Basic Usage
```typescript
import { UniversalAIAdapter } from 'universal-ai-adapter';

const adapter = new UniversalAIAdapter({
  apiKeys: {
    openai: process.env.OPENAI_API_KEY
  }
});

const response = await adapter.chat({
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### With Caching
```typescript
import { UniversalAIAdapter, ResponseCache, CachePresets } from 'universal-ai-adapter';

const adapter = new UniversalAIAdapter({ /* ... */ });
const cache = new ResponseCache(CachePresets.production);

// Check cache first
let response = cache.get(messages);
if (!response) {
  response = await adapter.chat({ messages });
  cache.set(messages, response, 'openai', 'gpt-4');
}
```

### With Rate Limiting
```typescript
import { UniversalAIAdapter, RateLimiter } from 'universal-ai-adapter';

const adapter = new UniversalAIAdapter({ /* ... */ });
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

### With Retry Logic
```typescript
import { UniversalAIAdapter, RetryHandler } from 'universal-ai-adapter';

const adapter = new UniversalAIAdapter({ /* ... */ });
const retry = new RetryHandler({
  maxRetries: 3,
  initialDelay: 1000
});

const response = await retry.execute(async () => {
  return await adapter.chat({ messages });
});
```

### With Circuit Breaker
```typescript
import { UniversalAIAdapter, CircuitBreaker } from 'universal-ai-adapter';

const adapter = new UniversalAIAdapter({ /* ... */ });
const breaker = new CircuitBreaker();

if (!breaker.isOpen('openai')) {
  try {
    const response = await adapter.chat({ messages });
    breaker.recordSuccess('openai');
  } catch (error) {
    breaker.recordFailure('openai');
  }
}
```

### With Metrics
```typescript
import { UniversalAIAdapter, MetricsCollector } from 'universal-ai-adapter';

const adapter = new UniversalAIAdapter({ /* ... */ });
const metrics = new MetricsCollector();

const startTime = Date.now();
try {
  const response = await adapter.chat({ messages });
  
  metrics.recordRequest({
    provider: 'openai',
    model: 'gpt-4',
    timestamp: startTime,
    duration: Date.now() - startTime,
    tokens: response.usage,
    cached: false,
    retries: 0,
    success: true
  });
} catch (error) {
  metrics.recordRequest({
    provider: 'openai',
    model: 'gpt-4',
    timestamp: startTime,
    duration: Date.now() - startTime,
    cached: false,
    retries: 0,
    success: false,
    error: error.message
  });
}

console.log(metrics.getSummary());
```

### Complete Integration
```typescript
import {
  UniversalAIAdapter,
  ResponseCache,
  RateLimiter,
  RetryHandler,
  CircuitBreaker,
  MetricsCollector,
  CachePresets
} from 'universal-ai-adapter';

// Initialize all components
const adapter = new UniversalAIAdapter({
  apiKeys: { openai: process.env.OPENAI_API_KEY }
});

const cache = new ResponseCache(CachePresets.production);
const limiter = new RateLimiter();
const retry = new RetryHandler();
const breaker = new CircuitBreaker();
const metrics = new MetricsCollector();

// Smart request with all features
async function smartRequest(messages) {
  const provider = adapter.getCurrentProvider();
  const startTime = Date.now();

  // Check circuit breaker
  if (breaker.isOpen(provider)) {
    throw new Error('Service unavailable');
  }

  // Check cache
  let response = cache.get(messages);
  if (response) {
    metrics.recordRequest({
      provider,
      model: response.model,
      timestamp: startTime,
      duration: Date.now() - startTime,
      cached: true,
      retries: 0,
      success: true
    });
    return response;
  }

  // Wait for rate limit
  await limiter.waitForSlot(provider);
  limiter.recordRequest(provider);

  try {
    // Execute with retry
    response = await retry.execute(async () => {
      return await adapter.chat({ messages });
    });

    // Cache and record success
    cache.set(messages, response, provider, response.model);
    breaker.recordSuccess(provider);
    
    metrics.recordRequest({
      provider,
      model: response.model,
      timestamp: startTime,
      duration: Date.now() - startTime,
      tokens: response.usage,
      cached: false,
      retries: 0,
      success: true
    });

    return response;
  } catch (error) {
    breaker.recordFailure(provider);
    
    metrics.recordRequest({
      provider,
      model: 'unknown',
      timestamp: startTime,
      duration: Date.now() - startTime,
      cached: false,
      retries: 0,
      success: false,
      error: error.message
    });
    
    throw error;
  } finally {
    limiter.recordCompletion(provider);
  }
}
```

---

## 📊 Metrics & Monitoring

### Get Summary
```typescript
const summary = metrics.getSummary();
console.log({
  totalRequests: summary.totalRequests,
  successRate: summary.successRate,
  totalCost: summary.totalCost,
  averageDuration: summary.averageDuration,
  cacheHitRate: summary.cacheHitRate
});
```

### Provider Metrics
```typescript
const providerMetrics = metrics.getProviderMetrics('openai');
console.log({
  totalRequests: providerMetrics.totalRequests,
  successRate: providerMetrics.successfulRequests / providerMetrics.totalRequests,
  totalCost: providerMetrics.totalCost,
  uptime: providerMetrics.uptime
});
```

### Cost Breakdown
```typescript
const costBreakdown = metrics.getCostBreakdown();
costBreakdown.forEach(({ provider, cost, percentage }) => {
  console.log(`${provider}: $${cost.toFixed(4)} (${percentage.toFixed(1)}%)`);
});
```

### Error Analysis
```typescript
const errors = metrics.getErrorAnalysis();
errors.forEach(({ error, count, providers }) => {
  console.log(`Error: ${error}`);
  console.log(`Count: ${count}`);
  console.log(`Providers: ${providers.join(', ')}`);
});
```

### Export Metrics
```typescript
const jsonData = metrics.export();
fs.writeFileSync('metrics.json', jsonData);
```

---

## 🎯 Cache Management

### Cache Statistics
```typescript
const stats = cache.getStats();
console.log({
  hits: stats.hits,
  misses: stats.misses,
  hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
  size: stats.size
});
```

### Clear Cache
```typescript
// Clear all entries
cache.clear();

// Clear only expired entries
cache.clearExpired();
```

### Cache Configuration
```typescript
// Get current config
const config = cache.getConfig();

// Update config
cache.updateConfig({
  ttl: 7200000, // 2 hours
  maxSize: 1000
});
```

---

## ⚡ Rate Limit Management

### Check Status
```typescript
const status = limiter.getStatus('openai');
console.log({
  requestsThisMinute: status.requestsThisMinute,
  canProceed: status.canProceed,
  activeRequests: status.activeRequests
});
```

### Custom Limits
```typescript
limiter.setProviderLimits('openai', {
  requestsPerMinute: 100,
  requestsPerHour: 5000,
  tokensPerMinute: 150000,
  concurrent: 20
});
```

### Reset Limits
```typescript
// Reset specific provider
limiter.reset('openai');

// Reset all providers
limiter.reset();
```

---

## 🔄 Circuit Breaker

### Check Status
```typescript
const status = breaker.getStatus('openai');
console.log({
  failures: status.failures,
  isOpen: status.isOpen,
  lastFailure: status.lastFailure
});
```

### Manual Control
```typescript
// Record success
breaker.recordSuccess('openai');

// Record failure
breaker.recordFailure('openai');

// Reset
breaker.reset('openai');
```

---

## 📁 File Structure

```
universal-ai-adapter/
├── src/
│   ├── adapter.ts          (270 lines) - Main adapter
│   ├── cache.ts            (311 lines) - Response caching
│   ├── rate-limit.ts       (397 lines) - Rate limiting & retry
│   ├── streaming.ts        (168 lines) - Stream management
│   ├── metrics.ts          (354 lines) - Metrics collection
│   ├── types.ts            (143 lines) - TypeScript types
│   ├── index.ts            (7 lines)   - Exports
│   ├── providers/
│   │   ├── base.ts         (31 lines)  - Base interface
│   │   ├── openai.ts       (82 lines)
│   │   ├── anthropic.ts    (95 lines)
│   │   ├── groq.ts         (81 lines)
│   │   ├── deepseek.ts     (79 lines)
│   │   └── ollama.ts       (78 lines)
│   └── __tests__/
│       ├── adapter.test.ts (200 lines)
│       └── providers.test.ts (161 lines)
├── examples/
│   ├── basic.ts            (77 lines)
│   ├── express-server.ts   (106 lines)
│   └── advanced-features.ts (310 lines)
├── dist/                   - Compiled output
├── Documentation:
│   ├── README.md           (515 lines)
│   ├── API.md              (714 lines)
│   ├── CHANGELOG.md        (166 lines)
│   ├── CONTRIBUTING.md     (602 lines)
│   ├── TESTING.md          (234 lines)
│   ├── UPDATE_SUMMARY.md   (403 lines)
│   ├── VERIFICATION_GUIDE.md (689 lines)
│   └── QUICK_REFERENCE.md  (this file)
├── Configuration:
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── .eslintrc.json
│   ├── .env.example
│   ├── .gitignore
│   └── .npmignore
├── Scripts:
│   ├── health-check.cjs    - Health verification
│   └── test.cjs            - Integration test
└── CI/CD:
    └── .github/workflows/
        ├── ci.yml          - Automated testing
        └── release.yml     - Release automation
```

---

## 📈 Statistics

- **Total Lines of Code:** ~2,700+
- **Source Files:** 14 TypeScript files
- **Test Files:** 2 test suites
- **Examples:** 3 complete examples
- **Documentation:** 9 markdown files
- **Providers Supported:** 5 (OpenAI, Anthropic, Groq, DeepSeek, Ollama)
- **Exported Modules:** 13+
- **Health Check Status:** ✅ 46/46 checks passed (100%)

---

## 🎓 Learning Resources

1. **Quick Start:** See README.md
2. **Complete API:** See API.md
3. **Examples:** Check examples/ directory
4. **Testing:** See TESTING.md
5. **Contributing:** See CONTRIBUTING.md
6. **Changes:** See CHANGELOG.md

---

## 🚨 Common Issues

### Build Fails
```bash
rmdir /S /Q dist
npm install
npm run build
```

### Import Errors
```bash
# Verify build
dir dist

# Check exports
node -e "console.log(require('./dist/index.js'))"
```

### Tests Fail
```bash
rmdir /S /Q node_modules
npm install
npm test
```

---

## 📞 Quick Help

```bash
# Get help with npm commands
npm run

# View package info
npm info .

# Check for issues
npm audit

# Update dependencies
npm update

# Clean everything
rmdir /S /Q dist node_modules
npm install
npm run build
```

---

**All options and commands in one place! 🚀**
