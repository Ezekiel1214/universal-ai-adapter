import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { spawn, type ChildProcessByStdio } from 'child_process';
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
});
