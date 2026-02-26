import { UniversalAIAdapter } from '../src/index.js';
import { Message } from '../src/types.js';

async function main() {
  // Streaming requires a provider that supports it (OpenAI, Groq, DeepSeek)
  console.log('=== Streaming Example ===\n');

  const adapter = new UniversalAIAdapter({
    provider: 'openai',
    verbose: true,
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4-turbo-preview'
      }
    }
  });

  // Check if streaming is supported
  console.log('Supports streaming:', adapter.supportsStreaming());

  if (!adapter.supportsStreaming()) {
    console.log('Current provider does not support streaming.');
    console.log('Try with OpenAI, Groq, or DeepSeek.');
    return;
  }

  // Stream a response
  console.log('\nStreaming response:\n');

  const messages: Message[] = [
    { role: 'user', content: 'Count from 1 to 5, one number per line' }
  ];

  try {
    for await (const chunk of adapter.stream({ messages })) {
      if (chunk.content) {
        process.stdout.write(chunk.content);
      }
    }
    console.log('\n');
  } catch (error: any) {
    console.error('Streaming error:', error.message);
  }

  // Example with callback-based streaming
  console.log('=== Streaming with Callbacks ===\n');

  const messages2: Message[] = [
    { role: 'user', content: 'Write a short poem about code' }
  ];

  try {
    for await (const chunk of adapter.stream({ messages: messages2 })) {
      const marker = chunk.done ? '✓' : '→';
      console.log(`${marker} [${chunk.provider}] ${chunk.content || '(empty)'}`);
    }
  } catch (error: any) {
    console.error('Streaming error:', error.message);
  }
}

main().catch(console.error);
