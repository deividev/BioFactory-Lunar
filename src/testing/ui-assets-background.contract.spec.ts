import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('UI asset background contract', () => {
  it('keeps runtime UI assets free of edge-connected fake checkerboard backgrounds', () => {
    const output = execFileSync(
      process.execPath,
      [
        'scripts/strip-checkerboard-background.mjs',
        '--input',
        'src/assets/ui',
        '--output',
        'production-assets/edited/_dry_run_ui_contract',
        '--dry-run',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    const assetsWithRemovableBackground = output.split(/\r?\n/).filter((line) => /:\s*[1-9]\d*\//.test(line));

    expect(assetsWithRemovableBackground).toEqual([]);
  });
});
