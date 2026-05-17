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

function createModuleScene(): {
  commands: Subject<AngularToPhaserEvent>;
  emitted: PhaserToAngularEvent[];
  rectangles: ModuleRectangleHarness[];
  scene: { create(): void };
} {
  const commands = new Subject<AngularToPhaserEvent>();
  const emitted: PhaserToAngularEvent[] = [];
  const rectangles: ModuleRectangleHarness[] = [];
  const bridge: PhaserSceneBridge = {
    angularEvents$: commands.asObservable(),
    emitFromPhaser: (event) => emitted.push(event),
  };
  const scene = new MainBaseScene(bridge) as any;
  const chain = { setDisplaySize: () => chain, setPosition: () => chain, setDepth: () => chain, setOrigin: () => chain };

  scene.textures = { exists: () => true };
  scene.load = { image: () => undefined };
  scene.scale = { width: 1920, height: 1080, on: () => undefined };
  scene.events = { once: () => undefined };
  scene.add = {
    image: () => chain,
    text: () => chain,
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

  return { commands, emitted, rectangles, scene };
}

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
      events: {
        once(event: string, handler: () => void, context?: unknown): void;
      };
      add: {
        image(...args: unknown[]): {
          setPosition(x: number, y: number): unknown;
          setDisplaySize(width: number, height: number): unknown;
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
      setPosition: (x: number, y: number) => {
        calls.push(`background-position:${x}|${y}`);
        return background;
      },
      setDisplaySize: (width: number, height: number) => {
        calls.push(`background-display-size:${width}|${height}`);
        return background;
      }
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

  it('creates clickable placeholders for the five MVP module instance IDs', () => {
    const { rectangles, scene } = createModuleScene();

    scene.create();

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
