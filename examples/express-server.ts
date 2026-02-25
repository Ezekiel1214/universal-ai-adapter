import express from 'express';
import { UniversalAIAdapter } from '../src/index.js';

const app = express();
app.use(express.json());

// Initialize adapter with free Ollama
const adapter = new UniversalAIAdapter({
  provider: 'ollama',
  enableFallback: true,
  verbose: true,
  providers: {
    ollama: {
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.2'
    },
    openai: process.env.OPENAI_API_KEY ? {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview'
    } : undefined
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, temperature, maxTokens } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const response = await adapter.chat({
      messages,
      temperature,
      maxTokens
    });

    res.json(response);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple chat endpoint
app.post('/api/simple-chat', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt required' });
    }

    const response = await adapter.simpleChat(prompt, systemPrompt);
    res.json({ response });
  } catch (error: any) {
    console.error('Simple chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Provider status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const current = adapter.getCurrentProvider();
    const statuses = await adapter.getProviderStatuses();
    
    res.json({
      current,
      allProviders: statuses
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Switch provider endpoint
app.post('/api/switch-provider', (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'provider required' });
    }

    adapter.switchProvider(provider);
    const current = adapter.getCurrentProvider();
    
    res.json({ success: true, current });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 AI Provider: ${adapter.getCurrentProvider().provider}`);
  console.log('\nEndpoints:');
  console.log('  POST /api/chat - Full chat with tools');
  console.log('  POST /api/simple-chat - Simple text chat');
  console.log('  GET /api/status - Provider health');
  console.log('  POST /api/switch-provider - Change provider');
});
