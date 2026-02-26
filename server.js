import express from 'express';
import { UniversalAIAdapter } from './dist/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'web', 'public')));

const adapters = new Map();

function getAdapter(config) {
  const key = JSON.stringify(config);
  
  if (!adapters.has(key)) {
    adapters.set(key, new UniversalAIAdapter(config));
  }
  
  return adapters.get(key);
}

app.post('/api/chat', async (req, res) => {
  try {
    const { provider, apiKey, baseURL, model, messages, temperature, maxTokens, stream } = req.body;
    
    const config = {
      provider,
      providers: {
        [provider]: provider === 'ollama' 
          ? { baseURL: baseURL || 'http://localhost:11434', model: model || 'llama3.2' }
          : { apiKey, model }
      },
      verbose: false
    };
    
    const adapter = getAdapter(config);
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      try {
        for await (const chunk of adapter.stream({ messages, temperature, maxTokens })) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write('data: [DONE]\n\n');
      } catch (streamError) {
        res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
      }
      
      res.end();
      return;
    }
    
    const response = await adapter.chat({ messages, temperature, maxTokens });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/providers/status', async (req, res) => {
  try {
    const { provider, apiKey, baseURL, model } = req.body;
    
    const config = {
      provider,
      providers: {
        [provider]: provider === 'ollama'
          ? { baseURL: baseURL || 'http://localhost:11434', model: model || 'llama3.2' }
          : { apiKey, model }
      }
    };
    
    const adapter = getAdapter(config);
    const statuses = await adapter.getProviderStatuses();
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models', async (req, res) => {
  const result = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4o-realtime-preview', 'o1', 'o1-mini'],
    anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    deepseek: ['deepseek-chat', 'deepseek-coder'],
    ollama: []
  };
  
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/tags');
    const data = await ollamaRes.json();
    result.ollama = data.models?.map(m => m.name) || [];
  } catch (e) {
    // Ollama not available
  }
  
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
