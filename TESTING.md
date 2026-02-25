# Testing Guide

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### Specific Test File
```bash
npm test -- adapter.test.ts
```

---

## Test Structure

```
src/__tests__/
├── adapter.test.ts      # Core adapter tests
└── providers.test.ts    # Provider implementation tests
```

---

## Writing Tests

### Test Template

```typescript
import { UniversalAIAdapter } from '../adapter';

describe('Feature Name', () => {
  describe('Method Name', () => {
    it('should do something specific', () => {
      // Arrange
      const adapter = new UniversalAIAdapter({
        provider: 'ollama',
        providers: {
          ollama: { baseURL: 'http://localhost:11434' }
        }
      });

      // Act
      const result = adapter.getCurrentProvider();

      // Assert
      expect(result.provider).toBe('ollama');
    });
  });
});
```

---

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Statements | 80%+ | - |
| Branches | 75%+ | - |
| Functions | 80%+ | - |
| Lines | 80%+ | - |

---

## Integration Testing

### With Real Providers

```bash
# Test with Ollama (local)
ollama serve
npm test

# Test with OpenAI
export OPENAI_API_KEY=sk-...
npm test -- --testPathPattern=openai
```

---

## CI/CD

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests
- Releases

### Workflow Matrix

Tests run on:
- **OS:** Ubuntu, Windows, macOS
- **Node:** 18.x, 20.x, 21.x

Total: 9 test combinations per push

---

## Debugging Tests

### Enable Verbose Output
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- --testNamePattern="should create adapter"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## Test Best Practices

### ✅ DO
- Test public APIs, not internals
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Mock external dependencies
- Test error cases

### ❌ DON'T
- Test implementation details
- Rely on test execution order
- Share state between tests
- Test multiple things in one test
- Skip error handling tests

---

## Performance Testing

### Benchmark Template

```typescript
import { performance } from 'perf_hooks';

it('should complete within 100ms', async () => {
  const start = performance.now();
  
  await adapter.chat({
    messages: [{ role: 'user', content: 'Hello' }]
  });
  
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(100);
});
```

---

## Continuous Integration

### Status Badges

Add to README.md:

```markdown
![CI](https://github.com/yourusername/universal-ai-adapter/workflows/CI/badge.svg)
![Coverage](https://codecov.io/gh/yourusername/universal-ai-adapter/branch/main/graph/badge.svg)
```

### Required Checks

Before merge:
- ✅ All tests pass
- ✅ Coverage > 80%
- ✅ ESLint passes
- ✅ TypeScript compiles
- ✅ Build succeeds

---

## Troubleshooting

### Tests Timing Out

Increase timeout:
```typescript
jest.setTimeout(10000); // 10 seconds
```

### Module Resolution Issues

Check:
- `tsconfig.json` paths
- `jest.config.js` moduleNameMapper
- ESM vs CommonJS

### Mock Not Working

Ensure mock is defined before import:
```typescript
jest.mock('../providers/ollama');
import { OllamaProvider } from '../providers/ollama';
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Guide](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
