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
    const hudStyles = readSiblingFile('../hud-top/hud-top.scss');
    const globalStyles = readSiblingFile('../../../styles.scss');

    expect(hudStyles).toContain('flex-wrap: wrap;');
    expect(hudStyles).toMatch(/@media\s*\(max-width:\s*720px\)/);
    expect(hudStyles).toMatch(/@media\s*\(max-height:\s*720px\)/);
    expect(shellStyles).toContain('height: 100dvh;');
    expect(shellStyles).toContain('padding: 0;');
    expect(shellStyles).toContain('.game-shell > app-hud-top');
    expect(shellStyles).toContain('.game-shell__body > app-storage');
    expect(shellStyles).toMatch(/@media\s*\(max-width:\s*960px\)/);
    expect(shellStyles).toContain('.stage > app-phaser-game');
    expect(shellStyles).toContain('overflow: hidden;');

    expect(globalStyles).toContain('overflow-x: hidden;');
    expect(globalStyles).toContain('overflow-y: auto;');
  });

  it('makes the Phaser host consume the remaining viewport under the header responsively', () => {
    const phaserStyles = readSiblingFile('../../game/phaser/phaser-game.scss');

    expect(phaserStyles).toContain('width: 100%;');
    expect(phaserStyles).toContain('height: 100%;');
    expect(phaserStyles).toContain('max-height: 100%;');
    expect(phaserStyles).toContain('height: 100% !important;');
  });
});

