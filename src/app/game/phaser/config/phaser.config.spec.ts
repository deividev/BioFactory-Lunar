import { vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    AUTO: 'AUTO',
    Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
    Scene: class MockScene {
      constructor(readonly key?: string) {}
    },
    Game: class MockGame {}
  }
}));

import { describe, expect, it } from 'vitest';
import { MainBaseScene } from '../scenes/main-base.scene';
import { createPhaserGameConfig } from './phaser.config';
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

  it('adapts pure Phaser options into the visual scene runtime config', () => {
    const config = createPhaserGameConfig('phaser-container');

    expect(config.parent).toBe('phaser-container');
    expect(config.width).toBe(1920);
    expect(config.height).toBe(1080);
    expect(config.backgroundColor).toBe('#02070c');
    expect(config.scene).toEqual([MainBaseScene]);
  });
});
