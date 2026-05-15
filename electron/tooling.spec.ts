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

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(path.join(workspaceDir, relativePath), 'utf8');
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

  it('declares pnpm-compatible coverage commands and providers', () => {
    const packageJson = readJsonFile<PackageJsonShape>('package.json');
    const scripts = packageJson.scripts ?? {};

    expect(scripts['test:unit:coverage']).toContain('vitest run --coverage');
    expect(scripts['test:unit:coverage']).toContain('coverage/unit');
    expect(scripts['test:angular:coverage']).toBe('ng test --watch=false --coverage');
    expect(scripts['test:coverage']).toContain('pnpm test:unit:coverage && pnpm test:angular:coverage');
    expect(scripts['test:coverage']).toContain('node scripts/enforce-coverage-thresholds.mjs');
    expect(scripts['test:coverage']).not.toMatch(/(^|[;&|]\s*)npm(\s|$)/);
    expect(packageJson.devDependencies).toMatchObject({
      '@vitest/coverage-v8': expect.any(String)
    });
  });

  it('enforces 90 percent coverage thresholds in Vitest config', () => {
    const vitestConfig = readWorkspaceFile('vitest.config.ts');

    expect(vitestConfig).toContain("provider: 'v8'");
    expect(vitestConfig).toMatch(/statements:\s*90/);
    expect(vitestConfig).toMatch(/branches:\s*90/);
    expect(vitestConfig).toMatch(/functions:\s*90/);
    expect(vitestConfig).toMatch(/lines:\s*90/);
  });

  it('advertises Angular integration testing and the coverage gate in OpenSpec config', () => {
    const openspecConfig = readWorkspaceFile('openspec/config.yaml');

    expect(openspecConfig).toMatch(/integration:\s*\{\s*available:\s*true,\s*tool:\s*"Angular TestBed via ng test",\s*command:\s*"pnpm test:angular"\s*\}/);
    expect(openspecConfig).toMatch(/coverage:\s*\r?\n\s*available:\s*true/);
    expect(openspecConfig).toContain('command: "pnpm test:coverage"');
    expect(openspecConfig).toContain('coverage_threshold: 90');
  });
});
