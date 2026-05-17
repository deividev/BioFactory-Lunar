import { vi } from 'vitest';

const gameConstructor = vi.fn();
const createPhaserGameConfigMock = vi.fn((parent: string, sceneBridge: unknown) => ({
  parent,
  sceneBridge,
  marker: 'config'
}));

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
  createPhaserGameConfig: (parent: string, sceneBridge: unknown) => createPhaserGameConfigMock(parent, sceneBridge)
}));

import { describe, expect, it } from 'vitest';
import { EMPTY } from 'rxjs';
import { createDefaultPhaserGame } from './phaser-game.factory';
import type { PhaserSceneBridge } from './scenes/main-base.scene';

describe('createDefaultPhaserGame', () => {
  it('creates a Phaser Game instance with the config built for the host element and scene bridge', () => {
    const sceneBridge: PhaserSceneBridge = {
      angularEvents$: EMPTY,
      emitFromPhaser: () => undefined
    };
    const game = createDefaultPhaserGame('phaser-container', sceneBridge);

    expect(createPhaserGameConfigMock).toHaveBeenCalledWith('phaser-container', sceneBridge);
    expect(gameConstructor).toHaveBeenCalledWith({ parent: 'phaser-container', sceneBridge, marker: 'config' });
    expect(game).toBeInstanceOf(Object);
  });
});
