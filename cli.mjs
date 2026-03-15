#!/usr/bin/env node

import { readFileSync } from 'fs';
import { UnifiedAIService, getDefaultProviderOptions, buildProviderConfig } from './dist/index.js';

const { version: packageVersion } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

const args = process.argv.slice(2);
const providerMetadata = UnifiedAIService.listProviders();
const providerMetadataMap = new Map(providerMetadata.map((meta) => [meta.provider, meta]));
const defaultCompareProviders = ['ollama', 'cerebras', 'openrouter'];

function writeStdout(message = '') {
  process.stdout.write(`${message}\n`);
}

function writeStderr(message) {
  process.stderr.write(`${message}\n`);
}

function exitWithError(error) {
  const message = error instanceof Error ? error.message : String(error);
  writeStderr(`Error: ${message}`);
  process.exit(1);
}

function isConfigurableProvider(value) {
  return typeof value === 'string' && providerMetadataMap.has(value);
}

function getProviderOrDefault(value, fallback = 'ollama') {
  if (!value) {
    return fallback;
  }

  if (!isConfigurableProvider(value)) {
    throw new Error(`Unsupported provider: ${value}`);
  }

  return value;
}

function getApiKeyEnvName(provider) {
  return `${provider.toUpperCase()}_API_KEY`;
}

function resolveProviderOptions(provider, modelArg, apiKeyOrBaseUrlArg) {
  const defaults = getDefaultProviderOptions(provider);

  if (provider === 'ollama' || provider === 'localai') {
    return {
      model: modelArg || defaults.model,
      baseURL: apiKeyOrBaseUrlArg || defaults.baseURL,
    };
  }

  return {
    model: modelArg || defaults.model,
    apiKey: apiKeyOrBaseUrlArg || process.env[getApiKeyEnvName(provider)] || defaults.apiKey,
    baseURL: defaults.baseURL || undefined,
  };
}

function createService(provider, modelArg, apiKeyOrBaseUrlArg) {
  const providerOptions = resolveProviderOptions(provider, modelArg, apiKeyOrBaseUrlArg);
  return UnifiedAIService.fromConfig({
    provider,
    providerOptions,
    providers: buildProviderConfig(provider, providerOptions),
    verbose: true,
  });
}

function renderUsage() {
  writeStdout(`Universal AI Adapter CLI v${packageVersion}`);
  writeStdout();
  writeStdout('Usage:');
  writeStdout('  ai-adapter chat <provider> <message> [model] [apiKeyOrBaseUrl]');
  writeStdout('  ai-adapter stream <provider> <message> [model] [apiKeyOrBaseUrl]');
  writeStdout('  ai-adapter status [provider] [model] [apiKeyOrBaseUrl]');
  writeStdout('  ai-adapter models [provider]');
  writeStdout('  ai-adapter compare <message>');
  writeStdout('  ai-adapter --version');
  writeStdout();
  writeStdout('Examples:');
  writeStdout('  ai-adapter chat ollama "Hello" llama3.2');
  writeStdout('  ai-adapter chat openai "Hello" gpt-4o sk-xxx');
  writeStdout('  ai-adapter stream ollama "Tell me a story"');
  writeStdout('  ai-adapter compare "What is AI?"');
  writeStdout();
  writeStdout('Providers:');
  providerMetadata.forEach((meta) => {
    writeStdout(`  ${meta.provider.padEnd(11)} ${meta.label} (${meta.requiresApiKey ? 'api-key' : 'local'})`);
  });
}

function renderModels(provider) {
  if (provider) {
    const meta = UnifiedAIService.getProviderMetadata(provider);
    writeStdout(`${meta.provider}: ${meta.models.join(', ')}`);
    return;
  }

  providerMetadata.forEach((meta) => {
    writeStdout(`${meta.provider}:`);
    writeStdout(`  ${meta.models.join(', ')}`);
  });
}

function renderStatuses(statuses) {
  statuses.forEach((status) => {
    writeStdout(`${status.provider}: ${status.available ? 'available' : 'unavailable'}`);
    if (status.model) {
      writeStdout(`  model: ${status.model}`);
    }
    if (status.error) {
      writeStdout(`  error: ${status.error}`);
    }
  });
}

function renderCompareResult(provider, response, duration) {
  writeStdout(`${provider}: ok (${duration}ms)`);
  writeStdout(`  ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
}

async function runChat(provider, message, model, apiKeyOrBaseUrl) {
  const service = createService(provider, model, apiKeyOrBaseUrl);
  writeStdout(`Chatting with ${provider}...`);
  writeStdout();
  const response = await service.simpleChat(message);
  writeStdout('Response:');
  writeStdout('-'.repeat(50));
  writeStdout(response);
  writeStdout('-'.repeat(50));
  const info = service.getCurrentProvider();
  writeStdout();
  writeStdout(`Provider: ${info.provider}, Model: ${info.model}`);
}

async function runStream(provider, message, model, apiKeyOrBaseUrl) {
  const service = createService(provider, model, apiKeyOrBaseUrl);
  writeStdout(`Streaming from ${provider}...`);
  writeStdout();

  const metadata = providerMetadataMap.get(provider);
  if (!metadata.supportsStreaming) {
    writeStderr(`${provider} does not support streaming, using regular chat`);
    const response = await service.simpleChat(message);
    writeStdout(response);
    return;
  }

  process.stdout.write('Response: ');
  for await (const chunk of service.stream({ messages: [{ role: 'user', content: message }] })) {
    if (chunk.content) {
      process.stdout.write(chunk.content);
    }
  }
  writeStdout();
}

async function runStatus(provider, model, apiKeyOrBaseUrl) {
  const service = createService(provider, model, apiKeyOrBaseUrl);
  writeStdout(`Checking ${provider} status...`);
  writeStdout();
  const statuses = await service.getProviderStatuses();
  renderStatuses(statuses);
}

async function runCompare(message) {
  if (!message) {
    throw new Error('Please provide a message to compare');
  }

  writeStdout(`Comparing providers for: "${message}"`);
  writeStdout();

  for (const provider of defaultCompareProviders) {
    try {
      const service = createService(provider);
      const startedAt = Date.now();
      const response = await service.simpleChat(message);
      renderCompareResult(provider, response, Date.now() - startedAt);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      writeStdout(`${provider}: failed`);
      writeStdout(`  ${messageText}`);
    }
  }
}

async function main() {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    renderUsage();
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    writeStdout(packageVersion);
    return;
  }

  const command = args[0];

  switch (command) {
    case 'chat': {
      const provider = getProviderOrDefault(args[1]);
      const message = args[2] || 'Hello!';
      await runChat(provider, message, args[3], args[4]);
      return;
    }
    case 'stream': {
      const provider = getProviderOrDefault(args[1]);
      const message = args[2] || 'Hello!';
      await runStream(provider, message, args[3], args[4]);
      return;
    }
    case 'status': {
      const provider = getProviderOrDefault(args[1]);
      await runStatus(provider, args[2], args[3]);
      return;
    }
    case 'models': {
      const provider = args[1] ? getProviderOrDefault(args[1]) : undefined;
      renderModels(provider);
      return;
    }
    case 'compare': {
      await runCompare(args.slice(1).join(' '));
      return;
    }
    default:
      renderUsage();
  }
}

main().catch(exitWithError);
