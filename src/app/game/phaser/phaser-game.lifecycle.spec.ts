import { describe, expect, it } from 'vitest';
import { PhaserGameLifecycle } from './phaser-game.lifecycle';

describe('PhaserGameLifecycle', () => {
  it('starts one Phaser instance for a host element and prevents duplicate startup', () => {
    let created = 0;
    const lifecycle = new PhaserGameLifecycle(() => {
      created += 1;
      return { destroy: () => undefined };
    });

    lifecycle.start('phaser-container');
    lifecycle.start('phaser-container');

    expect(created).toBe(1);
    expect(lifecycle.isRunning()).toBe(true);
  });

  it('destroys the active Phaser instance when stopped', () => {
    let destroyed = 0;
    const lifecycle = new PhaserGameLifecycle(() => ({
      destroy: () => {
        destroyed += 1;
      }
    }));

    lifecycle.start('phaser-container');
    lifecycle.stop();
    lifecycle.stop();

    expect(destroyed).toBe(1);
    expect(lifecycle.isRunning()).toBe(false);
  });
});
