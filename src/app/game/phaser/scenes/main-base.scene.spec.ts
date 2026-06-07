import { Subject } from 'rxjs';
import { vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    AUTO: 'AUTO',
    BlendModes: { SCREEN: 'SCREEN' },
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
  readonly blendModes: string[];
  readonly displaySizes: string[];
  readonly glows: string[];
  readonly positions: string[];
  readonly tints: string[];
}

function getImageByKey(images: SceneImageHarness[], key: string): SceneImageHarness {
  const image = images.find((entry) => entry.key === key);

  expect(image).toBeDefined();

  return image!;
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
  scene.load = { image: () => undefined, on: () => undefined };
  scene.scale = { width: 1920, height: 1080, on: () => undefined };
  scene.events = { once: () => undefined };
  scene.tweens = { add: () => undefined };
  scene.add = {
    image: (_x: number, _y: number, key: string) => {
      const image = {
        key,
        blendModes: [] as string[],
        displaySizes: [] as string[],
        glows: [] as string[],
        positions: [] as string[],
        tints: [] as string[],
        preFX: {
          clear: (): void => { image.glows.push('glow:clear'); },
          addGlow: (color: number, outer: number, inner: number, knockout: boolean): Record<string, never> => {
            image.glows.push(`glow:${color}|${outer}|${inner}|${knockout}`);
            return {};
          },
        },
        clearTint: () => {
          image.tints.push('clear');
          return image;
        },
        setAlpha: () => image,
        setBlendMode: (mode: string) => {
          image.blendModes.push(mode);
          return image;
        },
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
  it('preloads the layered lunar background assets from stable runtime paths', () => {
    const scene = new MainBaseScene() as unknown as {
      textures: {
        exists(key: string): boolean;
      };
      load: {
        image(key: string, path: string): void;
        on(event: string, handler: (file: { key: string }) => void): void;
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
      on: () => undefined,
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
      'load-image:bg_lunar_ground|assets/phaser/backgrounds/lunar/bg_lunar_ground_removebg.png',
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

  it('lays out the layered lunar background stack with sky, stars, earth, and ground', () => {
    const scene = new MainBaseScene() as unknown as {
      textures: {
        exists(key: string): boolean;
      };
      load: {
        image(key: string, path: string): void;
        on(event: string, handler: (file: { key: string }) => void): void;
      };
      scale: {
        width: number;
        height: number;
        on(event: string, handler: (gameSize: { width: number; height: number }) => void, context: unknown): void;
      };
      events: {
        once(event: string, handler: () => void, context?: unknown): void;
      };
      tweens: {
        add(...args: unknown[]): unknown;
      };
      add: {
        image(...args: unknown[]): {
          setAlpha(): unknown;
          setBlendMode(mode: string): unknown;
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
      make: {
        graphics(config: unknown, addToScene: boolean): {
          fillCircle(x: number, y: number, radius: number): unknown;
          fillEllipse(x: number, y: number, width: number, height: number): unknown;
          fillGradientStyle(...args: unknown[]): unknown;
          fillRect(x: number, y: number, width: number, height: number): unknown;
          fillStyle(color: number, alpha?: number): unknown;
          generateTexture(key: string, width: number, height: number): unknown;
          destroy(): unknown;
        };
      };
      preload(): void;
      create(): void;
    };
    const calls: string[] = [];
    const resizeHandlers: Array<(gameSize: { width: number; height: number }) => void> = [];

    const createBackground = (key: string) => {
      const background = {
        clearTint: () => background,
        setAlpha: (alpha?: number) => {
          calls.push(`background-alpha:${key}|${alpha}`);
          return background;
        },
        setBlendMode: (mode: string) => {
          calls.push(`background-blend:${key}|${mode}`);
          return background;
        },
        setDepth: (depth?: number) => {
          calls.push(`background-depth:${key}|${depth}`);
          return background;
        },
        setPosition: (x: number, y: number) => {
          calls.push(`background-position:${key}|${x}|${y}`);
          return background;
        },
        setDisplaySize: (width: number, height: number) => {
          calls.push(`background-display-size:${key}|${width}|${height}`);
          return background;
        },
        setOrigin: () => {
          calls.push(`background-origin:${key}`);
          return background;
        },
        setTint: () => background
      };

      return background;
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
      on: () => undefined,
      image: (key: string, path: string) => {
        calls.push(`load-image:${key}|${path}`);
      }
    };
    scene.make = {
      graphics: () => {
        const graphics = {
          fillCircle: () => graphics,
          fillEllipse: () => graphics,
          fillGradientStyle: () => graphics,
          fillRect: () => graphics,
          fillStyle: () => graphics,
          generateTexture: () => graphics,
          destroy: () => graphics,
        };

        return graphics;
      },
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
    scene.tweens = { add: () => undefined };
    scene.add = {
      image: (...args: unknown[]) => {
        calls.push(`image-add:${args.join('|')}`);
        return createBackground(String(args[2]));
      },
      rectangle: () => rectangle,
      text: () => text,
    };

    scene.preload();
    scene.create();

    if (resizeHandlers[0] !== undefined) {
      resizeHandlers[0]({ width: 900, height: 600 });
    }

    expect(calls).toContain('texture-exists:bg_sky_base');
    expect(calls).toContain('load-image:bg_sky_base|assets/phaser/backgrounds/lunar/bg_sky_base.png');
    expect(calls).toContain('texture-exists:bg_stars_far');
    expect(calls).toContain('load-image:bg_stars_far|assets/phaser/backgrounds/lunar/bg_stars_far.png');
    expect(calls).toContain('texture-exists:bg_earth');
    expect(calls).toContain('load-image:bg_earth|assets/phaser/backgrounds/lunar/bg_earth.png');
    expect(calls).toContain('texture-exists:bg_lunar_ground');
    expect(calls).toContain('load-image:bg_lunar_ground|assets/phaser/backgrounds/lunar/bg_lunar_ground_removebg.png');
    expect(calls).toContain('image-add:0|0|bg_sky_base');
    expect(calls).toContain('image-add:0|0|bg_stars_far');
    expect(calls).toContain('image-add:0|0|bg_earth');
    expect(calls).toContain('image-add:0|0|bg_lunar_ground');
    expect(calls).toContain('background-blend:bg_stars_far|SCREEN');
    expect(calls).toContain('background-position:bg_sky_base|960|529.2');
    expect(calls).toContain('background-display-size:bg_sky_base|1996.8000000000002|1123.2');
    expect(calls).toContain('background-position:bg_earth|1593.6|205.2');
    expect(calls).toContain('background-display-size:bg_earth|364.8|356.40000000000003');
    expect(calls).toContain('background-position:bg_lunar_ground|960|918');
    expect(calls).toContain('background-display-size:bg_lunar_ground|1996.8000000000002|561.6');
    expect(calls).toContain('scale-on:resize');
    expect(calls).toContain('background-position:bg_sky_base|450|294');
    expect(calls).toContain('background-display-size:bg_sky_base|936|624');
    expect(calls).toContain('background-position:bg_lunar_ground|450|510');
    expect(calls).toContain('background-display-size:bg_lunar_ground|936|312');
  });

  it('skips reloading the layered lunar background assets when textures are already cached', () => {
    const scene = new MainBaseScene() as unknown as {
      textures: {
        exists(key: string): boolean;
      };
      load: {
        image(key: string, path: string): void;
        on(event: string, handler: (file: { key: string }) => void): void;
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
      on: () => undefined,
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
      'bg_sky_base',
      'bg_stars_far',
      'bg_earth',
      'bg_lunar_ground',
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
      '1120295|0',
      '1120295|0',
      '1120295|0',
      '1120295|0',
      '1120295|0'
    ]);
    expect(rectangles.every((rectangle) => rectangle.strokes.at(-1) === '1|8162204|0')).toBe(true);
    expect(labels.every((label) => label.visibility.at(-1) === false)).toBe(true);
  });

  it('clears the module sprite tint and glow in the default visual state after create', () => {
    const { images, scene } = createModuleScene();

    scene.create();

    const moduleSprites = images.filter((image) => image.key.startsWith('module_'));

    expect(moduleSprites.every((s) => s.tints.at(-1) === 'clear')).toBe(true);
    expect(moduleSprites.every((s) => s.glows.at(-1) === 'glow:clear')).toBe(true);
  });

  it('keeps the module sprite untinted on pointerover', () => {
    const { images, rectangles, scene } = createModuleScene();

    scene.create();
    rectangles[1]!.handlers['pointerover']!();

    expect(getImageByKey(images, 'module_greenhouse_basic').tints.at(-1)).toBe('clear');
  });

  it('applies an amber tint to the module sprite when the highlightModule command is received', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'highlightModule', moduleId: 'module_greenhouse_basic_01' });

    expect(getImageByKey(images, 'module_greenhouse_basic').tints.at(-1)).toBe(String(0xf59e0b));
  });

  it('keeps glow cleared on the selected module sprite when the highlightModule command is received', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'highlightModule', moduleId: 'module_greenhouse_basic_01' });

    expect(getImageByKey(images, 'module_greenhouse_basic').glows.at(-1)).toBe('glow:clear');
  });

  it('does not apply a glow to non-selected module sprites when a module is highlighted', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'highlightModule', moduleId: 'module_greenhouse_basic_01' });

    expect(getImageByKey(images, 'module_storage').glows.at(-1)).toBe('glow:clear');
  });

  it('clears the selection glow from the module sprite when the clearHighlight command is received', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'highlightModule', moduleId: 'module_greenhouse_basic_01' });
    commands.next({ type: 'clearHighlight' });

    expect(getImageByKey(images, 'module_greenhouse_basic').glows.at(-1)).toBe('glow:clear');
  });

  it('repositions a module when Angular sends an adjustModuleLayout command', () => {
    const { commands, images, labels, scene } = createModuleScene();

    scene.create();
    commands.next({
      type: 'adjustModuleLayout',
      moduleId: 'module_greenhouse_basic_01',
      patch: {
        xRatio: 0.4,
        yRatio: 0.82,
        widthRatio: 0.2,
        heightRatio: 0.13,
        spriteWidthRatio: 0.37,
        spriteHeightRatio: 0.27,
      },
    });

    expect(getImageByKey(images, 'module_greenhouse_basic').positions.at(-1)).toBe('768|885.5999999999999');
    expect(getImageByKey(images, 'module_greenhouse_basic').displaySizes.at(-1)).toBe('710.4|291.6');
    expect(labels.find((label) => label.text === 'Greenhouse')?.positions.at(-1)).toBe('768|731.8');
  });

  it('tints the module sprite with the crop-ready color on cropReady command', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });

    expect(getImageByKey(images, 'module_greenhouse_basic').tints.at(-1)).toBe(String(0x4ade80));
  });

  it('mirrors objective pulse commands as a scene-level background tint only', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'playObjectivePulse' });

    expect(getImageByKey(images, 'bg_sky_base').tints.at(-1)).toBe(String(0xf59e0b));
    expect(getImageByKey(images, 'module_command_center').tints.at(-1)).toBe('clear');

    commands.next({ type: 'clearDemoPulse' });

    expect(getImageByKey(images, 'bg_sky_base').tints.at(-1)).toBe('clear');
  });

  it('mirrors completion pulse commands as a scene-level background tint only', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();
    commands.next({ type: 'playCompletionPulse' });

    expect(getImageByKey(images, 'bg_sky_base').tints.at(-1)).toBe(String(0x22d3ee));
    expect(getImageByKey(images, 'module_command_center').tints.at(-1)).toBe('clear');
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

    expect(rectangles[1]!.strokes.at(-1)).toBe('2|16096779|0');
    expect(rectangles[4]!.strokes.at(-1)).toBe('1|8162204|0');
    expect(labels[1]!.visibility.at(-1)).toBe(true);
    expect(labels[4]!.visibility.at(-1)).toBe(false);

    commands.next({ type: 'clearHighlight' });

    expect(rectangles[1]!.strokes.at(-1)).toBe('1|8162204|0');
    expect(rectangles[4]!.strokes.at(-1)).toBe('1|8162204|0');
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

  it('flashes the targeted module with a green sprite tint on cropReady and reverts to default after the flash duration', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();

    const greenhouse = getImageByKey(images, 'module_greenhouse_basic');

    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });

    expect(greenhouse.tints.at(-1)).toBe(String(0x4ade80));

    vi.advanceTimersByTime(1900);

    expect(greenhouse.tints.at(-1)).toBe('clear');
  });

  it('does not affect unrelated modules on cropReady', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();

    const commandCenter = getImageByKey(images, 'module_command_center');
    const defaultTint = commandCenter.tints.at(-1);

    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });

    expect(commandCenter.tints.at(-1)).toBe(defaultTint);
  });

  it('resets an in-progress flash timer when a second cropReady fires for the same module', () => {
    const { commands, images, scene } = createModuleScene();

    scene.create();

    const greenhouse = getImageByKey(images, 'module_greenhouse_basic');

    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });
    vi.advanceTimersByTime(900);

    // Second event resets the timer
    commands.next({ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' });
    vi.advanceTimersByTime(900);

    expect(greenhouse.tints.at(-1)).toBe(String(0x4ade80));

    vi.advanceTimersByTime(1000);

    expect(greenhouse.tints.at(-1)).toBe('clear');
  });
});
