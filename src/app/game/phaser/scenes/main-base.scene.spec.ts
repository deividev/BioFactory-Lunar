import { Subject } from 'rxjs';
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
import type { AngularToPhaserEvent, PhaserToAngularEvent } from '../../bridge';
import { MainBaseScene, type PhaserSceneBridge } from './main-base.scene';

interface ModuleRectangleHarness {
  data: Record<string, unknown>;
  handlers: Record<string, () => void>;
  interactive: number;
  strokes: string[];
}

interface SceneImageHarness {
  readonly key: string;
  readonly displaySizes: string[];
  readonly positions: string[];
  readonly tints: string[];
}

function createModuleScene(): {
  commands: Subject<AngularToPhaserEvent>;
  emitted: PhaserToAngularEvent[];
  images: SceneImageHarness[];
  rectangles: ModuleRectangleHarness[];
  scene: { create(): void };
} {
  const commands = new Subject<AngularToPhaserEvent>();
  const emitted: PhaserToAngularEvent[] = [];
  const images: SceneImageHarness[] = [];
  const rectangles: ModuleRectangleHarness[] = [];
  const bridge: PhaserSceneBridge = {
    angularEvents$: commands.asObservable(),
    emitFromPhaser: (event) => emitted.push(event),
  };
  const scene = new MainBaseScene(bridge) as any;
  const textChain = { setDepth: () => textChain, setOrigin: () => textChain, setPosition: () => textChain };

  scene.textures = { exists: () => true };
  scene.load = { image: () => undefined };
  scene.scale = { width: 1920, height: 1080, on: () => undefined };
  scene.events = { once: () => undefined };
  scene.add = {
    image: (_x: number, _y: number, key: string) => {
      const image = {
        key,
        displaySizes: [] as string[],
        positions: [] as string[],
        tints: [] as string[],
        clearTint: () => {
          image.tints.push('clear');
          return image;
        },
        setAlpha: () => image,
        setDepth: () => image,
        setDisplaySize: (width: number, height: number) => {
          image.displaySizes.push(`${width}|${height}`);
          return image;
        },
        setOrigin: () => image,
        setPosition: (x: number, y: number) => {
          image.positions.push(`${x}|${y}`);
          return image;
        },
        setTint: (color: number) => {
          image.tints.push(String(color));
          return image;
        }
      };
      images.push(image);
      return image;
    },
    text: () => textChain,
    rectangle: () => {
      const rectangle = {
        data: {} as Record<string, unknown>,
        handlers: {} as Record<string, () => void>,
        interactive: 0,
        strokes: [] as string[],
        on: (event: string, handler: () => void) => {
          rectangle.handlers[event] = handler;
          return rectangle;
        },
        setData: (key: string, value: unknown) => {
          rectangle.data[key] = value;
          return rectangle;
        },
        setDepth: () => rectangle,
        setDisplaySize: () => rectangle,
        setFillStyle: () => rectangle,
        setInteractive: () => {
          rectangle.interactive += 1;
          return rectangle;
        },
        setOrigin: () => rectangle,
        setPosition: () => rectangle,
        setStrokeStyle: (width: number, color: number, alpha: number) => {
          rectangle.strokes.push(`${width}|${color}|${alpha}`);
          return rectangle;
        },
      };
      rectangles.push(rectangle);
      return rectangle;
    },
  };

  return { commands, emitted, images, rectangles, scene };
}

describe('MainBaseScene visual placeholder', () => {
  it('preloads the style spike background layers and module assets from stable runtime paths', () => {
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
        return false;
      }
    };
    scene.load = {
      image: (key: string, path: string) => {
        calls.push(`load-image:${key}|${path}`);
      }
    };

    scene.preload();

    expect(calls).toEqual([
      'texture-exists:bg_sky_base',
      'load-image:bg_sky_base|assets/phaser/backgrounds/lunar/bg_sky_base.png',
      'texture-exists:bg_stars_far',
      'load-image:bg_stars_far|assets/phaser/backgrounds/lunar/bg_stars_far.png',
      'texture-exists:bg_earth',
      'load-image:bg_earth|assets/phaser/backgrounds/lunar/bg_earth.png',
      'texture-exists:bg_lunar_ground',
      'load-image:bg_lunar_ground|assets/phaser/backgrounds/lunar/bg_lunar_ground.png',
      'texture-exists:bg_platform_front',
      'load-image:bg_platform_front|assets/phaser/backgrounds/lunar/bg_platform_front.png',
      'texture-exists:module_command_center',
      'load-image:module_command_center|assets/phaser/modules/module_command_center.png',
      'texture-exists:module_greenhouse_basic',
      'load-image:module_greenhouse_basic|assets/phaser/modules/module_greenhouse_basic.png',
      'texture-exists:module_processing',
      'load-image:module_processing|assets/phaser/modules/module_processing.png',
      'texture-exists:module_shipping_hangar',
      'load-image:module_shipping_hangar|assets/phaser/modules/module_shipping_hangar.png',
      'texture-exists:module_storage',
      'load-image:module_storage|assets/phaser/modules/module_storage.png'
    ]);
  });

  it('resizes the style spike background layers with the scene', () => {
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
      events: {
        once(event: string, handler: () => void, context?: unknown): void;
      };
      add: {
        image(...args: unknown[]): {
          setPosition(x: number, y: number): unknown;
          setDisplaySize(width: number, height: number): unknown;
          setDepth(): unknown;
          setOrigin(): unknown;
        };
        rectangle(): {
          on(): unknown;
          setData(): unknown;
          setDepth(): unknown;
          setDisplaySize(): unknown;
          setFillStyle(): unknown;
          setInteractive(): unknown;
          setOrigin(): unknown;
          setPosition(): unknown;
          setStrokeStyle(): unknown;
        };
        text(): {
          setDepth(): { setOrigin(): { setPosition(): unknown } };
          setOrigin(): { setDepth(): unknown };
          setPosition(): unknown;
        };
      };
      preload(): void;
      create(): void;
    };
    const calls: string[] = [];
    const resizeHandlers: Array<(gameSize: { width: number; height: number }) => void> = [];

    const background = {
      clearTint: () => background,
      setAlpha: () => background,
      setDepth: () => background,
      setPosition: (x: number, y: number) => {
        calls.push(`background-position:${x}|${y}`);
        return background;
      },
      setDisplaySize: (width: number, height: number) => {
        calls.push(`background-display-size:${width}|${height}`);
        return background;
      },
      setOrigin: () => background,
      setTint: () => background
    };
    const rectangle = {
      on: () => rectangle,
      setData: () => rectangle,
      setDepth: () => rectangle,
      setDisplaySize: () => rectangle,
      setFillStyle: () => rectangle,
      setInteractive: () => rectangle,
      setOrigin: () => rectangle,
      setPosition: () => rectangle,
      setStrokeStyle: () => rectangle
    };
    const text = {
      setDepth: () => text,
      setOrigin: () => text,
      setPosition: () => text
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
    scene.events = {
      once: () => undefined
    };
    scene.add = {
      image: (...args: unknown[]) => {
        calls.push(`image-add:${args.join('|')}`);
        return background;
      },
      rectangle: () => rectangle,
      text: () => text
    };

    scene.preload();
    scene.create();

    if (resizeHandlers[0] !== undefined) {
      resizeHandlers[0]({ width: 900, height: 600 });
    }

    expect(calls).toContain('texture-exists:bg_sky_base');
    expect(calls).toContain('load-image:bg_sky_base|assets/phaser/backgrounds/lunar/bg_sky_base.png');
    expect(calls).toContain('image-add:0|0|bg_sky_base');
    expect(calls).toContain('image-add:0|0|bg_platform_front');
    expect(calls).toContain('background-position:960|540');
    expect(calls).toContain('background-display-size:1920|1080');
    expect(calls).toContain('scale-on:resize');
    expect(calls).toContain('background-position:450|300');
    expect(calls).toContain('background-display-size:900|600');
  });

  it('skips reloading style spike assets when textures are already cached', () => {
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

    expect(calls).toEqual([
      'texture-exists:bg_sky_base',
      'texture-exists:bg_stars_far',
      'texture-exists:bg_earth',
      'texture-exists:bg_lunar_ground',
      'texture-exists:bg_platform_front',
      'texture-exists:module_command_center',
      'texture-exists:module_greenhouse_basic',
      'texture-exists:module_processing',
      'texture-exists:module_shipping_hangar',
      'texture-exists:module_storage'
    ]);
  });

  it('creates style spike module sprites and clickable hotspots for the five MVP module instance IDs', () => {
    const { images, rectangles, scene } = createModuleScene();

    scene.create();

    expect(images.map((image) => image.key)).toEqual([
      'bg_sky_base',
      'bg_stars_far',
      'bg_earth',
      'bg_lunar_ground',
      'bg_platform_front',
      'module_command_center',
      'module_greenhouse_basic',
      'module_processing',
      'module_shipping_hangar',
      'module_storage'
    ]);
    expect(rectangles.map((rectangle) => rectangle.data['moduleId'])).toEqual([
      'module_command_center_basic_01',
      'module_greenhouse_basic_01',
      'module_processing_basic_01',
      'module_shipping_hangar_basic_01',
      'module_storage_basic_01'
    ]);
    expect(rectangles.every((rectangle) => rectangle.interactive === 1)).toBe(true);
  });

  it('emits typed bridge events from module hotspot pointer interactions', () => {
    const { emitted, rectangles, scene } = createModuleScene();

    scene.create();
    rectangles[1]!.handlers['pointerover']!();
    rectangles[1]!.handlers['pointerout']!();
    rectangles[1]!.handlers['pointerdown']!();

    expect(emitted).toEqual([
      { type: 'sceneReady' },
      { type: 'moduleHovered', moduleId: 'module_greenhouse_basic_01' },
      { type: 'moduleUnhovered', moduleId: 'module_greenhouse_basic_01' },
      { type: 'moduleSelected', moduleId: 'module_greenhouse_basic_01' }
    ]);
  });

  it('applies selected highlight commands to one module and clears them from all modules', () => {
    const { commands, rectangles, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'highlightModule', moduleId: 'module_greenhouse_basic_01' });

    expect(rectangles[1]!.strokes.at(-1)).toBe('4|8255999|1');
    expect(rectangles[4]!.strokes.at(-1)).toBe('2|3918280|0.9');

    commands.next({ type: 'clearHighlight' });

    expect(rectangles[1]!.strokes.at(-1)).toBe('2|3918280|0.9');
    expect(rectangles[4]!.strokes.at(-1)).toBe('2|3918280|0.9');
  });
});
