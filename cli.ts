#!/usr/bin/env node

import { UniversalAIAdapter } from './src/index.js';

const args = process.argv.slice(2);

async function main() {
  if (args.length === 0) {
    console.log('\n🤖 Universal AI Adapter CLI\n');
    console.log('Usage:');
    console.log('  ai-adapter chat <provider> <apiKey> <message> [model]');
    console.log('  ai-adapter status <provider> <apiKey>');
    console.log('\nExamples:');
    console.log('  ai-adapter chat ollama "" "Hello" llama3.2');
    console.log('  ai-adapter chat openai sk-xxx "Hello world" gpt-4');
    console.log('\nProviders: openai, anthropic, groq, deepseek, ollama');
    process.exit(0);
  }

  const command = args[0];

  if (command === 'chat') {
    const provider = args[1] || 'ollama';
    const apiKey = args[2] || '';
    const message = args[3] || 'Hello!';
    const model = args[4] || '';

    console.log(`\n🤖 Chatting with ${provider}...\n`);

    const config: any = {
      provider,
      providers: {},
      verbose: true
    };

    if (provider === 'ollama') {
      config.providers.ollama = {
        baseURL: apiKey || 'http://localhost:11434',
        model: model || 'llama3.2'
      };
    } else {
      config.providers[provider] = { apiKey };
      if (model) config.providers[provider].model = model;
    }

    try {
      const adapter = new UniversalAIAdapter(config);
      const response = await adapter.simpleChat(message);
      console.log('📥 Response:');
      console.log('-'.repeat(40));
      console.log(response);
      console.log('-'.repeat(40));
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } 
  else if (command === 'status') {
    const provider = args[1] || 'ollama';
    const apiKey = args[2] || '';

    console.log(`\n📊 Checking ${provider} status...\n`);

    const config: any = {
      provider,
      providers: {}
    };

    if (provider === 'ollama') {
      config.providers.ollama = { baseURL: 'http://localhost:11434' };
    } else {
      config.providers[provider] = { apiKey };
    }

    try {
      const adapter = new UniversalAIAdapter(config);
      const statuses = await adapter.getProviderStatuses();
      statuses.forEach((s: any) => {
        console.log(`  ${s.provider}: ${s.available ? '✅ Available' : '❌ Unavailable'}`);
        if (s.model) console.log(`    Model: ${s.model}`);
      });
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
  else {
    console.log('Unknown command:', command);
    console.log('Use: chat, status');
  }
}

main();
