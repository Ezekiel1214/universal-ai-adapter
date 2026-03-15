import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { spawn, type ChildProcessByStdio } from 'child_process';
import { createServer, type Server } from 'http';
import { once } from 'events';
import type { Readable } from 'stream';

interface ProvidersResponse {
  providers: Array<{ provider: string }>;
}

interface ProviderDetailResponse {
  provider: { provider: string; defaultModel: string };
  defaults: { model: string };
  models: string[];
}

interface ErrorResponse {
  error: string;
}

interface HealthResponse {
  status: string;
  features: unknown;
}

interface ChatResponse {
  content: string;
  vpnRouted?: boolean;
}

interface CompareResponse {
  results: Array<{
    provider: string;
    success: boolean;
    content?: string;
    vpnRouted?: boolean;
  }>;
}

let serverProcess: ChildProcessByStdio<null, Readable, Readable> | undefined;
let baseUrl = '';

jest.setTimeout(30000);

async function waitForServerUrl(
  processRef: ChildProcessByStdio<null, Readable, Readable>,
): Promise<string> {
  return await new Promise((resolve, reject) => {
    let stderr = '';

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Server did not start within timeout. ${stderr}`));
    }, 15000);

    const handleStdout = (chunk: Buffer): void => {
      const output = chunk.toString();
      const match = output.match(/Server running at http:\/\/localhost:(\d+)/);
      if (match) {
        cleanup();
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    };

    const handleStderr = (chunk: Buffer): void => {
      stderr += chunk.toString();
    };

    const handleExit = (code: number | null): void => {
      cleanup();
      reject(new Error(`Server exited before startup (code: ${code}) ${stderr}`));
    };

    const cleanup = (): void => {
      clearTimeout(timer);
      processRef.stdout.off('data', handleStdout);
      processRef.stderr.off('data', handleStderr);
      processRef.off('exit', handleExit);
    };

    processRef.stdout.on('data', handleStdout);
    processRef.stderr.on('data', handleStderr);
    processRef.on('exit', handleExit);
  });
}

async function createProxyServer(
  handler: (payload: Record<string, unknown>) => Record<string, unknown>,
): Promise<{ server: Server; url: string; requests: Array<Record<string, unknown>> }> {
  const requests: Array<Record<string, unknown>> = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const payload = rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {};
      requests.push(payload);

      const response = handler(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Proxy server failed to bind to a port');
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    requests,
  };
}

async function closeProxyServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

beforeAll(async () => {
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '0',
      NODE_OPTIONS: '',
      JEST_WORKER_ID: undefined,
      TS_JEST: undefined,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  baseUrl = await waitForServerUrl(serverProcess);
});

afterAll(async () => {
  if (!serverProcess || serverProcess.exitCode !== null || serverProcess.killed) {
    return;
  }

  serverProcess.kill('SIGTERM');
  await once(serverProcess, 'exit');
});

describe('server routes', () => {
  it('should return provider metadata', async () => {
    const response = await fetch(`${baseUrl}/api/providers`);
    const data = await response.json() as ProvidersResponse;

    expect(response.status).toBe(200);
    expect(Array.isArray(data.providers)).toBe(true);
    expect(data.providers.length).toBeGreaterThan(0);
    expect(data.providers.some((provider) => provider.provider === 'openai')).toBe(true);
  });

  it('should return a specific provider definition', async () => {
    const response = await fetch(`${baseUrl}/api/providers/openai`);
    const data = await response.json() as ProviderDetailResponse;

    expect(response.status).toBe(200);
    expect(data.provider.provider).toBe('openai');
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.defaults.model).toBe(data.provider.defaultModel);
  });

  it('should reject invalid chat payloads', async () => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', messages: [] }),
    });
    const data = await response.json() as ErrorResponse;

    expect(response.status).toBe(400);
    expect(data.error).toContain('messages');
  });

  it('should reject invalid providers in compare requests', async () => {
    const response = await fetch(`${baseUrl}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello', providers: ['not-a-provider'] }),
    });
    const data = await response.json() as ErrorResponse;

    expect(response.status).toBe(400);
    expect(data.error).toContain('Unsupported providers');
  });

  it('should expose health information', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json() as HealthResponse;

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.features).toBeDefined();
  });

  it('should route chat requests through the configured proxy when vpn mode is enabled', async () => {
    const proxy = await createProxyServer((payload) => ({
      content: 'proxied chat response',
      model: 'proxy-model',
      usage: { totalTokens: 12 },
      echoedProvider: payload.provider,
    }));

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'openai',
          apiKey: 'sk-test',
          vpnEnabled: true,
          proxyUrl: proxy.url,
          messages: [{ role: 'user', content: 'Hello through proxy' }],
        }),
      });
      const data = await response.json() as ChatResponse;

      expect(response.status).toBe(200);
      expect(data.content).toBe('proxied chat response');
      expect(data.vpnRouted).toBe(true);
      expect(proxy.requests).toHaveLength(1);
      expect(proxy.requests[0].provider).toBe('openai');
      expect(proxy.requests[0].apiKey).toBe('sk-test');
    } finally {
      await closeProxyServer(proxy.server);
    }
  });

  it('should route compare requests through the configured proxy when vpn mode is enabled', async () => {
    const proxy = await createProxyServer((payload) => ({
      content: `proxied:${payload.provider}`,
      model: 'proxy-model',
      usage: { totalTokens: 8 },
    }));

    try {
      const response = await fetch(`${baseUrl}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Compare over proxy',
          providers: ['openai', 'anthropic'],
          vpnEnabled: true,
          proxyUrl: proxy.url,
          apiKeys: {
            openai: 'sk-openai',
            anthropic: 'sk-anthropic',
          },
        }),
      });
      const data = await response.json() as CompareResponse;

      expect(response.status).toBe(200);
      expect(proxy.requests).toHaveLength(2);
      expect(data.results).toHaveLength(2);
      expect(data.results.every((result) => result.success)).toBe(true);
      expect(data.results.every((result) => result.vpnRouted)).toBe(true);
      expect(data.results.map((result) => result.content)).toEqual(['proxied:openai', 'proxied:anthropic']);
    } finally {
      await closeProxyServer(proxy.server);
    }
  });
});
