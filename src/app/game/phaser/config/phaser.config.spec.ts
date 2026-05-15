import { describe, expect, it } from 'vitest';
import { createPhaserGameOptions, PHASER_GAME_SIZE } from './phaser.options';

describe('Phaser game options', () => {
  it('creates a 16:9 visual-only placeholder config for the Angular host', () => {
    const config = createPhaserGameOptions('phaser-container');

    expect(PHASER_GAME_SIZE).toEqual({ width: 1920, height: 1080 });
    expect(config.parent).toBe('phaser-container');
    expect(config.width).toBe(1920);
    expect(config.height).toBe(1080);
    expect(config.backgroundColor).toBe('#02070c');
    expect(config.scale).toEqual({ mode: 'FIT', autoCenter: 'CENTER_BOTH' });
  });

  it('does not configure gameplay state, economy, inventory, contracts, or saves', () => {
    const config = createPhaserGameOptions('phaser-container');

    expect(config).not.toHaveProperty('gameState');
    expect(config).not.toHaveProperty('inventory');
    expect(config).not.toHaveProperty('contracts');
    expect(config).not.toHaveProperty('saveData');
  });
});
