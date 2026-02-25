const fs = require('fs');
const path = require('path');

console.log('🏥 Universal AI Adapter - Health Check\n');
console.log('='.repeat(50) + '\n');

let passCount = 0;
let failCount = 0;

function check(condition, message) {
  if (condition) {
    console.log('✅', message);
    passCount++;
  } else {
    console.log('❌', message);
    failCount++;
  }
}

// Check 1: Build artifacts
check(fs.existsSync('./dist'), 'dist/ folder exists');
check(fs.existsSync('./dist/index.js'), 'dist/index.js exists');
check(fs.existsSync('./dist/index.d.ts'), 'dist/index.d.ts exists');

// Check 2: Package files
check(fs.existsSync('./package.json'), 'package.json exists');
check(fs.existsSync('./tsconfig.json'), 'tsconfig.json exists');
check(fs.existsSync('./LICENSE'), 'LICENSE exists');

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

console.log('\n📂 Source Files:');
requiredFiles.forEach(file => {
  check(fs.existsSync(file), file);
});

// Check 4: Provider implementations
const providers = [
  'src/providers/base.ts',
  'src/providers/openai.ts',
  'src/providers/anthropic.ts',
  'src/providers/groq.ts',
  'src/providers/deepseek.ts',
  'src/providers/ollama.ts'
];

console.log('\n🔌 Providers:');
providers.forEach(file => {
  check(fs.existsSync(file), file);
});

// Check 5: Documentation
const docs = [
  'README.md',
  'API.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'TESTING.md'
];

console.log('\n📚 Documentation:');
docs.forEach(doc => {
  check(fs.existsSync(doc), doc);
});

// Check 6: Examples
console.log('\n📝 Examples:');
try {
  const examples = fs.readdirSync('./examples').filter(f => f.endsWith('.ts'));
  check(examples.length >= 3, `${examples.length} example files found`);
  examples.forEach(ex => {
    console.log('  ✓', ex);
  });
} catch (error) {
  check(false, 'examples/ folder exists');
}

// Check 7: Tests
console.log('\n🧪 Tests:');
try {
  const tests = fs.readdirSync('./src/__tests__').filter(f => f.endsWith('.test.ts'));
  check(tests.length >= 2, `${tests.length} test files found`);
  tests.forEach(test => {
    console.log('  ✓', test);
  });
} catch (error) {
  check(false, '__tests__/ folder exists');
}

// Check 8: Configuration files
console.log('\n⚙️  Configuration:');
check(fs.existsSync('./.gitignore'), '.gitignore exists');
check(fs.existsSync('./.npmignore'), '.npmignore exists');
check(fs.existsSync('./jest.config.js'), 'jest.config.js exists');
check(fs.existsSync('./.env.example'), '.env.example exists');

// Check 9: CI/CD
console.log('\n🚀 CI/CD:');
check(fs.existsSync('./.github/workflows/ci.yml'), 'GitHub Actions CI workflow');
check(fs.existsSync('./.github/workflows/release.yml'), 'GitHub Actions release workflow');

// Check 10: Try importing library
console.log('\n📦 Library Import:');
try {
  const lib = require('./dist/index.js');
  const exportCount = Object.keys(lib).length;
  check(exportCount > 0, `${exportCount} exports available`);
  
  // Check specific exports
  const expectedExports = [
    'UniversalAIAdapter',
    'ResponseCache',
    'RateLimiter',
    'RetryHandler',
    'CircuitBreaker',
    'StreamManager',
    'MetricsCollector'
  ];
  
  expectedExports.forEach(exp => {
    check(lib[exp] !== undefined, `  ${exp} exported`);
  });
} catch (error) {
  check(false, 'Failed to import library: ' + error.message);
}

// Check 11: Package.json contents
console.log('\n📋 Package.json:');
try {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  check(pkg.name === 'universal-ai-adapter', 'Package name correct');
  check(pkg.version !== undefined, `Version: ${pkg.version}`);
  check(pkg.main !== undefined, 'Entry point defined');
  check(pkg.types !== undefined, 'Type definitions defined');
  check(pkg.scripts && pkg.scripts.build, 'Build script defined');
  check(pkg.scripts && pkg.scripts.test, 'Test script defined');
} catch (error) {
  check(false, 'Failed to read package.json');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:');
console.log(`  ✅ Passed: ${passCount}`);
console.log(`  ❌ Failed: ${failCount}`);
console.log(`  📈 Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);

if (failCount === 0) {
  console.log('\n🎉 All checks passed! Library is healthy!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Review the issues above.\n');
  process.exit(1);
}
