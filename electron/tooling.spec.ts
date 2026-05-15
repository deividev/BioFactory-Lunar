import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface PackageJsonShape {
  readonly scripts?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(currentDir, '..');

function readJsonFile<T>(relativePath: string): T {
  const filePath = path.join(workspaceDir, relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

describe('Electron tooling contract', () => {
  it('declares the secure Electron development toolchain in package.json', () => {
    const packageJson = readJsonFile<PackageJsonShape>('package.json');

    expect(packageJson.devDependencies).toMatchObject({
      electron: expect.any(String),
      concurrently: expect.any(String),
      'cross-env': expect.any(String),
      nodemon: expect.any(String),
      'wait-on': expect.any(String)
    });
  });

  it('uses pnpm-only scripts for IPv4-safe Angular plus Electron development', () => {
    const packageJson = readJsonFile<PackageJsonShape>('package.json');
    const scripts = packageJson.scripts ?? {};

    expect(scripts['build']).toContain('ng build');
    expect(scripts['build']).toContain('--base-href ./');

    expect(scripts['dev']).toContain('ng serve');
    expect(scripts['dev']).toContain('--host 127.0.0.1');
    expect(scripts['dev']).toContain('--port 4200');

    expect(scripts['electron:wait']).toContain('wait-on http://127.0.0.1:4200');
    expect(scripts['electron:wait']).toContain('BIOFACTORY_DEV_SERVER_URL=http://127.0.0.1:4200');
    expect(scripts['electron:wait']).toContain('electron .');

    expect(scripts['electron:watch']).toContain('tsc -p tsconfig.electron.json --watch');
    expect(scripts['electron:serve']).toContain('nodemon');
    expect(scripts['electron:serve']).toContain('dist-electron/electron');
    expect(scripts['electron:serve']).toContain('--delay');

    expect(scripts['electron:dev']).toContain('concurrently');
    expect(scripts['electron:dev']).toContain('pnpm dev');
    expect(scripts['electron:dev']).toContain('pnpm electron:watch');
    expect(scripts['electron:dev']).toContain('pnpm electron:serve');

    expect(scripts['electron:smoke']).toContain('pnpm build');
    expect(scripts['electron:smoke']).toContain('pnpm electron:build');
    expect(scripts['electron:smoke']).toContain('electron .');
  });
});