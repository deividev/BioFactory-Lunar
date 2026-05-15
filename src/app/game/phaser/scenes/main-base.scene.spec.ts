import { vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    AUTO: 'AUTO',
    Scale: { RESIZE: 'RESIZE', CENTER_BOTH: 'CENTER_BOTH' },
    Scene: class MockScene {
      constructor(readonly key?: string) {}
    },
    Game: class MockGame {}
  }
}));

import { describe, expect, it } from 'vitest';
import { MainBaseScene } from './main-base.scene';

describe('MainBaseScene visual placeholder', () => {
  it('loads the temporary runtime background once and resizes it with the scene', () => {
    const scene = new MainBaseScene() as unknown as {
      textures: {
        exists(key: string): boolean;
      };
      load: {
        image(key: string, path: string): void;
      };
      scale: {
        width: number;
        height: number;
        on(event: string, handler: (gameSize: { width: number; height: number }) => void, context: unknown): void;
      };
      add: {
        image(...args: unknown[]): {
          setPosition(x: number, y: number): unknown;
          setDisplaySize(width: number, height: number): unknown;
        };
      };
      preload(): void;
      create(): void;
    };
    const calls: string[] = [];
    const resizeHandlers: Array<(gameSize: { width: number; height: number }) => void> = [];

    const background = {
      setPosition: (x: number, y: number) => {
        calls.push(`background-position:${x}|${y}`);
        return background;
      },
      setDisplaySize: (width: number, height: number) => {
        calls.push(`background-display-size:${width}|${height}`);
        return background;
      }
    };

    scene.textures = {
      exists: (key: string) => {
        calls.push(`texture-exists:${key}`);
        return false;
      }
    };
    scene.load = {
      image: (key: string, path: string) => {
        calls.push(`load-image:${key}|${path}`);
      }
    };

    scene.scale = {
      width: 1920,
      height: 1080,
      on: (event: string, handler: (gameSize: { width: number; height: number }) => void, context: unknown) => {
        calls.push(`scale-on:${event}`);
        resizeHandlers.push((gameSize: { width: number; height: number }) => {
          handler.call(context, gameSize);
        });
      }
    };
    scene.add = {
      image: (...args: unknown[]) => {
        calls.push(`image-add:${args.join('|')}`);
        return background;
      }
    };

    scene.preload();
    scene.create();

    if (resizeHandlers[0] !== undefined) {
      resizeHandlers[0]({ width: 900, height: 600 });
    }

    expect(calls).toContain('texture-exists:main-base-background');
    expect(calls).toContain('load-image:main-base-background|assets/backgrounds/bg_lunar_prototype.png');
    expect(calls).toContain('image-add:0|0|main-base-background');
    expect(calls).toContain('background-position:960|540');
    expect(calls).toContain('background-display-size:1920|1080');
    expect(calls).toContain('scale-on:resize');
    expect(calls).toContain('background-position:450|300');
    expect(calls).toContain('background-display-size:900|600');
  });

  it('skips reloading the temporary background when the texture is already cached', () => {
    const scene = new MainBaseScene() as unknown as {
      textures: {
        exists(key: string): boolean;
      };
      load: {
        image(key: string, path: string): void;
      };
      preload(): void;
    };
    const calls: string[] = [];

    scene.textures = {
      exists: (key: string) => {
        calls.push(`texture-exists:${key}`);
        return true;
      }
    };
    scene.load = {
      image: (key: string, path: string) => {
        calls.push(`load-image:${key}|${path}`);
      }
    };

    scene.preload();

    expect(calls).toEqual(['texture-exists:main-base-background']);
  });
});
