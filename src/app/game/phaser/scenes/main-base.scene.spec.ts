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
  fills: string[];
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

interface SceneTextHarness {
  readonly text: string;
  readonly alphas: number[];
  readonly positions: string[];
  readonly visibility: boolean[];
}

function createModuleScene(): {
  commands: Subject<AngularToPhaserEvent>;
  emitted: PhaserToAngularEvent[];
  images: SceneImageHarness[];
  labels: SceneTextHarness[];
  rectangles: ModuleRectangleHarness[];
  scene: { create(): void };
} {
  const commands = new Subject<AngularToPhaserEvent>();
  const emitted: PhaserToAngularEvent[] = [];
  const images: SceneImageHarness[] = [];
  const labels: SceneTextHarness[] = [];
  const rectangles: ModuleRectangleHarness[] = [];
  const bridge: PhaserSceneBridge = {
    angularEvents$: commands.asObservable(),
    emitFromPhaser: (event) => emitted.push(event),
  };
  const scene = new MainBaseScene(bridge) as any;

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
    text: (_x: number, _y: number, text: string) => {
      const label = {
        text,
        alphas: [] as number[],
        positions: [] as string[],
        visibility: [] as boolean[],
        setAlpha: (alpha: number) => {
          label.alphas.push(alpha);
          return label;
        },
        setDepth: () => label,
        setOrigin: () => label,
        setPosition: (x: number, y: number) => {
          label.positions.push(`${x}|${y}`);
          return label;
        },
        setVisible: (visible: boolean) => {
          label.visibility.push(visible);
          return label;
        },
      };
      labels.push(label);
      return label;
    },
    rectangle: () => {
      const rectangle = {
        data: {} as Record<string, unknown>,
        fills: [] as string[],
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
        setFillStyle: (color: number, alpha: number) => {
          rectangle.fills.push(`${color}|${alpha}`);
          return rectangle;
        },
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

  return { commands, emitted, images, labels, rectangles, scene };
}

describe('MainBaseScene visual placeholder', () => {
  it('preloads the temporary lunar matte background from a stable runtime path', () => {
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
      'texture-exists:bg_lunar_basic_temp',
      'load-image:bg_lunar_basic_temp|assets/phaser/backgrounds/lunar/bg_lunar_basic_temp.png',
      'texture-exists:module_command_center',
      'load-image:module_command_center|assets/phaser/modules/module_command_center.png',
      'texture-exists:module_greenhouse_basic',
      'load-image:module_greenhouse_basic|assets/phaser/modules/module_greenhouse_basic.png',
      'texture-exists:module_processing',
      'load-image:module_processing|assets/phaser/modules/module_processing.png',
      'texture-exists:module_shipping_hangar',
      'load-image:module_shipping_hangar|assets/phaser/modules/module_shipping_hangar.png',
      'texture-exists:module_storage',
      'load-image:module_storage|assets/phaser/modules/module_storage.png',
    ]);
  });

  it('resizes the temporary lunar matte background with the scene', () => {
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
      setAlpha: () => text,
      setDepth: () => text,
      setOrigin: () => text,
      setPosition: () => text,
      setVisible: () => text
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

    expect(calls).toContain('texture-exists:bg_lunar_basic_temp');
    expect(calls).toContain('load-image:bg_lunar_basic_temp|assets/phaser/backgrounds/lunar/bg_lunar_basic_temp.png');
    expect(calls).toContain('image-add:0|0|bg_lunar_basic_temp');
    expect(calls).toContain('background-position:960|540');
    expect(calls).toContain('background-display-size:1920|1080');
    expect(calls).toContain('scale-on:resize');
    expect(calls).toContain('background-position:450|300');
    expect(calls).toContain('background-display-size:900|600');
  });

  it('skips reloading the temporary lunar matte when the texture is already cached', () => {
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
      'texture-exists:bg_lunar_basic_temp',
      'texture-exists:module_command_center',
      'texture-exists:module_greenhouse_basic',
      'texture-exists:module_processing',
      'texture-exists:module_shipping_hangar',
      'texture-exists:module_storage',
    ]);
  });

  it('creates subtle clickable hotspots and labels for the five MVP module instance IDs', () => {
    const { images, labels, rectangles, scene } = createModuleScene();

    scene.create();

    expect(images.map((image) => image.key)).toEqual([
      'bg_lunar_basic_temp',
      'module_command_center',
      'module_greenhouse_basic',
      'module_processing',
      'module_shipping_hangar',
      'module_storage',
    ]);
    expect(rectangles.map((rectangle) => rectangle.data['moduleId'])).toEqual([
      'module_command_center_basic_01',
      'module_greenhouse_basic_01',
      'module_processing_basic_01',
      'module_shipping_hangar_basic_01',
      'module_storage_basic_01'
    ]);
    expect(labels.map((label) => label.text)).toEqual([
      'Command Center',
      'Greenhouse',
      'Processing',
      'Shipping',
      'Storage'
    ]);
    expect(rectangles.every((rectangle) => rectangle.interactive === 1)).toBe(true);
    expect(rectangles.map((rectangle) => rectangle.fills.at(-1))).toEqual([
      '988970|0',
      '988970|0',
      '988970|0',
      '988970|0',
      '988970|0'
    ]);
    expect(rectangles.every((rectangle) => rectangle.strokes.at(-1) === '1|3918280|0.14')).toBe(true);
    expect(labels.every((label) => label.visibility.at(-1) === false)).toBe(true);
  });

  it('clears the module sprite tint in the default visual state after create', () => {
    const { images, scene } = createModuleScene();

    scene.create();

    // images[0] = bg, images[1..5] = module sprites in hotspot order
    const moduleSprites = images.slice(1);

    expect(moduleSprites.every((s) => s.tints.at(-1) === 'clear')).toBe(true);
  });

  it('tints the module sprite with the hover color on pointerover', () => {
    const { images, rectangles, scene } = createModuleScene();

    scene.create();
    // rectangles[1] = greenhouse hotspot, images[2] = greenhouse sprite
    rectangles[1]!.handlers['pointerover']!();

    expect(images[2]!.tints.at(-1)).toBe(String(0x9be8ff));
  });

  it('tints the module sprite with the selected color on highlightModule command', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'highlightModule', moduleId: 'module_greenhouse_basic_01' });

    expect(images[2]!.tints.at(-1)).toBe(String(0x00e6ff));
  });

  it('tints the module sprite with the crop-ready color on cropReady command', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });

    expect(images[2]!.tints.at(-1)).toBe(String(0x4ade80));
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
    const { commands, labels, rectangles, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'highlightModule', moduleId: 'module_greenhouse_basic_01' });

    expect(rectangles[1]!.strokes.at(-1)).toBe('2|59135|1');
    expect(rectangles[4]!.strokes.at(-1)).toBe('1|3918280|0.14');
    expect(labels[1]!.visibility.at(-1)).toBe(true);
    expect(labels[4]!.visibility.at(-1)).toBe(false);

    commands.next({ type: 'clearHighlight' });

    expect(rectangles[1]!.strokes.at(-1)).toBe('1|3918280|0.14');
    expect(rectangles[4]!.strokes.at(-1)).toBe('1|3918280|0.14');
    expect(labels[1]!.visibility.at(-1)).toBe(false);
  });
});

describe('MainBaseScene cropReady flash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flashes the targeted module with a green stroke on cropReady and reverts to default after the flash duration', () => {
    const { commands, rectangles, scene } = createModuleScene();

    scene.create();

    // Greenhouse is rectangles[1] (module_greenhouse_basic_01)
    const greenhouse = rectangles[1]!;

    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });

    // Flash stroke applied: width 2, green color (0x4ade80 = 4906624), alpha 1
    expect(greenhouse.strokes.at(-1)).toBe('2|4906624|1');

    vi.advanceTimersByTime(1900);

    // Reverted to default
    expect(greenhouse.strokes.at(-1)).toBe('1|3918280|0.14');
  });

  it('does not affect unrelated modules on cropReady', () => {
    const { commands, rectangles, scene } = createModuleScene();

    scene.create();

    const commandCenter = rectangles[0]!; // module_command_center_basic_01
    const defaultStroke = commandCenter.strokes.at(-1);

    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });

    expect(commandCenter.strokes.at(-1)).toBe(defaultStroke);
  });

  it('resets an in-progress flash timer when a second cropReady fires for the same module', () => {
    const { commands, rectangles, scene } = createModuleScene();

    scene.create();

    const greenhouse = rectangles[1]!;

    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });
    vi.advanceTimersByTime(900);

    // Second event resets the timer
    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });
    vi.advanceTimersByTime(900);

    // Still in flash state (1800ms have not elapsed since the second event)
    expect(greenhouse.strokes.at(-1)).toBe('2|4906624|1');

    vi.advanceTimersByTime(1000);

    // Now reverted
    expect(greenhouse.strokes.at(-1)).toBe('1|3918280|0.14');
  });
});
