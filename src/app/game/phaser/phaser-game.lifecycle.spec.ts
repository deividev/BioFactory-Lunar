import { EMPTY } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhaserGameLifecycle } from './phaser-game.lifecycle';
import type { PhaserSceneBridge } from './scenes/main-base.scene';

const sceneBridge: PhaserSceneBridge = {
  angularEvents$: EMPTY,
  emitFromPhaser: () => undefined
};

describe('PhaserGameLifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts one Phaser instance for a host element with the scene bridge and prevents duplicate startup', () => {
    const created: string[] = [];
    const lifecycle = new PhaserGameLifecycle((parent, bridge) => {
      created.push(`${parent}:${String(bridge === sceneBridge)}`);
      return { destroy: () => undefined };
    }, sceneBridge);

    lifecycle.start('phaser-container');
    lifecycle.start('phaser-container');

    expect(created).toEqual(['phaser-container:true']);
    expect(lifecycle.isRunning()).toBe(true);
  });

  it('clears stale host children before creating a Phaser instance', () => {
    const calls: string[] = [];

    vi.stubGlobal('document', {
      getElementById: (id: string) => ({
        replaceChildren: () => {
          calls.push(`clear:${id}`);
        }
      })
    });

    const lifecycle = new PhaserGameLifecycle((parent) => {
      calls.push(`create:${parent}`);
      return { destroy: () => undefined };
    }, sceneBridge);

    lifecycle.start('phaser-container');
    lifecycle.start('phaser-container');

    expect(calls).toEqual(['clear:phaser-container', 'create:phaser-container']);
  });

  it('destroys the active Phaser instance when stopped', () => {
    let destroyed = 0;
    const lifecycle = new PhaserGameLifecycle(() => ({
      destroy: () => {
        destroyed += 1;
      }
    }), sceneBridge);

    lifecycle.start('phaser-container');
    lifecycle.stop();
    lifecycle.stop();

    expect(destroyed).toBe(1);
    expect(lifecycle.isRunning()).toBe(false);
  });
});
