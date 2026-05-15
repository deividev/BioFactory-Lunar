import { vi } from 'vitest';

const gameConstructor = vi.fn();
const createPhaserGameConfigMock = vi.fn((parent: string) => ({ parent, marker: 'config' }));

vi.mock('phaser', () => ({
  default: {
    Game: class MockGame {
      constructor(config: unknown) {
        gameConstructor(config);
      }
    }
  }
}));

vi.mock('./config/phaser.config', () => ({
  createPhaserGameConfig: (parent: string) => createPhaserGameConfigMock(parent)
}));

import { describe, expect, it } from 'vitest';
import { createDefaultPhaserGame } from './phaser-game.factory';

describe('createDefaultPhaserGame', () => {
  it('creates a Phaser Game instance with the config built for the provided host element', () => {
    const game = createDefaultPhaserGame('phaser-container');

    expect(createPhaserGameConfigMock).toHaveBeenCalledWith('phaser-container');
    expect(gameConstructor).toHaveBeenCalledWith({ parent: 'phaser-container', marker: 'config' });
    expect(game).toBeInstanceOf(Object);
  });
});