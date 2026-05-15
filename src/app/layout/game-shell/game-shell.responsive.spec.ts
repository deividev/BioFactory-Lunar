import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function readSiblingFile(relativePath: string): string {
  return readFileSync(path.join(currentDir, relativePath), 'utf8');
}

describe('game shell responsive styling contract', () => {
  it('allows the shell to adapt the HUD and stage layout for narrow or short viewports', () => {
    const shellStyles = readSiblingFile('./game-shell.scss');
    const globalStyles = readSiblingFile('../../../styles.scss');

    expect(shellStyles).toContain('flex-wrap: wrap;');
    expect(shellStyles).toMatch(/@media\s*\(max-width:\s*720px\)/);
    expect(shellStyles).toMatch(/@media\s*\(max-height:\s*720px\)/);
    expect(shellStyles).toContain('padding: clamp(');

    expect(globalStyles).toContain('overflow-x: hidden;');
    expect(globalStyles).toContain('overflow-y: auto;');
  });

  it('keeps the Phaser host inside a responsive 16:9 frame instead of forcing a fixed desktop canvas width', () => {
    const phaserStyles = readSiblingFile('../../game/phaser/phaser-game.scss');

    expect(phaserStyles).toContain('aspect-ratio: 16 / 9;');
    expect(phaserStyles).toContain('max-width: 100%;');
    expect(phaserStyles).toContain('width: min(100%,');
    expect(phaserStyles).toContain('height: auto !important;');
  });
});