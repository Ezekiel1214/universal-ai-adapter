#!/usr/bin/env node

import { UniversalAIAdapter } from './dist/index.js';

const args = process.argv.slice(2);

const ERROR_MESSAGES = {
  API_KEY_MISSING: 'API key is required. Please set the environment variable or provide as argument.',
  PROVIDER_UNAVAILABLE: 'The selected AI provider is currently unavailable. Please try another provider.',
  INVALID_REQUEST: 'Invalid request. Please check your input and try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  INVALID_PROVIDER: 'Invalid provider. Use --help to see available providers.'
};

async function main() {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('\n🤖 Universal AI Adapter CLI v1.6.0\n');
    console.log('Usage:');
    console.log('  ai-adapter chat <provider> <message> [model]');
    console.log('  ai-adapter stream <provider> <message> [model]');
    console.log('  ai-adapter status [provider]');
    console.log('  ai-adapter models [provider]');
    console.log('  ai-adapter compare <message>');
    console.log('\nExamples:');
    console.log('  ai-adapter chat ollama "Hello" llama3.2');
    console.log('  ai-adapter chat openai "Hello" gpt-4o');
    console.log('  ai-adapter stream ollama "Tell me a story"');
    console.log('  ai-adapter compare "What is AI?"');
    console.log('\nProviders:');
    console.log('  Free:  ollama, localai, cerebras, openrouter');
    console.log('  API:   qwen, mistral, perplexity, minimax, zhipu, gemini, openai, anthropic, groq, deepseek');
    console.log('\nEnvironment Variables:');
    console.log('  OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, etc.');
    process.exit(0);
  }

  const command = args[0];

  if (command === 'chat') {
    const provider = args[1] || 'ollama';
    const message = args[2] || 'Hello!';
    const model = args[3] || '';

    console.log(`\n🤖 Chatting with ${provider}...\n`);

    const config = {
      provider,
      providers: {},
      verbose: true
    };

    const envKey = `${provider.toUpperCase()}_API_KEY`;
    const apiKey = process.env[envKey] || '';

    if (provider === 'ollama') {
      config.providers = {
        ollama: { baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434', model: model || 'llama3.2' }
      };
    } else if (provider === 'localai') {
      config.providers = {
        localai: { baseURL: process.env.LOCALAI_BASE_URL || 'http://localhost:8080', model: model || 'llama-3.2' }
      };
    } else if (provider === 'cerebras') {
      if (!apiKey) console.warn(`⚠️  No ${envKey} set, using free tier if available`);
      config.providers = {
        cerebras: { apiKey, model: model || 'llama-3.3-70b' }
      };
    } else if (provider === 'openrouter') {
      if (!apiKey) console.warn(`⚠️  No ${envKey} set, using free tier if available`);
      config.providers = {
        openrouter: { apiKey, model: model || 'meta-llama/llama-3.3-70b-instruct' }
      };
    } else if (provider === 'gemini') {
      if (!apiKey) console.warn(`⚠️  No ${envKey} set, some features may be limited`);
      config.providers = {
        gemini: { apiKey, model: model || 'gemini-2.0-flash' }
      };
    } else if (provider === 'qwen') {
      config.providers = {
        qwen: { apiKey, model: model || 'qwen3-235b-a22b', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }
      };
    } else if (provider === 'zhipu') {
      config.providers = {
        zhipu: { apiKey, model: model || 'glm-5', baseURL: 'https://open.bigmodel.cn/api/paas/v4' }
      };
    } else if (provider === 'mistral') {
      config.providers = { mistral: { apiKey, model: model || 'mistral-large-latest' } };
    } else if (provider === 'perplexity') {
      config.providers = { perplexity: { apiKey, model: model || 'llama-3.1-sonar-small-128k-online' } };
    } else if (provider === 'minimax') {
      config.providers = { minimax: { apiKey, model: model || 'MiniMax-Text-01', baseURL: 'https://api.minimax.chat/v1' } };
    } else if (provider === 'deepseek') {
      config.providers = { deepseek: { apiKey, model: model || 'deepseek-chat' } };
    } else if (provider === 'groq') {
      config.providers = { groq: { apiKey, model: model || 'llama-3.3-70b' } };
    } else if (provider === 'openai') {
      if (!apiKey) { console.error(`❌ ${ERROR_MESSAGES.API_KEY_MISSING}`); process.exit(1); }
      config.providers = { openai: { apiKey, model: model || 'gpt-4o' } };
    } else if (provider === 'anthropic') {
      if (!apiKey) { console.error(`❌ ${ERROR_MESSAGES.API_KEY_MISSING}`); process.exit(1); }
      config.providers = { anthropic: { apiKey, model: model || 'claude-sonnet-4-6' } };
    } else {
      console.error(`❌ ${ERROR_MESSAGES.INVALID_PROVIDER}`);
      process.exit(1);
    }

    try {
      const adapter = new UniversalAIAdapter(config);
      const response = await adapter.simpleChat(message);
      console.log('📥 Response:');
      console.log('-'.repeat(50));
      console.log(response);
      console.log('-'.repeat(50));
      
      const info = adapter.getCurrentProvider();
      console.log(`\n📊 Provider: ${info.provider}, Model: ${info.model}`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.message.includes('API key')) {
        console.error(`💡 ${ERROR_MESSAGES.API_KEY_MISSING}`);
      } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        console.error(`💡 ${ERROR_MESSAGES.NETWORK_ERROR}`);
      }
      process.exit(1);
    }
  } 
  else if (command === 'stream') {
    const provider = args[1] || 'ollama';
    const message = args[2] || 'Hello!';
    const model = args[3] || '';

    console.log(`\n🔄 Streaming from ${provider}...\n`);

    const config = {
      provider,
      providers: provider === 'ollama' 
        ? { ollama: { baseURL: 'http://localhost:11434', model: model || 'llama3.2' } }
        : { [provider]: { apiKey: process.env[`${provider.toUpperCase()}_API_KEY`] || '', model } },
      verbose: true
    };

    try {
      const adapter = new UniversalAIAdapter(config);
      
      if (!adapter.supportsStreaming()) {
        console.warn(`⚠️  ${provider} does not support streaming, using regular chat`);
        const response = await adapter.simpleChat(message);
        console.log(response);
        return;
      }

      process.stdout.write('📥 ');
      for await (const chunk of adapter.stream({ messages: [{ role: 'user', content: message }] })) {
        if (chunk.content) {
          process.stdout.write(chunk.content);
        }
      }
      console.log('\n');
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
  else if (command === 'status') {
    const provider = args[1] || 'ollama';

    console.log(`\n📊 Checking ${provider} status...\n`);

    const config = {
      provider,
      providers: provider === 'ollama' 
        ? { ollama: { baseURL: 'http://localhost:11434' } }
        : { [provider]: { apiKey: process.env[`${provider.toUpperCase()}_API_KEY`] || '' } }
    };

    try {
      const adapter = new UniversalAIAdapter(config);
      const statuses = await adapter.getProviderStatuses();
      statuses.forEach((s) => {
        console.log(`  ${s.provider}: ${s.available ? '✅ Available' : '❌ Unavailable'}`);
        if (s.model) console.log(`    Model: ${s.model}`);
        if (s.error) console.log(`    Error: ${s.error}`);
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
  else if (command === 'models') {
    const provider = args[1];
    
    console.log('\n📋 Available Models:\n');
    
    const allProviders = ['ollama', 'localai', 'cerebras', 'openrouter', 'qwen', 'mistral', 'perplexity', 'minimax', 'zhipu', 'gemini', 'openai', 'anthropic', 'groq', 'deepseek'];
    const providersToShow = provider ? [provider] : allProviders;
    
    for (const p of providersToShow) {
      console.log(`${p}:`);
      const defaultModels = {
        ollama: ['llama3.2:latest', 'llama3.3', 'mistral'],
        localai: ['llama-3.3', 'mistral'],
        cerebras: ['llama-3.3-70b', 'llama-3.1-70b'],
        openrouter: ['meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash'],
        qwen: ['qwen3-235b-a22b', 'qwen3-30b-a3b'],
        mistral: ['mistral-large-latest', 'mistral-small-latest'],
        perplexity: ['llama-3.1-sonar-small-128k-online'],
        minimax: ['MiniMax-Text-01'],
        zhipu: ['glm-5', 'glm-4-flash'],
        gemini: ['gemini-2.0-flash', 'gemini-2.5-pro'],
        openai: ['gpt-5.2', 'o1', 'gpt-4o'],
        anthropic: ['claude-sonnet-4-6', 'claude-opus-4-6'],
        groq: ['llama-3.3-70b', 'mixtral-8x7b'],
        deepseek: ['deepseek-chat', 'deepseek-reasoner']
      };
      console.log(`  ${defaultModels[p]?.join(', ') || 'N/A'}\n`);
    }
  }
  else if (command === 'compare') {
    const message = args.slice(1).join(' ');
    
    if (!message) {
      console.error('❌ Please provide a message to compare');
      process.exit(1);
    }

    console.log(`\n⚡ Comparing providers for: "${message}"\n`);

    const providers = ['ollama', 'cerebras', 'openrouter'];
    
    for (const p of providers) {
      try {
        console.log(`📡 ${p}...`);
        const config = {
          provider: p,
          providers: p === 'ollama' 
            ? { ollama: { baseURL: 'http://localhost:11434' } }
            : { [p]: { apiKey: process.env[`${p.toUpperCase()}_API_KEY`] || '' } }
        };
        
        const adapter = new UniversalAIAdapter(config);
        const start = Date.now();
        const response = await adapter.simpleChat(message);
        const duration = Date.now() - start;
        
        console.log(`  ✅ (${duration}ms)`);
        console.log(`  ${response.substring(0, 100)}...\n`);
      } catch (error) {
        console.log(`  ❌ ${error.message}\n`);
      }
    }
  }
  else {
    console.log('Unknown command:', command);
    console.log('Use: chat, stream, status, models, compare');
    console.log('Run: ai-adapter --help for usage');
  }
}

main();
