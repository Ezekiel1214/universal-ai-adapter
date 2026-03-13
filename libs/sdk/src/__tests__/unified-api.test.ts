import { describe, expect, it } from '@jest/globals';
import {
  UnifiedAIService,
  buildProviderConfig,
  getDefaultProviderOptions,
  type ProviderMetadata,
} from '../unified-api';

describe('UnifiedAIService metadata', () => {
  it('should list metadata for every configurable provider', () => {
    const providers = UnifiedAIService.listProviders();

    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBe(15);
    providers.forEach((provider: ProviderMetadata) => {
      expect(provider.provider).toBeDefined();
      expect(provider.label.length).toBeGreaterThan(0);
      expect(provider.defaultModel.length).toBeGreaterThan(0);
      expect(provider.models.length).toBeGreaterThan(0);
    });
  });

  it('should expose metadata and defaults for a specific provider', () => {
    const metadata = UnifiedAIService.getProviderMetadata('openai');
    const defaults = UnifiedAIService.getDefaultProviderOptions('openai');

    expect(metadata.provider).toBe('openai');
    expect(metadata.requiresApiKey).toBe(true);
    expect(metadata.supportsStreaming).toBe(true);
    expect(defaults.model).toBe(metadata.defaultModel);
  });

  it('should expose local provider defaults without api keys', () => {
    const metadata = UnifiedAIService.getProviderMetadata('ollama');
    const defaults = getDefaultProviderOptions('ollama');

    expect(metadata.requiresApiKey).toBe(false);
    expect(defaults.baseURL).toBe('http://localhost:11434');
    expect(defaults.apiKey).toBe('');
  });

  it('should build provider config from unified defaults', () => {
    const config = buildProviderConfig('qwen', {
      apiKey: 'test-key',
      model: 'custom-model',
      baseURL: 'https://example.com/v1',
    });

    expect(config.qwen).toEqual({
      apiKey: 'test-key',
      model: 'custom-model',
      baseURL: 'https://example.com/v1',
    });
  });

  it('should create a service from provider metadata defaults', () => {
    const metadata = UnifiedAIService.getProviderMetadata('localai');
    const service = UnifiedAIService.fromConfig({
      provider: metadata.provider,
      providerOptions: getDefaultProviderOptions(metadata.provider),
    });

    expect(service.getCurrentProvider().provider).toBe('localai');
    expect(service.getCurrentProvider().model).toBe(metadata.defaultModel);
  });
});
