# Contributing to Universal AI Adapter

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/yourusername/universal-ai-adapter
cd universal-ai-adapter

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Run tests
npm test

# 5. Make changes in src/

# 6. Test your changes
npm run build && node test.js
```

---

## 📋 How to Contribute

### Reporting Bugs

**Before submitting:**
- Check existing issues
- Use the latest version
- Include reproduction steps

**Bug report template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Initialize adapter with...
2. Call method...
3. See error

**Expected behavior**
What you expected to happen.

**Environment:**
- OS: [e.g., Windows 11]
- Node version: [e.g., 18.0.0]
- universal-ai-adapter version: [e.g., 1.0.0]

**Additional context**
Any other relevant information.
```

---

### Suggesting Features

**Feature request template:**
```markdown
**Feature description**
Clear description of the feature.

**Problem it solves**
What problem does this feature solve?

**Proposed solution**
How would you implement it?

**Alternatives considered**
What other approaches did you consider?

**Use case**
Real-world example of how you'd use this.
```

---

### Pull Requests

**PR Checklist:**
- [ ] Code follows TypeScript best practices
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] Documentation updated (README, JSDoc comments)
- [ ] CHANGELOG.md updated
- [ ] Commit messages are clear

**PR template:**
```markdown
## Description
Brief description of changes.

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this?

## Related issues
Fixes #123
```

---

## 🏗️ Development Setup

### Prerequisites
- Node.js 18+
- npm 8+
- Git
- TypeScript knowledge

### Project Structure
```
src/
├── types.ts           # Type definitions
├── adapter.ts         # Main adapter class
├── providers/         # Provider implementations
│   ├── base.ts       # Base interface
│   ├── openai.ts     # OpenAI provider
│   ├── anthropic.ts  # Anthropic provider
│   ├── ollama.ts     # Ollama provider
│   ├── groq.ts       # Groq provider
│   └── deepseek.ts   # DeepSeek provider
└── index.ts          # Public exports
```

### Building
```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Single build
npm run build

# Clean build
rm -rf dist && npm run build
```

---

## 🧪 Testing

### Manual Testing
```bash
# Test with compiled code
node test.js

# Test with TypeScript
npx tsx examples/basic.ts
```

### Unit Tests (Coming Soon)
```bash
npm test
```

### Integration Tests
```bash
# Test with real API keys
AI_PROVIDER=openai OPENAI_API_KEY=sk-... node test.js
```

---

## 📝 Code Style

### TypeScript Guidelines

**Use explicit types:**
```typescript
// Good
function chat(request: ChatRequest): Promise<ChatResponse> {
  // ...
}

// Bad
function chat(request: any): any {
  // ...
}
```

**Use interfaces for objects:**
```typescript
// Good
interface Config {
  provider: AIProvider;
  apiKey: string;
}

// Bad
type Config = {
  provider: string;
  apiKey: string;
}
```

**Handle errors properly:**
```typescript
// Good
try {
  const result = await provider.chat(request);
  return result;
} catch (error: any) {
  throw new AIAdapterError(
    `Provider failed: ${error.message}`,
    'provider-name',
    error
  );
}

// Bad
try {
  return await provider.chat(request);
} catch (e) {
  throw e;
}
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Classes | PascalCase | `UniversalAIAdapter` |
| Interfaces | PascalCase | `ChatRequest` |
| Types | PascalCase | `AIProvider` |
| Functions | camelCase | `initializeProvider()` |
| Variables | camelCase | `currentProvider` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| Private members | camelCase with _ | `_providerCache` |

---

## 🔧 Adding a New Provider

### Step 1: Create Provider File

Create `src/providers/newprovider.ts`:

```typescript
import { BaseProvider } from './base.js';
import { ChatRequest, ChatResponse, AIAdapterError } from '../types.js';

export class NewProviderProvider implements BaseProvider {
  readonly name = 'newprovider';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new AIAdapterError('API key required', 'newprovider');
    }
    this.apiKey = apiKey;
    this.model = model || 'default-model';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if provider is accessible
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.isAvailable();
  }

  getModel(): string {
    return this.model;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Implement chat logic
      const response = await fetch('https://api.newprovider.com/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7
        })
      });

      const data = await response.json();

      return {
        content: data.choices[0].message.content,
        toolCalls: [], // Parse tool calls if supported
        provider: 'newprovider',
        model: this.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        }
      };
    } catch (error: any) {
      throw new AIAdapterError(
        `NewProvider chat failed: ${error.message}`,
        'newprovider',
        error
      );
    }
  }
}
```

### Step 2: Add to Types

Update `src/types.ts`:

```typescript
export type AIProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'groq' 
  | 'deepseek' 
  | 'ollama'
  | 'newprovider'  // Add this
  | 'none';

export interface ProviderConfig {
  // ... existing providers
  newprovider?: {
    apiKey: string;
    model?: string;
  };
}
```

### Step 3: Add to Adapter

Update `src/adapter.ts`:

```typescript
import { NewProviderProvider } from './providers/newprovider.js';

// In initializeProvider() switch statement:
case 'newprovider':
  if (!providers.newprovider?.apiKey) {
    throw new Error('NewProvider API key not provided');
  }
  instance = new NewProviderProvider(
    providers.newprovider.apiKey,
    providers.newprovider.model
  );
  break;
```

### Step 4: Update Documentation

Update `README.md`:
- Add to provider list
- Add configuration example
- Update comparison table

### Step 5: Test

```bash
npm run build
node -e "
const { UniversalAIAdapter } = require('./dist/index.js');
const adapter = new UniversalAIAdapter({
  provider: 'newprovider',
  providers: {
    newprovider: {
      apiKey: 'test-key',
      model: 'test-model'
    }
  }
});
console.log(adapter.getCurrentProvider());
"
```

---

## 📚 Documentation

### JSDoc Comments

All public methods must have JSDoc:

```typescript
/**
 * Send a chat request with automatic fallback
 * 
 * @param request - The chat request containing messages and options
 * @returns Promise resolving to chat response with content and metadata
 * @throws {AIAdapterError} When all providers fail
 * 
 * @example
 * ```typescript
 * const response = await adapter.chat({
 *   messages: [
 *     { role: 'user', content: 'Hello!' }
 *   ],
 *   temperature: 0.7
 * });
 * console.log(response.content);
 * ```
 */
async chat(request: ChatRequest): Promise<ChatResponse> {
  // ...
}
```

### README Updates

When adding features, update:
- Feature list
- API reference
- Examples
- Comparison tables

---

## 🔄 Release Process

### Version Bumping

```bash
# Patch (1.0.0 → 1.0.1) - Bug fixes
npm version patch

# Minor (1.0.0 → 1.1.0) - New features
npm version minor

# Major (1.0.0 → 2.0.0) - Breaking changes
npm version major
```

### Changelog

Update `CHANGELOG.md`:

```markdown
## [1.1.0] - 2026-03-01

### Added
- New provider: NewProvider
- Streaming support for OpenAI

### Changed
- Improved error messages
- Updated dependencies

### Fixed
- Bug with fallback order
- Type definition exports

### Breaking Changes
- None
```

### Publishing

```bash
# 1. Ensure tests pass
npm test

# 2. Build
npm run build

# 3. Update version
npm version minor

# 4. Publish to npm
npm publish

# 5. Create GitHub release
git tag v1.1.0
git push origin v1.1.0
```

---

## 🐛 Debugging Tips

### Enable Verbose Logging

```typescript
const adapter = new UniversalAIAdapter({
  provider: 'openai',
  verbose: true,  // Enable logging
  providers: { /* ... */ }
});
```

### Check Provider Status

```typescript
const statuses = await adapter.getProviderStatuses();
console.log(JSON.stringify(statuses, null, 2));
```

### Test Individual Providers

```typescript
import { OpenAIProvider } from './dist/providers/openai.js';

const provider = new OpenAIProvider('sk-...', 'gpt-4');
const isAvailable = await provider.isAvailable();
console.log('Available:', isAvailable);
```

---

## ❓ FAQ

### How do I test without API keys?

Use Ollama (free, local):
```bash
ollama serve
ollama pull llama3.2
```

### How do I add custom headers?

Modify the provider class to accept additional config:
```typescript
constructor(apiKey: string, model?: string, headers?: Record<string, string>)
```

### How do I add retry logic?

Wrap provider calls in retry logic:
```typescript
async chat(request: ChatRequest): Promise<ChatResponse> {
  let attempts = 0;
  while (attempts < 3) {
    try {
      return await this.provider.chat(request);
    } catch (error) {
      attempts++;
      if (attempts >= 3) throw error;
      await new Promise(r => setTimeout(r, 1000 * attempts));
    }
  }
}
```

---

## 📞 Getting Help

- **Documentation:** Check [README.md](README.md)
- **Issues:** Search existing [GitHub issues](https://github.com/yourusername/universal-ai-adapter/issues)
- **Discussions:** Join [GitHub Discussions](https://github.com/yourusername/universal-ai-adapter/discussions)
- **Discord:** [Join our community](https://discord.gg/...)

---

## 🎯 Good First Issues

Looking for easy tasks to start with?

- [ ] Add provider: Google Gemini
- [ ] Add provider: Azure OpenAI
- [ ] Improve error messages
- [ ] Add more examples
- [ ] Improve documentation
- [ ] Add unit tests
- [ ] Fix TypeScript strict mode warnings

Check issues labeled `good-first-issue` on GitHub!

---

## 🏆 Contributors

Thank you to all contributors! 🎉

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## 📜 Code of Conduct

Be respectful, inclusive, and professional. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

---

**Questions?** Open an issue or start a discussion! We're here to help. 💪
