import { describe, test, expect } from '@jest/globals';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { UnifiedAIService } from '../unified-api';

const execFileAsync = promisify(execFile);
const cliPath = join(process.cwd(), 'cli.mjs');
const packageJsonPath = join(process.cwd(), 'package.json');

describe('CLI entrypoint', () => {
  test('prints the current package version', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { version: string };
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, '--version'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
      maxBuffer: 1024 * 1024,
    });

    expect(stderr).toBe('');
    expect(stdout.trim()).toBe(packageJson.version);
  });

  test('shows the current provider registry in help output', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { version: string };
    const { stdout } = await execFileAsync(process.execPath, [cliPath, '--help'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
      maxBuffer: 1024 * 1024,
    });

    expect(stdout).toContain(`Universal AI Adapter CLI v${packageJson.version}`);
    UnifiedAIService.listProviders().forEach((provider) => {
      expect(stdout).toContain(provider.provider);
    });
  });

  test('lists models for newer providers like kimi', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'models', 'kimi'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
      maxBuffer: 1024 * 1024,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('kimi:');
    expect(stdout).toContain('kimi-k2.5');
  });
});
