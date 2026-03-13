#!/usr/bin/env node

const { exec } = require('child_process');

const args = process.argv.slice(2);
const argSet = new Set(args);

function parsePort() {
  const flagIndex = args.findIndex((arg) => arg === '--port');
  if (flagIndex >= 0 && args[flagIndex + 1]) {
    const parsed = Number(args[flagIndex + 1]);
    if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) {
      return parsed;
    }
  }

  const envPort = Number(process.env.PORT || '3000');
  if (Number.isInteger(envPort) && envPort > 0 && envPort < 65536) {
    return envPort;
  }

  return 3000;
}

function showHelp() {
  console.log('\nUniversal AI Adapter Launcher\n');
  console.log('Usage:');
  console.log('  universal-ai-adapter.exe');
  console.log('  universal-ai-adapter.exe --port 3000');
  console.log('  universal-ai-adapter.exe --no-open');
  console.log('  universal-ai-adapter.exe --help\n');
  console.log('Options:');
  console.log('  --port <number>  Start the web app on a specific port');
  console.log('  --no-open        Do not open the browser automatically');
  console.log('  --help           Show this help message\n');
}

function openBrowser(url) {
  if (argSet.has('--no-open')) {
    return;
  }

  const escapedUrl = url.replace(/"/g, '\\"');
  const platform = process.platform;

  if (platform === 'win32') {
    exec(`start "" "${escapedUrl}"`);
    return;
  }

  if (platform === 'darwin') {
    exec(`open "${escapedUrl}"`);
    return;
  }

  exec(`xdg-open "${escapedUrl}"`);
}

async function main() {
  if (argSet.has('--help') || argSet.has('-h')) {
    showHelp();
    return;
  }

  const port = parsePort();
  process.env.PORT = String(port);

  const { startServer } = await import('./apps/server/src/main.js');
  const server = await startServer(port);
  const actualPort = server.address().port;
  const url = `http://localhost:${actualPort}`;

  console.log('Universal AI Adapter');
  console.log('====================');
  console.log(`Server running at ${url}`);
  if (argSet.has('--no-open')) {
    console.log('Browser launch disabled via --no-open');
  } else {
    console.log('Opening browser...');
    openBrowser(url);
  }
  console.log('Press Ctrl+C to stop.');

  const shutdown = () => {
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start Universal AI Adapter:', error.message);
  process.exit(1);
});
