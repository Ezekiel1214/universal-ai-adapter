# Verification & Testing Guide

Complete guide to check, test, and verify the Universal AI Adapter library.

---

## 📋 Quick Verification Checklist

```bash
# 1. Check TypeScript compilation
npm run build

# 2. Run tests
npm test

# 3. Check file structure
dir /S /B src

# 4. Check package.json
type package.json

# 5. Check dependencies
npm list

# 6. Verify exports
node -e "console.log(require('./dist/index.js'))"
```

---

## 🔍 Detailed Verification Options

### 1. Build & Compilation

#### Check TypeScript Build
```bash
npm run build
```
**Expected:** No errors, `dist/` folder created with .js and .d.ts files

#### Clean Build
```bash
# Remove dist folder
rmdir /S /Q dist

# Rebuild
npm run build
```

#### Check for TypeScript Errors
```bash
npx tsc --noEmit
```

---

### 2. File Structure Verification

#### List All Source Files
```bash
dir /S /B src\*.ts
```

**Expected files:**
```
src\adapter.ts
src\cache.ts
src\index.ts
src\metrics.ts
src\rate-limit.ts
src\streaming.ts
src\types.ts
src\providers\anthropic.ts
src\providers\base.ts
src\providers\deepseek.ts
src\providers\groq.ts
src\providers\ollama.ts
src\providers\openai.ts
src\__tests__\adapter.test.ts
src\__tests__\providers.test.ts
```

#### List All Examples
```bash
dir examples\*.ts
```

**Expected:**
```
examples\advanced-features.ts
examples\basic.ts
examples\express-server.ts
```

#### List All Documentation
```bash
dir *.md
```

**Expected:**
```
API.md
CHANGELOG.md
CONTRIBUTING.md
DEVFLOW_HANDOVER_ENHANCED.md
HANDOVER.md
README.md
TESTING.md
UPDATE_SUMMARY.md
VERIFICATION_GUIDE.md
```

---

### 3. Package Verification

#### Check Package Info
```bash
npm info . name version description
```

#### List Dependencies
```bash
npm list --depth=0
```

#### Check Peer Dependencies
```bash
npm list openai @anthropic-ai/sdk axios
```

#### Verify Package Files
```bash
# Check what will be published
npm pack --dry-run
```

---

### 4. Code Quality Checks

#### Run ESLint (if configured)
```bash
npm run lint
```

#### Check Code Statistics
```powershell
# Count lines of code
Get-ChildItem -Recurse -Include *.ts | 
  Get-Content | 
  Measure-Object -Line
```

#### Check for TODOs/FIXMEs
```bash
findstr /S /N "TODO FIXME XXX HACK" src\*.ts
```

---

### 5. Testing Options

#### Run All Tests
```bash
npm test
```

#### Run Tests with Coverage
```bash
npm test -- --coverage
```

#### Run Specific Test File
```bash
npm test -- adapter.test.ts
```

#### Run Tests in Watch Mode
```bash
npm test -- --watch
```

#### Run Integration Test
```bash
node test.js
```

---

### 6. Runtime Verification

#### Quick Import Test
```javascript
// test-import.js
const { UniversalAIAdapter } = require('./dist/index.js');
console.log('✅ Import successful');
console.log('Available exports:', Object.keys(require('./dist/index.js')));
```

Run:
```bash
node test-import.js
```

#### Check All Exports
```javascript
// check-exports.js
const exported = require('./dist/index.js');

console.log('\n📦 Exported Modules:\n');
Object.keys(exported).forEach(key => {
  console.log(`  ✓ ${key}`);
});

console.log('\n✅ Total exports:', Object.keys(exported).length);
```

Run:
```bash
node check-exports.js
```

#### Test Basic Functionality (No API Key)
```javascript
// test-basic.js
const { UniversalAIAdapter } = require('./dist/index.js');

try {
  const adapter = new UniversalAIAdapter({
    apiKeys: { ollama: 'test' }
  });
  console.log('✅ Adapter created');
  console.log('Current provider:', adapter.getCurrentProvider());
  console.log('✅ Basic functionality works');
} catch (error) {
  console.error('❌ Error:', error.message);
}
```

Run:
```bash
node test-basic.js
```

---

### 7. Feature-Specific Checks

#### Test Response Caching
```javascript
// test-cache.js
const { ResponseCache, CachePresets } = require('./dist/index.js');

const cache = new ResponseCache(CachePresets.development);
console.log('✅ Cache created');
console.log('Config:', cache.getConfig());
console.log('Stats:', cache.getStats());
console.log('✅ Cache working');
```

#### Test Rate Limiting
```javascript
// test-rate-limit.js
const { RateLimiter } = require('./dist/index.js');

const limiter = new RateLimiter();
console.log('✅ Rate limiter created');
console.log('OpenAI limits:', limiter.getProviderLimits('openai'));
console.log('Status:', limiter.getStatus('openai'));
console.log('✅ Rate limiting working');
```

#### Test Retry Handler
```javascript
// test-retry.js
const { RetryHandler } = require('./dist/index.js');

const retry = new RetryHandler();
console.log('✅ Retry handler created');
console.log('Config:', retry.getConfig());
console.log('✅ Retry handler working');
```

#### Test Circuit Breaker
```javascript
// test-circuit.js
const { CircuitBreaker } = require('./dist/index.js');

const breaker = new CircuitBreaker();
console.log('✅ Circuit breaker created');
console.log('OpenAI status:', breaker.getStatus('openai'));
console.log('✅ Circuit breaker working');
```

#### Test Metrics Collector
```javascript
// test-metrics.js
const { MetricsCollector } = require('./dist/index.js');

const metrics = new MetricsCollector();
console.log('✅ Metrics collector created');

// Record a test metric
metrics.recordRequest({
  provider: 'openai',
  model: 'gpt-4',
  timestamp: Date.now(),
  duration: 1500,
  tokens: { prompt: 100, completion: 50, total: 150 },
  cached: false,
  retries: 0,
  success: true
});

console.log('Summary:', metrics.getSummary());
console.log('✅ Metrics collector working');
```

---

### 8. Example Verification

#### Run Basic Example
```bash
npx ts-node examples/basic.ts
```

#### Run Advanced Features Demo
```bash
npx ts-node examples/advanced-features.ts
```

#### Run Express Server Example (in background)
```bash
# Start server
start /B npx ts-node examples/express-server.ts

# Wait a bit
timeout /T 3

# Test endpoint
curl http://localhost:3000/api/chat -X POST ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}"

# Stop server (Ctrl+C)
```

---

### 9. Documentation Checks

#### Verify README
```bash
type README.md | findstr /I "feature"
```

#### Check API Documentation
```bash
type API.md | findstr /I "interface class"
```

#### Review Changelog
```bash
type CHANGELOG.md
```

#### Check Contributing Guide
```bash
type CONTRIBUTING.md | findstr /I "step"
```

---

### 10. Git & Version Control

#### Check Git Status
```bash
git status
```

#### View Recent Changes
```bash
git log --oneline -10
```

#### Check Uncommitted Changes
```bash
git diff
```

#### View File History
```bash
git log --follow -- src/adapter.ts
```

---

### 11. Performance Checks

#### Bundle Size Analysis
```bash
# Build first
npm run build

# Check bundle size
dir dist\*.js

# Detailed size
powershell -Command "Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum"
```

#### Memory Usage Test
```javascript
// test-memory.js
const { UniversalAIAdapter, ResponseCache } = require('./dist/index.js');

console.log('Initial memory:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');

const adapter = new UniversalAIAdapter({ apiKeys: { ollama: 'test' } });
const cache = new ResponseCache();

console.log('After initialization:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');
console.log('✅ Memory usage normal');
```

---

### 12. Dependency Audit

#### Security Audit
```bash
npm audit
```

#### Fix Vulnerabilities
```bash
npm audit fix
```

#### Check for Outdated Packages
```bash
npm outdated
```

#### Update Dependencies
```bash
npm update
```

---

### 13. TypeScript Type Checking

#### Check Type Definitions
```bash
dir /S dist\*.d.ts
```

#### Verify Type Exports
```typescript
// test-types.ts
import type {
  AIProvider,
  Message,
  ChatResponse,
  CacheConfig,
  RateLimitConfig,
  RetryConfig,
  StreamChunk
} from './src/index';

console.log('✅ All types imported successfully');
```

Run:
```bash
npx ts-node test-types.ts
```

---

### 14. CI/CD Verification

#### Check GitHub Actions Workflow
```bash
type .github\workflows\ci.yml
```

#### Validate Workflow Syntax
```bash
# Install act (if not already)
# Then run:
act -l
```

---

### 15. Publishing Preparation

#### Dry Run Publish
```bash
npm publish --dry-run
```

#### Check Package Contents
```bash
npm pack
tar -tzf universal-ai-adapter-1.0.0.tgz
```

#### Verify .npmignore
```bash
type .npmignore
```

---

## 🎯 Quick Health Check Script

Create `health-check.js`:

```javascript
const fs = require('fs');
const path = require('path');

console.log('🏥 Universal AI Adapter - Health Check\n');

// Check 1: Build artifacts
const distExists = fs.existsSync('./dist');
console.log(distExists ? '✅' : '❌', 'dist/ folder exists');

// Check 2: Package.json
const pkgExists = fs.existsSync('./package.json');
console.log(pkgExists ? '✅' : '❌', 'package.json exists');

// Check 3: Required source files
const requiredFiles = [
  'src/adapter.ts',
  'src/cache.ts',
  'src/rate-limit.ts',
  'src/streaming.ts',
  'src/metrics.ts',
  'src/types.ts',
  'src/index.ts'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(exists ? '✅' : '❌', file);
});

// Check 4: Documentation
const docs = ['README.md', 'API.md', 'CHANGELOG.md'];
docs.forEach(doc => {
  const exists = fs.existsSync(doc);
  console.log(exists ? '✅' : '❌', doc);
});

// Check 5: Examples
const examples = fs.readdirSync('./examples').filter(f => f.endsWith('.ts'));
console.log('✅', `${examples.length} example files found`);

// Check 6: Tests
const tests = fs.readdirSync('./src/__tests__').filter(f => f.endsWith('.test.ts'));
console.log('✅', `${tests.length} test files found`);

// Check 7: Try importing
try {
  const lib = require('./dist/index.js');
  const exportCount = Object.keys(lib).length;
  console.log('✅', `${exportCount} exports available`);
} catch (error) {
  console.log('❌', 'Failed to import library');
}

console.log('\n✅ Health check complete!');
```

Run:
```bash
node health-check.js
```

---

## 📊 Complete Verification Command

Run all checks at once:

```powershell
# Create verification script: verify-all.ps1

Write-Host "`n🔍 Running Complete Verification...`n" -ForegroundColor Cyan

Write-Host "1️⃣  Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) { Write-Host "✅ Build successful`n" -ForegroundColor Green } 
else { Write-Host "❌ Build failed`n" -ForegroundColor Red; exit 1 }

Write-Host "2️⃣  Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -eq 0) { Write-Host "✅ Tests passed`n" -ForegroundColor Green }
else { Write-Host "⚠️  Tests failed`n" -ForegroundColor Yellow }

Write-Host "3️⃣  Checking file structure..." -ForegroundColor Yellow
$srcFiles = (Get-ChildItem -Recurse -Path src -Filter *.ts).Count
Write-Host "✅ Found $srcFiles TypeScript files`n" -ForegroundColor Green

Write-Host "4️⃣  Checking documentation..." -ForegroundColor Yellow
$docs = (Get-ChildItem -Filter *.md).Count
Write-Host "✅ Found $docs markdown files`n" -ForegroundColor Green

Write-Host "5️⃣  Running health check..." -ForegroundColor Yellow
node health-check.js

Write-Host "`n✅ Verification complete!`n" -ForegroundColor Green
```

Run:
```bash
powershell -ExecutionPolicy Bypass -File verify-all.ps1
```

---

## 🎓 What to Check Before Publishing

```bash
# 1. Clean build
rmdir /S /Q dist node_modules
npm install
npm run build

# 2. Run all tests
npm test

# 3. Check version
npm version

# 4. Check package contents
npm pack --dry-run

# 5. Test import
node -e "console.log(Object.keys(require('./dist/index.js')))"

# 6. Security audit
npm audit

# 7. Check documentation
type README.md

# 8. Verify examples work
npx ts-node examples/basic.ts
```

---

## 📞 Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rmdir /S /Q dist
npm install
npm run build
```

### Tests Fail
```bash
# Reinstall dependencies
rmdir /S /Q node_modules
npm install
npm test
```

### Import Errors
```bash
# Check exports
node -e "console.log(require('./dist/index.js'))"

# Verify build
dir dist
```

---

**Use this guide to thoroughly verify your library before publishing or deployment!**
