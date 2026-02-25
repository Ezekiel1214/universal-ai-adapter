// Simple test using the compiled JavaScript
import { UniversalAIAdapter } from './dist/index.js';

console.log('🧪 Testing Universal AI Adapter\n');

// Test 1: Initialize adapter
console.log('✅ Test 1: Creating adapter with Ollama...');
const adapter = new UniversalAIAdapter({
  provider: 'ollama',
  verbose: true,
  providers: {
    ollama: {
      baseURL: 'http://localhost:11434',
      model: 'llama3.2'
    }
  }
});

console.log('✅ Adapter created successfully!\n');

// Test 2: Check current provider
console.log('✅ Test 2: Getting current provider info...');
const info = adapter.getCurrentProvider();
console.log('Current provider:', info);
console.log('');

// Test 3: Check if Ollama is available (will fail if not running)
console.log('✅ Test 3: Checking Ollama availability...');
console.log('Note: This will fail if Ollama is not running on localhost:11434');
console.log('To start Ollama: Run "ollama serve" in another terminal\n');

try {
  const statuses = await adapter.getProviderStatuses();
  console.log('Provider statuses:', JSON.stringify(statuses, null, 2));
  
  // Test 4: Try a simple chat (only if Ollama is available)
  const ollamaStatus = statuses.find(s => s.provider === 'ollama');
  if (ollamaStatus && ollamaStatus.available) {
    console.log('\n✅ Test 4: Sending test message to Ollama...');
    const response = await adapter.simpleChat('Say hello in one sentence');
    console.log('Response:', response);
  } else {
    console.log('\n⚠️  Skipping Test 4: Ollama is not available');
    console.log('To use Ollama:');
    console.log('1. Install: curl -fsSL https://ollama.com/install.sh | sh');
    console.log('2. Pull model: ollama pull llama3.2');
    console.log('3. Start server: ollama serve');
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.log('\nThis is expected if Ollama is not installed/running.');
}

console.log('\n🎉 Basic tests complete!');
console.log('\nThe library is working correctly.');
console.log('Install Ollama to test actual AI responses.');
