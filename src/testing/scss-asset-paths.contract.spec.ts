import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function listScssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listScssFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.scss') ? [entryPath] : [];
  });
}

describe('SCSS asset path contract', () => {
  it('avoids root-absolute /assets URLs that break under Electron file:// builds', () => {
    const scssFiles = listScssFiles(join(process.cwd(), 'src'));
    const offenders = scssFiles.filter((filePath) => {
      const content = readFileSync(filePath, 'utf8');

      return /url\((['"])\/assets\//.test(content);
    });

    expect(offenders).toEqual([]);
  });

  it('panel feature SCSS files do not reference PNG frame assets (milestone-15 CSS-first contract)', () => {
    const scssFiles = listScssFiles(join(process.cwd(), 'src'));
    const panelFramePattern = /url\(['"]?[^)]*assets\/ui\/frames\/panels\/[^)]*\.png['"]?\)/;
    const offenders = scssFiles
      .filter((filePath) => {
        const content = readFileSync(filePath, 'utf8');

        return panelFramePattern.test(content);
      })
      .map((filePath) => filePath.replace(process.cwd(), '').replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });
});