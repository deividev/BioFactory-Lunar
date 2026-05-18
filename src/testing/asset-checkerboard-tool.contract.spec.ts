import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('checkerboard background removal tooling', () => {
  it('exposes a package script that can remove fake PNG transparency backgrounds', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['assets:strip-checkerboard']).toBe(
      'node scripts/strip-checkerboard-background.mjs',
    );
  });

  it('passes its built-in PNG alpha self-test', () => {
    const output = execFileSync(process.execPath, ['scripts/strip-checkerboard-background.mjs', '--self-test'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toContain('Self-test passed');
  });
});
