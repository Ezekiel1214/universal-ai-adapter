/**
 * SmartAdapter Example - All-in-one unified adapter
 * 
 * Demonstrates the SmartAdapter class which integrates:
 * - Response caching
 * - Rate limiting  
 * - Retry logic with exponential backoff
 * - Circuit breaker
 * - Metrics collection
 * 
 * All features work together automatically!
 */

import { 
  SmartAdapter, 
  createProductionAdapter,
  createDevelopmentAdapter 
} from '../src/smart-adapter.js';

/**
 * Example 1: Basic SmartAdapter usage
 */
async function basicExample() {
  console.log('\n=== Basic SmartAdapter Example ===\n');

  const adapter = new SmartAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    },
    // All features enabled by default!
    cache: { enabled: true, preset: 'development' },
    rateLimit: { enabled: true },
    retry: { enabled: true },
    circuitBreaker: { enabled: true },
    metrics: { enabled: true }
  });

  const messages = [
    { role: 'user' as const, content: 'What is 2+2?' }
  ];

  // First request - will hit API
  console.log('Making first request...');
  const response1 = await adapter.chat({ messages });
  console.log('Response:', response1.content);
  console.log('Cached:', response1.cached);
  console.log('Duration:', response1.duration, 'ms');
  console.log('Retries:', response1.retries);

  // Second request - will be cached!
  console.log('\nMaking second request (same question)...');
  const response2 = await adapter.chat({ messages });
  console.log('Response:', response2.content);
  console.log('Cached:', response2.cached); // true!
  console.log('Duration:', response2.duration, 'ms'); // Much faster!
  console.log('Retries:', response2.retries);

  // Get comprehensive status
  console.log('\n--- Status ---');
  const status = adapter.getStatus();
  console.log('Current Provider:', status.provider);
  console.log('Cache Enabled:', status.features.cache.enabled);
  console.log('Cache Stats:', status.features.cache.stats);
  console.log('Metrics Summary:', status.features.metrics.summary);
}

/**
 * Example 2: Production-optimized adapter
 */
async function productionExample() {
  console.log('\n=== Production Adapter Example ===\n');

  // Use the production preset - all features optimized for production
  const adapter = createProductionAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  console.log('Production adapter created with:');
  console.log('- Aggressive caching (1 hour TTL, 500 entries)');
  console.log('- Rate limiting enabled');
  console.log('- Retry with exponential backoff (3 retries)');
  console.log('- Circuit breaker enabled');
  console.log('- Metrics collection enabled\n');

  const response = await adapter.simpleChat(
    'Explain quantum computing in one sentence'
  );

  console.log('Response:', response);

  // Get metrics
  const metrics = adapter.getMetrics();
  if (metrics) {
    const summary = metrics.getSummary();
    console.log('\nMetrics:');
    console.log('- Total Requests:', summary.totalRequests);
    console.log('- Success Rate:', summary.successRate.toFixed(1), '%');
    console.log('- Average Duration:', summary.averageDuration.toFixed(0), 'ms');
  }
}

/**
 * Example 3: Development-optimized adapter
 */
async function developmentExample() {
  console.log('\n=== Development Adapter Example ===\n');

  // Use the development preset - optimized for fast iteration
  const adapter = createDevelopmentAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  console.log('Development adapter created with:');
  console.log('- Short-term caching (5 minutes)');
  console.log('- Rate limiting disabled (faster development)');
  console.log('- Single retry only');
  console.log('- Circuit breaker disabled (easier debugging)');
  console.log('- Verbose logging enabled\n');

  const response = await adapter.simpleChat('Hello!');
  console.log('Response:', response);
}

/**
 * Example 4: Custom configuration
 */
async function customConfigExample() {
  console.log('\n=== Custom Configuration Example ===\n');

  const adapter = new SmartAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    },
    preferredProvider: 'openai',
    fallbackChain: ['openai', 'anthropic'],
    
    // Custom cache settings
    cache: {
      enabled: true,
      custom: {
        ttl: 7200000, // 2 hours
        maxSize: 1000,
        includeSystemMessages: false
      }
    },
    
    // Custom rate limits for enterprise tier
    rateLimit: {
      enabled: true,
      customLimits: {
        openai: {
          requestsPerMinute: 100,
          requestsPerHour: 5000,
          tokensPerMinute: 150000,
          concurrent: 20
        }
      }
    },
    
    // Aggressive retry
    retry: {
      enabled: true,
      config: {
        maxRetries: 5,
        initialDelay: 500,
        maxDelay: 60000,
        backoffMultiplier: 3
      }
    },
    
    // All other features enabled
    circuitBreaker: { enabled: true },
    metrics: { enabled: true, maxMetrics: 20000 }
  });

  console.log('Custom adapter configured!');
  
  const response = await adapter.simpleChat('Test custom configuration');
  console.log('Response received:', response.substring(0, 100) + '...');
}

/**
 * Example 5: Per-request overrides
 */
async function perRequestOverridesExample() {
  console.log('\n=== Per-Request Overrides Example ===\n');

  const adapter = new SmartAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  const messages = [
    { role: 'user' as const, content: 'Important query that should not be cached' }
  ];

  // Skip cache for this specific request
  const response = await adapter.chat({
    messages,
    skipCache: true,      // Don't use cache
    skipRateLimit: true,  // Don't wait for rate limit
    skipRetry: false      // Still use retry
  });

  console.log('Response (cache skipped):', response.content);
  console.log('Was cached:', response.cached); // false
}

/**
 * Example 6: Monitoring and metrics
 */
async function monitoringExample() {
  console.log('\n=== Monitoring and Metrics Example ===\n');

  const adapter = new SmartAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  // Make several requests
  console.log('Making multiple requests...');
  for (let i = 0; i < 3; i++) {
    await adapter.simpleChat(`Test request ${i + 1}`);
  }

  // Get comprehensive dashboard
  const dashboard = adapter.getDashboard();
  if (dashboard) {
    console.log('\n--- Dashboard ---');
    console.log('Summary:', dashboard.summary);
    console.log('\nProvider Metrics:', dashboard.providers);
    console.log('\nCost Breakdown:', dashboard.costBreakdown);
    console.log('\nLast Updated:', new Date(dashboard.lastUpdated).toISOString());
  }

  // Export metrics to JSON
  const metricsJson = adapter.exportMetrics();
  if (metricsJson) {
    console.log('\nMetrics exported (first 200 chars):');
    console.log(metricsJson.substring(0, 200) + '...');
  }
}

/**
 * Example 7: Dynamic configuration updates
 */
async function dynamicConfigExample() {
  console.log('\n=== Dynamic Configuration Example ===\n');

  const adapter = new SmartAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  // Initial request
  console.log('Making request with default settings...');
  await adapter.simpleChat('Initial request');

  // Update cache configuration
  console.log('\nUpdating cache TTL to 10 minutes...');
  adapter.updateCacheConfig({
    ttl: 600000 // 10 minutes
  });

  // Update retry configuration
  console.log('Updating retry settings...');
  adapter.updateRetryConfig({
    maxRetries: 5,
    initialDelay: 2000
  });

  // Make another request with new settings
  console.log('Making request with updated settings...');
  await adapter.simpleChat('Request with new config');

  console.log('\nConfiguration updated dynamically!');
}

/**
 * Example 8: Error handling and circuit breaker
 */
async function errorHandlingExample() {
  console.log('\n=== Error Handling and Circuit Breaker Example ===\n');

  const adapter = new SmartAdapter({
    apiKeys: {
      openai: 'invalid-key-to-trigger-errors'
    },
    retry: {
      enabled: true,
      config: { maxRetries: 2 }
    }
  });

  // This will fail and trigger retry + circuit breaker
  try {
    await adapter.simpleChat('This will fail');
  } catch (error: any) {
    console.log('Error caught:', error.message);
  }

  // Check circuit breaker status
  const breaker = adapter.getCircuitBreaker();
  if (breaker) {
    const status = breaker.getStatus('openai');
    console.log('\nCircuit Breaker Status:');
    console.log('- Failures:', status.failures);
    console.log('- Is Open:', status.isOpen);
  }

  // Check error metrics
  const metrics = adapter.getMetrics();
  if (metrics) {
    const errors = metrics.getErrorAnalysis();
    console.log('\nError Analysis:', errors);
  }
}

/**
 * Example 9: Maintenance operations
 */
async function maintenanceExample() {
  console.log('\n=== Maintenance Operations Example ===\n');

  const adapter = new SmartAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  // Make some requests
  await adapter.simpleChat('Request 1');
  await adapter.simpleChat('Request 2');

  console.log('Performing maintenance operations...\n');

  // Clear cache
  console.log('Clearing cache...');
  adapter.clearCache();

  // Reset rate limits
  console.log('Resetting rate limits for OpenAI...');
  adapter.resetRateLimits('openai');

  // Reset circuit breaker
  console.log('Resetting circuit breaker...');
  adapter.resetCircuitBreaker('openai');

  console.log('\nMaintenance complete!');

  // Verify cache is empty
  const cache = adapter.getCache();
  if (cache) {
    const stats = cache.getStats();
    console.log('Cache size after clear:', stats.size); // Should be 0
  }
}

/**
 * Example 10: Provider switching
 */
async function providerSwitchingExample() {
  console.log('\n=== Provider Switching Example ===\n');

  const adapter = new SmartAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    }
  });

  console.log('Current provider:', adapter.getCurrentProvider());
  console.log('Available providers:', adapter.getAvailableProviders());

  // Switch provider
  console.log('\nSwitching to Anthropic...');
  adapter.switchProvider('anthropic');

  console.log('New provider:', adapter.getCurrentProvider());

  // Make request with new provider
  const response = await adapter.simpleChat('Hello from Anthropic!');
  console.log('Response from', response.provider, ':', response.content.substring(0, 100));
}

// Run examples
async function main() {
  console.log('🚀 SmartAdapter - Unified AI Adapter Examples\n');
  console.log('=' .repeat(60));

  try {
    // Run examples that don't require API keys
    await basicExample();
    
    // Uncomment to run examples that require API keys:
    // await productionExample();
    // await developmentExample();
    // await customConfigExample();
    // await perRequestOverridesExample();
    // await monitoringExample();
    // await dynamicConfigExample();
    // await errorHandlingExample();
    // await maintenanceExample();
    // await providerSwitchingExample();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Examples completed!');
    console.log('\nTip: Set API keys and uncomment examples to see full functionality.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  basicExample,
  productionExample,
  developmentExample,
  customConfigExample,
  perRequestOverridesExample,
  monitoringExample,
  dynamicConfigExample,
  errorHandlingExample,
  maintenanceExample,
  providerSwitchingExample
};
