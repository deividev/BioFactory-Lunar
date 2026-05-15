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
import { MainBaseScene } from './main-base.scene';

describe('MainBaseScene visual placeholder', () => {
  it('draws the lunar base placeholder using scene dimensions', () => {
    const scene = new MainBaseScene() as unknown as {
      scale: { width: number; height: number };
      add: {
        rectangle(...args: unknown[]): void;
        circle(...args: unknown[]): void;
        text(...args: unknown[]): { setOrigin(origin: number): void };
      };
      create(): void;
    };
    const calls: string[] = [];

    scene.scale = { width: 1920, height: 1080 };
    scene.add = {
      rectangle: (...args: unknown[]) => calls.push(`rectangle:${args.join('|')}`),
      circle: (...args: unknown[]) => calls.push(`circle:${args.join('|')}`),
      text: (...args: unknown[]) => {
        calls.push(`text:${args[0]}|${args[1]}|${args[2]}`);
        return { setOrigin: (origin: number) => calls.push(`origin:${origin}`) };
      }
    };

    scene.create();

    expect(calls).toContain('rectangle:960|540|1920|1080|132876');
    expect(calls).toContain('circle:1459.2|259.2|56|10149874|0.25');
    expect(calls).toContain('text:960|518.4|Biofactory: Lunar visual placeholder');
    expect(calls).toContain('origin:0.5');
  });
});
