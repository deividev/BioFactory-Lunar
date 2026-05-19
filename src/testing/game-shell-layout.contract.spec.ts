import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, '../..');

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

function extractRule(styles: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[\\s\\S]*?)\\n\\}`, 'm'));

  return match?.groups?.['body'] ?? '';
}

const gameShellStyles = readWorkspaceFile('src/app/layout/game-shell/game-shell.scss');

describe('game shell layout contract', () => {
  it('keeps the active sidebar panel scrollable when module content exceeds the viewport', () => {
    const panelHostRule = extractRule(gameShellStyles, '.game-shell__panel-host');

    expect(panelHostRule).toContain('min-height: 0;');
    expect(panelHostRule).toContain('overflow-x: hidden;');
    expect(panelHostRule).toContain('overflow-y: auto;');
    expect(panelHostRule).toContain('overscroll-behavior: contain;');
    expect(gameShellStyles).toContain('scrollbar-width: thin;');
    expect(gameShellStyles).toMatch(/\.game-shell__panel-host\s*>\s*app-storage[\s\S]*min-height:\s*100%;/);
  });
});
