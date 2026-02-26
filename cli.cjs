const axios = require('axios');

const args = process.argv.slice(2);

async function chatWithOllama(baseURL, model, message) {
  const response = await axios.post(`${baseURL}/api/chat`, {
    model: model,
    messages: [{ role: 'user', content: message }],
    stream: false
  });
  return response.data.message.content;
}

async function checkOllamaStatus(baseURL) {
  try {
    const response = await axios.get(`${baseURL}/api/tags`);
    return { available: true, models: response.data.models };
  } catch {
    return { available: false, models: [] };
  }
}

async function main() {
  if (args.length === 0) {
    console.log('\n🤖 Universal AI Adapter CLI (Ollama Only)\n');
    console.log('Usage:');
    console.log('  ai-adapter chat <baseURL> <model> <message>');
    console.log('  ai-adapter status <baseURL>');
    console.log('\nExamples:');
    console.log('  ai-adapter chat http://localhost:11434 llama3.2 "Hello"');
    console.log('  ai-adapter status http://localhost:11434');
    process.exit(0);
  }

  const command = args[0];

  if (command === 'chat') {
    const baseURL = args[1] || 'http://localhost:11434';
    const model = args[2] || 'llama3.2';
    const message = args[3] || 'Hello!';

    console.log(`\n🤖 Chatting with Ollama (${model})...\n`);

    try {
      const response = await chatWithOllama(baseURL, model, message);
      console.log('📥 Response:');
      console.log('-'.repeat(40));
      console.log(response);
      console.log('-'.repeat(40));
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } 
  else if (command === 'status') {
    const baseURL = args[1] || 'http://localhost:11434';

    console.log(`\n📊 Checking Ollama status...\n`);

    try {
      const result = await checkOllamaStatus(baseURL);
      if (result.available) {
        console.log('✅ Ollama is available');
        console.log('\n📦 Available models:');
        result.models.forEach(m => console.log(`  - ${m.name}`));
      } else {
        console.log('❌ Ollama is not available');
      }
    } catch (error) {
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
