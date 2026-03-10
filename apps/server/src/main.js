import express from 'express';
import { UnifiedAIService } from '../../../dist/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const CONFIG = {
  API_KEY: process.env.API_KEY || '',
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  ENABLE_AUTH: process.env.ENABLE_AUTH === 'true',
  ENABLE_RATE_LIMIT: process.env.ENABLE_RATE_LIMIT !== 'false'
};

const providerMetadata = UnifiedAIService.listProviders();
const providerMetadataMap = new Map(providerMetadata.map((meta) => [meta.provider, meta]));
const allProviders = providerMetadata.map((meta) => meta.provider);

function normalizeError(error) {
  return error instanceof Error ? error : new Error(String(error));
}

function sendError(res, status, error, extra = {}) {
  const normalizedError = normalizeError(error);
  return res.status(status).json({ error: normalizedError.message, ...extra });
}

function isSupportedProvider(provider) {
  return typeof provider === 'string' && providerMetadataMap.has(provider);
}

function assertProvider(provider) {
  if (!isSupportedProvider(provider)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  return provider;
}

function buildKnowledgeContext(knowledgeFiles, useKnowledgeBase, knowledgeBaseMap) {
  let filesToUse = [];

  if (typeof knowledgeFiles === 'string' && knowledgeFiles) {
    filesToUse = [knowledgeFiles];
  } else if (Array.isArray(knowledgeFiles)) {
    filesToUse = knowledgeFiles;
  } else if (useKnowledgeBase === true) {
    filesToUse = Array.from(knowledgeBaseMap.keys());
  }

  if (filesToUse.length === 0) {
    return '';
  }

  const relevantContent = [];
  for (const filename of filesToUse) {
    if (knowledgeBaseMap.has(filename)) {
      relevantContent.push(`=== ${filename} ===\n${knowledgeBaseMap.get(filename).content}`);
    }
  }

  if (relevantContent.length === 0) {
    return '';
  }

  return `\n\nContext from knowledge base:\n${relevantContent.join('\n\n')}\n\nUse the above context to answer the user's question.`;
}

function buildProcessedMessages(messages, systemPrompt, contextMessage) {
  if (!contextMessage && !systemPrompt) {
    return messages;
  }

  if (contextMessage) {
    if (systemPrompt) {
      return [{ role: 'system', content: systemPrompt + contextMessage }, ...messages];
    }

    return [{ role: 'system', content: `You are a helpful AI assistant.${contextMessage}` }, ...messages];
  }

  return [{ role: 'system', content: systemPrompt }, ...messages];
}

// Rate limiting storage
const rateLimitMap = new Map();

function rateLimitMiddleware(req, res, next) {
  if (!CONFIG.ENABLE_RATE_LIMIT) return next();
  
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + CONFIG.RATE_LIMIT_WINDOW });
    return next();
  }
  
  const clientData = rateLimitMap.get(clientIP);
  
  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + CONFIG.RATE_LIMIT_WINDOW;
    rateLimitMap.set(clientIP, clientData);
    return next();
  }
  
  if (clientData.count >= CONFIG.RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
    res.set('Retry-After', retryAfter);
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again in ${retryAfter} seconds.`,
      retryAfter
    });
  }
  
  clientData.count++;
  rateLimitMap.set(clientIP, clientData);
  next();
}

// API Key authentication
function authMiddleware(req, res, next) {
  if (!CONFIG.ENABLE_AUTH || !CONFIG.API_KEY) return next();
  
  const providedKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!providedKey) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide an API key in the X-API-Key header or apiKey query parameter.'
    });
  }
  
  if (providedKey !== CONFIG.API_KEY) {
    return res.status(403).json({ 
      error: 'Invalid API key',
      message: 'The provided API key is not valid.'
    });
  }
  
  next();
}

// Ensure data directory exists
const DATA_DIR = join(__dirname, '../../../data');
const KNOWLEDGE_DIR = join(DATA_DIR, 'knowledge');

async function ensureDataDirs() {
  try {
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
  } catch (e) {
    // Directory already exists
  }
}
ensureDataDirs();

// Logger utility
function logger(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Apply rate limiting and authentication
app.use(rateLimitMiddleware);
app.use(authMiddleware);

app.use(express.json());
app.use(express.static(join(__dirname, '../../../web', 'public'), { etag: false, maxAge: '1h' }));
app.use('/download', express.static(join(__dirname, '../../../download'), { etag: false, maxAge: '1h' }));

const services = new Map();

function getService(provider, options = {}) {
  const validatedProvider = assertProvider(provider);
  const config = {
    provider: validatedProvider,
    providers: options.providers,
    providerOptions: options.providers
      ? undefined
      : {
          apiKey: options.apiKey,
          baseURL: options.baseURL,
          model: options.model,
        },
    enableFallback: options.enableFallback,
    fallbackOrder: options.fallbackOrder,
    verbose: options.verbose,
  };

  const key = JSON.stringify(config);

  if (!services.has(key)) {
    services.set(key, UnifiedAIService.fromConfig(config));
  }

  return services.get(key);
}

app.post('/api/chat', async (req, res) => {
  const startedAt = Date.now();

  try {
    const {
      provider,
      apiKey,
      baseURL,
      model,
      messages,
      temperature,
      maxTokens,
      stream,
      vpnEnabled,
      proxyUrl,
      systemPrompt,
      knowledgeFiles,
      useKnowledgeBase,
    } = req.body;

    const validatedProvider = assertProvider(provider);

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    const guardrailPatterns = [
      { pattern: /how to (make|build|create) (a )?bomb/i, response: "I can't help with that request." },
      { pattern: /(self-?harm|suicide|cut myself)/i, response: "I'm concerned about your wellbeing. Please reach out to a mental health professional." },
      { pattern: /give me (legal|lawyer)/i, response: "I'm not a lawyer and can't provide legal advice. Please consult a qualified attorney." },
      { pattern: /(hack|exploit|bypass) (security|password|account)/i, response: "I can't help with requests related to hacking or security exploits." }
    ];

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    for (const guard of guardrailPatterns) {
      if (guard.pattern.test(lastUserMessage)) {
        trackMetrics(validatedProvider, undefined, Date.now() - startedAt, 'guardrail');
        return res.json({ content: guard.response, guardrail: true, provider: validatedProvider });
      }
    }

    const contextMessage = buildKnowledgeContext(knowledgeFiles, useKnowledgeBase, knowledgeBaseMap);
    const processedMessages = buildProcessedMessages(messages, systemPrompt, contextMessage);

    if (vpnEnabled && proxyUrl) {
      try {
        const targetProvider = validatedProvider === 'ollama'
          ? 'http://localhost:11434'
          : validatedProvider === 'localai'
            ? 'http://localhost:8080'
            : '';

        const proxyRes = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': req.ip,
            'X-Proxy-Target': targetProvider,
          },
          body: JSON.stringify({
            provider: validatedProvider,
            baseURL: targetProvider,
            model,
            messages: processedMessages,
            temperature,
            maxTokens,
          }),
        });

        const data = await proxyRes.json();
        trackMetrics(validatedProvider, data.usage, Date.now() - startedAt);
        return res.json({ ...data, vpnRouted: true });
      } catch (proxyError) {
        const normalizedError = normalizeError(proxyError);
        logger('error', 'Proxy connection failed', { provider: validatedProvider, error: normalizedError.message });
        trackMetrics(validatedProvider, undefined, Date.now() - startedAt, normalizedError.message);
        return sendError(res, 502, normalizedError);
      }
    }

    const service = getService(validatedProvider, { apiKey, baseURL, model, verbose: false });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        for await (const chunk of service.stream({ messages: processedMessages, temperature, maxTokens })) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        trackMetrics(validatedProvider, undefined, Date.now() - startedAt);
        res.write('data: [DONE]\n\n');
      } catch (streamError) {
        const normalizedError = normalizeError(streamError);
        trackMetrics(validatedProvider, undefined, Date.now() - startedAt, normalizedError.message);
        res.write(`data: ${JSON.stringify({ error: normalizedError.message })}\n\n`);
      }

      res.end();
      return;
    }

    const response = await service.chat({ messages: processedMessages, temperature, maxTokens });
    trackMetrics(validatedProvider, response.usage, Date.now() - startedAt);
    return res.json(response);
  } catch (error) {
    const normalizedError = normalizeError(error);
    logger('error', 'Chat request failed', { error: normalizedError.message });
    return sendError(res, 500, normalizedError);
  }
});

app.get('/api/providers', (req, res) => {
  res.json({ providers: providerMetadata });
});

app.get('/api/providers/:provider', (req, res) => {
  try {
    const provider = assertProvider(req.params.provider);
    res.json({
      provider: UnifiedAIService.getProviderMetadata(provider),
      defaults: UnifiedAIService.getDefaultProviderOptions(provider),
      models: UnifiedAIService.listModels(provider),
    });
  } catch (error) {
    sendError(res, 404, error);
  }
});

app.get('/api/providers/:provider/models', (req, res) => {
  try {
    const provider = assertProvider(req.params.provider);
    res.json({ provider, models: UnifiedAIService.listModels(provider) });
  } catch (error) {
    sendError(res, 404, error);
  }
});

app.post('/api/providers/status', async (req, res) => {
  try {
    const { provider = 'ollama', apiKey, baseURL, model } = req.body;
    const validatedProvider = assertProvider(provider);
    const service = getService(validatedProvider, { apiKey, baseURL, model });
    const statuses = await service.getProviderStatuses();
    res.json(statuses);
  } catch (error) {
    sendError(res, 500, error);
  }
});

// Knowledge base storage (file-based persistent)
const knowledgeBaseMap = new Map();

// Load knowledge base from files on startup
async function loadKnowledgeBase() {
  try {
    const files = await fs.readdir(KNOWLEDGE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filepath = join(KNOWLEDGE_DIR, file);
        const data = await fs.readFile(filepath, 'utf-8');
        const parsed = JSON.parse(data);
        knowledgeBaseMap.set(parsed.name || file.replace('.json', ''), parsed);
      }
    }
    logger('info', 'Knowledge base loaded', { files: knowledgeBaseMap.size });
  } catch (e) {
    logger('info', 'No existing knowledge base found');
  }
}
loadKnowledgeBase();

// Save knowledge base to file
async function saveKnowledgeFile(filename, data) {
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filepath = join(KNOWLEDGE_DIR, `${safeName}.json`);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

// Delete knowledge base file
async function deleteKnowledgeFile(filename) {
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filepath = join(KNOWLEDGE_DIR, `${safeName}.json`);
  await fs.unlink(filepath);
}

// Upload knowledge base file
app.post('/api/knowledge/upload', express.text({ limit: '50mb' }), async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content required' });
    }

    const data = {
      name: filename,
      content: content.substring(0, 50000),
      uploadedAt: new Date().toISOString()
    };

    knowledgeBaseMap.set(filename, data);
    await saveKnowledgeFile(filename, data);

    logger('info', 'Knowledge file uploaded', { filename, size: content.length });
    res.json({ success: true, files: Array.from(knowledgeBaseMap.keys()) });
  } catch (error) {
    logger('error', 'Knowledge upload failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Query knowledge base
app.post('/api/knowledge/query', async (req, res) => {
  try {
    const { query, topK = 3 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    const results = [];
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    for (const [filename, data] of knowledgeBaseMap) {
      const content = data.content.toLowerCase();
      let score = 0;
      
      for (const word of words) {
        if (content.includes(word)) {
          score += 1;
        }
      }
      
      if (score > 0) {
        results.push({ filename, score, content: data.content.substring(0, 500) });
      }
    }

    results.sort((a, b) => b.score - a.score);
    res.json({ results: results.slice(0, topK) });
  } catch (error) {
    logger('error', 'Knowledge query failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// List knowledge base files
app.get('/api/knowledge/files', (req, res) => {
  const files = Array.from(knowledgeBaseMap.keys()).map(name => {
    const data = knowledgeBaseMap.get(name);
    return {
      name,
      size: data.content.length,
      uploadedAt: data.uploadedAt
    };
  });
  res.json({ files });
});

// Delete knowledge base file
app.delete('/api/knowledge/files/:filename', async (req, res) => {
  const { filename } = req.params;
  
  if (!knowledgeBaseMap.has(filename)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    await deleteKnowledgeFile(filename);
    knowledgeBaseMap.delete(filename);
    logger('info', 'Knowledge file deleted', { filename });
    res.json({ success: true, files: Array.from(knowledgeBaseMap.keys()) });
  } catch (error) {
    logger('error', 'Knowledge file delete failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Update knowledge base file
app.put('/api/knowledge/files/:filename', express.text({ limit: '50mb' }), async (req, res) => {
  const { filename } = req.params;
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content required' });
  }
  
  if (!knowledgeBaseMap.has(filename)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    const data = {
      name: filename,
      content: content.substring(0, 50000),
      uploadedAt: new Date().toISOString()
    };
    knowledgeBaseMap.set(filename, data);
    await saveKnowledgeFile(filename, data);
    logger('info', 'Knowledge file updated', { filename });
    res.json({ success: true, files: Array.from(knowledgeBaseMap.keys()) });
  } catch (error) {
    logger('error', 'Knowledge file update failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get single knowledge base file content
app.get('/api/knowledge/files/:filename', (req, res) => {
  const { filename } = req.params;
  
  if (!knowledgeBaseMap.has(filename)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const data = knowledgeBaseMap.get(filename);
  res.json({ filename, content: data.content, uploadedAt: data.uploadedAt });
});

// Clear all knowledge base files
app.delete('/api/knowledge/clear', async (req, res) => {
  const count = knowledgeBaseMap.size;
  
  try {
    for (const filename of knowledgeBaseMap.keys()) {
      await deleteKnowledgeFile(filename);
    }
    knowledgeBaseMap.clear();
    logger('info', 'Knowledge base cleared', { deletedCount: count });
    res.json({ success: true, deletedCount: count });
  } catch (error) {
    logger('error', 'Knowledge clear failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  res.json({
    status: 'ok',
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memory.rss / 1024 / 1024) + 'MB'
    },
    features: {
      auth: CONFIG.ENABLE_AUTH,
      rateLimit: CONFIG.ENABLE_RATE_LIMIT,
      rateLimitMax: CONFIG.RATE_LIMIT_MAX,
      rateLimitWindow: CONFIG.RATE_LIMIT_WINDOW
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/models', async (req, res) => {
  const result = { ...UnifiedAIService.listModels() };
  
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/tags');
    const data = await ollamaRes.json();
    result.ollama = data.models?.map(m => m.name) || result.ollama;
  } catch (e) {
    // Ollama not available
  }
  
  try {
    const localaiRes = await fetch('http://localhost:8080/v1/models');
    const data = await localaiRes.json();
    result.localai = data.data?.map(m => m.id) || result.localai;
  } catch (e) {
    // LocalAI not available
  }
  
  res.json(result);
});

// Compare ALL providers - the unified API in action!
app.post('/api/compare', async (req, res) => {
  try {
    const { message, providers: requestedProviders, temperature, maxTokens, apiKeys } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const providersToCompare = requestedProviders || allProviders;
    const invalidProviders = providersToCompare.filter((provider) => !isSupportedProvider(provider));

    if (invalidProviders.length > 0) {
      return res.status(400).json({ error: `Unsupported providers: ${invalidProviders.join(', ')}` });
    }

    const results = await Promise.allSettled(
      providersToCompare.map(async (provider) => {
        const startTime = Date.now();
        
        try {
          const service = getService(provider, { apiKey: apiKeys?.[provider] });
          const response = await service.chat({
            messages: [{ role: 'user', content: message }],
            temperature,
            maxTokens
          });

          const duration = Date.now() - startTime;
          trackMetrics(provider, response.usage, duration);

          return {
            provider,
            success: true,
            content: response.content,
            model: response.model,
            duration,
            usage: response.usage
          };
        } catch (error) {
          const normalizedError = normalizeError(error);
          const duration = Date.now() - startTime;
          trackMetrics(provider, undefined, duration, normalizedError.message);
          return {
            provider,
            success: false,
            error: normalizedError.message,
            duration
          };
        }
      })
    );

    const formattedResults = results.map((r) => r.value || r.reason);
    res.json({ results: formattedResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard metrics
const metrics = {
  requests: 0,
  tokens: { prompt: 0, completion: 0, total: 0 },
  providers: {},
  costs: {},
  uptime: Date.now()
};

function trackMetrics(provider, usage, duration, errorMessage) {
  metrics.requests++;

  if (usage) {
    metrics.tokens.prompt += usage.promptTokens || 0;
    metrics.tokens.completion += usage.completionTokens || 0;
    metrics.tokens.total += usage.totalTokens || 0;
  }

  if (!metrics.providers[provider]) {
    metrics.providers[provider] = { requests: 0, tokens: 0, errors: 0, avgDuration: 0 };
  }

  const providerMetrics = metrics.providers[provider];
  providerMetrics.requests++;
  providerMetrics.tokens += usage?.totalTokens || 0;

  if (errorMessage) {
    providerMetrics.errors++;
    return;
  }

  providerMetrics.avgDuration =
    (providerMetrics.avgDuration * (providerMetrics.requests - 1) + duration) /
    providerMetrics.requests;
}

// Rate limit status endpoint
app.get('/api/rate-limit/status', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const clientData = rateLimitMap.get(clientIP);
  
  if (!clientData) {
    return res.json({
      remaining: CONFIG.RATE_LIMIT_MAX,
      resetTime: Date.now() + CONFIG.RATE_LIMIT_WINDOW,
      limit: CONFIG.RATE_LIMIT_MAX
    });
  }
  
  const remaining = Math.max(0, CONFIG.RATE_LIMIT_MAX - clientData.count);
  res.json({
    remaining,
    resetTime: clientData.resetTime,
    limit: CONFIG.RATE_LIMIT_MAX
  });
});

app.get('/api/dashboard', (req, res) => {
  const providerStats = Object.entries(metrics.providers).map(([name, stat]) => ({
    name,
    requests: stat.requests,
    tokens: stat.tokens,
    errors: stat.errors,
    avgDuration: stat.avgDuration,
    successRate: stat.requests > 0 ? ((stat.requests - stat.errors) / stat.requests * 100).toFixed(1) + '%' : '0%'
  }));

  res.json({
    summary: {
      totalRequests: metrics.requests,
      totalTokens: metrics.tokens.total,
      uptime: Math.floor((Date.now() - metrics.uptime) / 1000) + 's',
      avgTokensPerRequest: metrics.requests > 0 ? Math.round(metrics.tokens.total / metrics.requests) : 0
    },
    providers: providerStats,
    costs: metrics.costs,
    tokens: metrics.tokens
  });
});

app.post('/api/dashboard/track', (req, res) => {
  const { provider, tokens, duration, error } = req.body;
  trackMetrics(provider, tokens ? {
    promptTokens: tokens.prompt,
    completionTokens: tokens.completion,
    totalTokens: tokens.total
  } : undefined, duration || 0, error);
  res.json({ success: true });
});

// ============ TOOLS & SKILLS API ============

// Tool definitions (OpenAI function calling format)
const toolDefinitions = {
  'web-search': {
    name: 'web_search',
    description: 'Search the web for current information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },
  'calculator': {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression (e.g., 2+2, sqrt(16))' }
      },
      required: ['expression']
    }
  },
  'weather': {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' }
      },
      required: ['location']
    }
  },
  'translate': {
    name: 'translate_text',
    description: 'Translate text between languages',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to translate' },
        from: { type: 'string', description: 'Source language (auto for auto-detect)' },
        to: { type: 'string', description: 'Target language (e.g., en, es, fr)' }
      },
      required: ['text', 'to']
    }
  },
  'files': {
    name: 'read_file',
    description: 'Read content from a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' }
      },
      required: ['path']
    }
  },
  'code-runner': {
    name: 'run_code',
    description: 'Execute code in various programming languages',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Programming language (python, javascript, etc.)' },
        code: { type: 'string', description: 'Code to execute' }
      },
      required: ['language', 'code']
    }
  },
  'image-gen': {
    name: 'generate_image',
    description: 'Generate images using AI',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Image description' },
        size: { type: 'string', description: 'Image size (256x256, 512x512, 1024x1024)' }
      },
      required: ['prompt']
    }
  },
  'datetime': {
    name: 'get_datetime',
    description: 'Get current date and time',
    parameters: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Timezone (e.g., UTC, America/New_York)' }
      }
    }
  },
  'url-fetch': {
    name: 'fetch_url',
    description: 'Fetch content from a URL',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        method: { type: 'string', description: 'HTTP method (GET, POST)' }
      },
      required: ['url']
    }
  },
  'json-parse': {
    name: 'parse_json',
    description: 'Parse and validate JSON data',
    parameters: {
      type: 'object',
      properties: {
        json: { type: 'string', description: 'JSON string to parse' }
      },
      required: ['json']
    }
  }
};

// Get available tools
app.get('/api/tools', (req, res) => {
  const tools = Object.entries(toolDefinitions).map(([key, def]) => ({
    id: key,
    name: def.name,
    description: def.description,
    parameters: def.parameters
  }));
  res.json({ tools });
});

// Execute a tool
app.post('/api/tools/execute', async (req, res) => {
  try {
    const { toolId, parameters } = req.body;
    
    if (!toolId || !parameters) {
      return res.status(400).json({ error: 'toolId and parameters required' });
    }

    let result;
    
    switch (toolId) {
      case 'calculator':
        try {
          const safeEval = (expr) => {
            const allowed = /^[0-9+\-*/().sqrtpow\s]+$/i;
            if (!allowed.test(expr)) throw new Error('Invalid expression');
            return Function('"use strict"; return (' + expr.replace(/sqrt/g, 'Math.sqrt').replace(/pow/g, 'Math.pow') + ')')();
          };
          result = { result: safeEval(parameters.expression), expression: parameters.expression };
        } catch (e) {
          result = { error: e.message };
        }
        break;
        
      case 'weather':
        result = { 
          location: parameters.location, 
          temperature: '22°C', 
          condition: 'Partly Cloudy',
          humidity: '65%'
        };
        break;
        
      case 'translate':
        result = {
          original: parameters.text,
          translated: `[Translated to ${parameters.to}]: ${parameters.text}`,
          from: parameters.from || 'auto',
          to: parameters.to
        };
        break;
        
      case 'files':
        try {
          const fs = await import('fs');
          if (fs.existsSync(parameters.path)) {
            result = { content: fs.readFileSync(parameters.path, 'utf-8').substring(0, 5000) };
          } else {
            result = { error: 'File not found' };
          }
        } catch (e) {
          result = { error: e.message };
        }
        break;
        
      case 'web-search':
        result = { 
          query: parameters.query, 
          results: [
            { title: 'Search result 1', url: 'https://example.com/1', snippet: 'Relevant information about ' + parameters.query },
            { title: 'Search result 2', url: 'https://example.com/2', snippet: 'More details about ' + parameters.query }
          ]
        };
        break;

      case 'code-runner':
        result = {
          language: parameters.language,
          output: '[Code execution would run in production - sandboxed environment]',
          note: 'Runner requires sandboxed environment setup'
        };
        break;

      case 'image-gen':
        result = {
          prompt: parameters.prompt,
          size: parameters.size || '512x512',
          url: 'https://via.placeholder.com/' + (parameters.size || '512x512') + '?text=AI+Image+Generation',
          note: 'Image generation requires API key setup'
        };
        break;

      case 'datetime':
        const now = new Date();
        result = {
          iso: now.toISOString(),
          utc: now.toUTCString(),
          unix: Math.floor(now.getTime() / 1000),
          timezone: parameters.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        break;

      case 'url-fetch':
        try {
          const fetchRes = await fetch(parameters.url, { method: parameters.method || 'GET' });
          const text = await fetchRes.text();
          result = {
            url: parameters.url,
            status: fetchRes.status,
            contentLength: text.length,
            preview: text.substring(0, 200)
          };
        } catch (e) {
          result = { error: e.message };
        }
        break;

      case 'json-parse':
        try {
          const parsed = JSON.parse(parameters.json);
          result = { valid: true, data: parsed };
        } catch (e) {
          result = { valid: false, error: e.message };
        }
        break;
        
      default:
        result = { error: 'Tool not implemented' };
    }
    
    res.json({ toolId, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MCP SERVER INTEGRATION ============

const mcpServers = new Map();

app.post('/api/mcp/connect', async (req, res) => {
  try {
    const { name, url } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'name and url required' });
    }

    mcpServers.set(name, { url, connected: true, connectedAt: new Date().toISOString() });
    
    res.json({ success: true, server: { name, url } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mcp/servers', (req, res) => {
  const servers = Array.from(mcpServers.entries()).map(([name, data]) => ({
    name,
    ...data
  }));
  res.json({ servers });
});

app.post('/api/mcp/:serverName/tools', async (req, res) => {
  try {
    const { serverName } = req.params;
    const server = mcpServers.get(serverName);
    
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    // In production, this would call the MCP server's tools endpoint
    res.json({ 
      tools: [
        { name: `${serverName}_tool1`, description: 'Tool from MCP server' }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mcp/:serverName', (req, res) => {
  const { serverName } = req.params;
  mcpServers.delete(serverName);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

