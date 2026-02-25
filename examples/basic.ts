import { UniversalAIAdapter } from '../src/index.js';

async function main() {
  // Example 1: Free with Ollama
  console.log('=== Example 1: Free with Ollama ===');
  const ollamaAdapter = new UniversalAIAdapter({
    provider: 'ollama',
    verbose: true,
    providers: {
      ollama: {
        baseURL: 'http://localhost:11434',
        model: 'llama3.2'
      }
    }
  });

  const response1 = await ollamaAdapter.simpleChat(
    'Explain what TypeScript is in one sentence',
    'You are a helpful programming tutor'
  );
  console.log('Response:', response1);

  // Example 2: With Fallback
  console.log('\n=== Example 2: With Automatic Fallback ===');
  const fallbackAdapter = new UniversalAIAdapter({
    provider: 'openai', // Primary (will fail if no key)
    enableFallback: true,
    fallbackOrder: ['ollama'], // Fallback to Ollama
    verbose: true,
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || 'invalid-key', // Will fail
        model: 'gpt-4-turbo-preview'
      },
      ollama: {
        baseURL: 'http://localhost:11434',
        model: 'llama3.2'
      }
    }
  });

  const response2 = await fallbackAdapter.chat({
    messages: [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'What is 2+2?' }
    ],
    temperature: 0.5
  });
  console.log('Content:', response2.content);
  console.log('Provider used:', response2.provider);
  console.log('Was fallback?', response2.isFallback);

  // Example 3: Check Provider Health
  console.log('\n=== Example 3: Provider Health Check ===');
  const statuses = await fallbackAdapter.getProviderStatuses();
  console.log('Provider statuses:', JSON.stringify(statuses, null, 2));

  // Example 4: Switch Provider Manually
  console.log('\n=== Example 4: Manual Provider Switch ===');
  const multiAdapter = new UniversalAIAdapter({
    provider: 'ollama',
    verbose: true,
    providers: {
      ollama: {
        baseURL: 'http://localhost:11434',
        model: 'llama3.2'
      }
    }
  });

  console.log('Current provider:', multiAdapter.getCurrentProvider());
  
  const response3 = await multiAdapter.simpleChat('Say hello!');
  console.log('Response from Ollama:', response3);
}

main().catch(console.error);
