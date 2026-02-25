import { UniversalAIAdapter } from '../src/adapter.js';
import { ResponseCache, CachePresets } from '../src/cache.js';
import { RateLimiter, RetryHandler, CircuitBreaker } from '../src/rate-limit.js';

/**
 * Example: Using response caching to reduce API calls
 */
async function cachingExample() {
  console.log('\n=== Caching Example ===\n');

  const adapter = new UniversalAIAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  // Create cache with production preset
  const cache = new ResponseCache(CachePresets.production);

  const messages = [{ role: 'user' as const, content: 'What is 2+2?' }];

  // First request - cache miss
  console.log('First request (cache miss)...');
  let cached = cache.get(messages);
  
  if (!cached) {
    const response = await adapter.chat({ messages });
    cache.set(messages, response, 'openai', 'gpt-4', 0.7);
    console.log('Response:', response.content);
  }

  // Second request - cache hit!
  console.log('\nSecond request (cache hit)...');
  cached = cache.get(messages);
  
  if (cached) {
    console.log('Cached response:', cached.content);
    console.log('Saved an API call! 💰');
  }

  // View cache statistics
  const stats = cache.getStats();
  console.log('\nCache Stats:', {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
    size: stats.size
  });
}

/**
 * Example: Rate limiting to stay within API quotas
 */
async function rateLimitingExample() {
  console.log('\n=== Rate Limiting Example ===\n');

  const rateLimiter = new RateLimiter();
  
  // Check current limits
  const limits = rateLimiter.getProviderLimits('openai');
  console.log('OpenAI rate limits:', limits);

  // Simulate multiple requests
  for (let i = 0; i < 5; i++) {
    // Wait for available slot
    await rateLimiter.waitForSlot('openai');
    
    // Record the request
    rateLimiter.recordRequest('openai');
    
    console.log(`Request ${i + 1} - Status:`, rateLimiter.getStatus('openai'));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Record completion
    rateLimiter.recordCompletion('openai');
  }

  console.log('\nAll requests completed within rate limits! ✅');
}

/**
 * Example: Retry logic with exponential backoff
 */
async function retryExample() {
  console.log('\n=== Retry with Exponential Backoff ===\n');

  const retryHandler = new RetryHandler({
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2
  });

  let attempts = 0;

  try {
    const result = await retryHandler.execute(async () => {
      attempts++;
      
      // Simulate failing first 2 times, succeeding on 3rd
      if (attempts < 3) {
        console.log(`Attempt ${attempts} - Simulating failure...`);
        throw new Error('Temporary network error');
      }
      
      console.log(`Attempt ${attempts} - Success!`);
      return 'Success!';
    }, 'API Request');

    console.log('\nFinal result:', result);
  } catch (error) {
    console.error('Failed after all retries:', error);
  }
}

/**
 * Example: Circuit breaker to prevent cascading failures
 */
async function circuitBreakerExample() {
  console.log('\n=== Circuit Breaker Example ===\n');

  const breaker = new CircuitBreaker();

  // Simulate 5 consecutive failures
  console.log('Simulating failures...');
  for (let i = 0; i < 5; i++) {
    breaker.recordFailure('openai');
    const status = breaker.getStatus('openai');
    console.log(`Failure ${i + 1} - Circuit open:`, status.isOpen);
  }

  // Try to make request - circuit should be open
  if (breaker.isOpen('openai')) {
    console.log('\n⚠️  Circuit breaker is OPEN - preventing request to failing service');
    console.log('This protects against cascading failures!');
  }

  // Simulate recovery after timeout
  console.log('\nWaiting for circuit breaker timeout...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Record success to reset circuit
  breaker.recordSuccess('openai');
  console.log('Circuit breaker CLOSED - service recovered ✅');
}

/**
 * Example: Complete integration with all features
 */
async function completeExample() {
  console.log('\n=== Complete Integration Example ===\n');

  const adapter = new UniversalAIAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    },
    verbose: true
  });

  // Initialize all features
  const cache = new ResponseCache(CachePresets.development);
  const rateLimiter = new RateLimiter();
  const retryHandler = new RetryHandler();
  const breaker = new CircuitBreaker();

  const messages = [
    { role: 'user' as const, content: 'Explain quantum computing in one sentence.' }
  ];

  try {
    // Check circuit breaker
    if (breaker.isOpen('openai')) {
      throw new Error('Circuit breaker is open');
    }

    // Check cache first
    let response = cache.get(messages);

    if (!response) {
      console.log('Cache miss - making API request...');

      // Wait for rate limit slot
      await rateLimiter.waitForSlot('openai');
      rateLimiter.recordRequest('openai');

      // Execute with retry logic
      response = await retryHandler.execute(async () => {
        return await adapter.chat({ messages });
      }, 'Chat Request');

      rateLimiter.recordCompletion('openai');

      // Cache the response
      cache.set(messages, response, 'openai', 'gpt-4');
      
      // Record success in circuit breaker
      breaker.recordSuccess('openai');

      console.log('\nResponse:', response.content);
    } else {
      console.log('Cache hit! ✨\n');
      console.log('Response:', response.content);
    }

    // Show statistics
    console.log('\n--- Statistics ---');
    console.log('Cache:', cache.getStats());
    console.log('Rate Limit:', rateLimiter.getStatus('openai'));
    console.log('Circuit Breaker:', breaker.getStatus('openai'));

  } catch (error) {
    breaker.recordFailure('openai');
    rateLimiter.recordCompletion('openai');
    console.error('Request failed:', error);
  }
}

/**
 * Example: Custom rate limit configuration
 */
function customRateLimitsExample() {
  console.log('\n=== Custom Rate Limits Example ===\n');

  const rateLimiter = new RateLimiter();

  // Configure custom limits for your API tier
  rateLimiter.setProviderLimits('openai', {
    requestsPerMinute: 100,    // Enterprise tier
    requestsPerHour: 5000,
    tokensPerMinute: 150000,
    concurrent: 20
  });

  console.log('Custom OpenAI limits set:');
  console.log(rateLimiter.getProviderLimits('openai'));

  // More conservative limits for a specific provider
  rateLimiter.setProviderLimits('groq', {
    requestsPerMinute: 10,
    requestsPerHour: 500,
    concurrent: 2
  });

  console.log('\nConservative Groq limits set:');
  console.log(rateLimiter.getProviderLimits('groq'));
}

/**
 * Example: Cache warming for common queries
 */
async function cacheWarmingExample() {
  console.log('\n=== Cache Warming Example ===\n');

  const adapter = new UniversalAIAdapter({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  const cache = new ResponseCache(CachePresets.production);

  // Define common queries to pre-cache
  const commonQueries = [
    { messages: [{ role: 'user' as const, content: 'What is AI?' }] },
    { messages: [{ role: 'user' as const, content: 'Explain machine learning' }] },
    { messages: [{ role: 'user' as const, content: 'What is TypeScript?' }] }
  ];

  console.log('Warming up cache with common queries...');

  await cache.warmUp(
    commonQueries,
    async (messages, temp, maxTokens) => {
      return await adapter.chat({ messages, temperature: temp, maxTokens });
    }
  );

  console.log('✅ Cache warmed with', cache.getStats().size, 'entries');

  // Now these queries will be instant
  const fastResponse = cache.get(commonQueries[0].messages);
  console.log('\nInstant response from cache:', fastResponse?.content.substring(0, 100) + '...');
}

// Run examples
async function main() {
  console.log('🚀 Universal AI Adapter - Advanced Features Demo\n');
  console.log('=' .repeat(50));

  try {
    await cachingExample();
    await rateLimitingExample();
    await retryExample();
    await circuitBreakerExample();
    customRateLimitsExample();
    
    // Uncomment to run complete example (requires API key)
    // await completeExample();
    // await cacheWarmingExample();

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
