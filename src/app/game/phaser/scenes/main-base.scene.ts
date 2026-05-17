import Phaser from 'phaser';
import { EMPTY, Subscription, type Observable } from 'rxjs';

import type { AngularToPhaserEvent, PhaserToAngularEvent } from '../../bridge';

export interface PhaserSceneBridge {
  readonly angularEvents$: Observable<AngularToPhaserEvent>;
  emitFromPhaser(event: PhaserToAngularEvent): void;
}

interface PhaserAssetConfig {
  readonly key: string;
  readonly path: string;
}

interface BackgroundLayerConfig extends PhaserAssetConfig {
  readonly xRatio: number;
  readonly yRatio: number;
  readonly widthRatio: number;
  readonly heightRatio: number;
  readonly depth: number;
}

interface ModulePlaceholderConfig {
  readonly id: string;
  readonly assetKey: string;
  readonly assetPath: string;
  readonly xRatio: number;
  readonly yRatio: number;
  readonly widthRatio: number;
  readonly heightRatio: number;
}

interface ModulePlaceholderView {
  readonly config: ModulePlaceholderConfig;
  readonly hotspot: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Image;
}

interface BackgroundLayerView {
  readonly config: BackgroundLayerConfig;
  readonly visual: Phaser.GameObjects.Image;
}

const NOOP_SCENE_BRIDGE: PhaserSceneBridge = {
  angularEvents$: EMPTY,
  emitFromPhaser: () => undefined,
};

const DEFAULT_MODULE_FILL_COLOR = 0x102535;
const HOVER_MODULE_FILL_COLOR = 0x18384a;
const SELECTED_MODULE_FILL_COLOR = 0x1d5266;
const DEFAULT_MODULE_STROKE_COLOR = 0x3bc9c8;
const HOVER_MODULE_STROKE_COLOR = 0x9be8ff;
const SELECTED_MODULE_STROKE_COLOR = 0x7df9ff;
const DEFAULT_MODULE_TINT = 0xffffff;
const HOVER_MODULE_TINT = 0xb9f7ff;
const SELECTED_MODULE_TINT = 0x7df9ff;

const LUNAR_BACKGROUND_LAYERS: readonly BackgroundLayerConfig[] = [
  {
    key: 'bg_sky_base',
    path: 'assets/phaser/backgrounds/lunar/bg_sky_base.png',
    xRatio: 0.5,
    yRatio: 0.5,
    widthRatio: 1,
    heightRatio: 1,
    depth: 0,
  },
  {
    key: 'bg_stars_far',
    path: 'assets/phaser/backgrounds/lunar/bg_stars_far.png',
    xRatio: 0.5,
    yRatio: 0.5,
    widthRatio: 1,
    heightRatio: 1,
    depth: 1,
  },
  {
    key: 'bg_earth',
    path: 'assets/phaser/backgrounds/lunar/bg_earth.png',
    xRatio: 0.78,
    yRatio: 0.2,
    widthRatio: 0.16,
    heightRatio: 0.28,
    depth: 2,
  },
  {
    key: 'bg_lunar_ground',
    path: 'assets/phaser/backgrounds/lunar/bg_lunar_ground.png',
    xRatio: 0.5,
    yRatio: 0.82,
    widthRatio: 1,
    heightRatio: 0.4,
    depth: 3,
  },
  {
    key: 'bg_platform_front',
    path: 'assets/phaser/backgrounds/lunar/bg_platform_front.png',
    xRatio: 0.5,
    yRatio: 0.83,
    widthRatio: 1,
    heightRatio: 0.34,
    depth: 4,
  },
];

const MVP_MODULE_PLACEHOLDERS: readonly ModulePlaceholderConfig[] = [
  {
    id: 'module_command_center_basic_01',
    assetKey: 'module_command_center',
    assetPath: 'assets/phaser/modules/module_command_center.png',
    xRatio: 0.5,
    yRatio: 0.42,
    widthRatio: 0.16,
    heightRatio: 0.15,
  },
  {
    id: 'module_greenhouse_basic_01',
    assetKey: 'module_greenhouse_basic',
    assetPath: 'assets/phaser/modules/module_greenhouse_basic.png',
    xRatio: 0.3,
    yRatio: 0.62,
    widthRatio: 0.18,
    heightRatio: 0.14,
  },
  {
    id: 'module_processing_basic_01',
    assetKey: 'module_processing',
    assetPath: 'assets/phaser/modules/module_processing.png',
    xRatio: 0.5,
    yRatio: 0.66,
    widthRatio: 0.16,
    heightRatio: 0.14,
  },
  {
    id: 'module_shipping_hangar_basic_01',
    assetKey: 'module_shipping_hangar',
    assetPath: 'assets/phaser/modules/module_shipping_hangar.png',
    xRatio: 0.7,
    yRatio: 0.62,
    widthRatio: 0.18,
    heightRatio: 0.14,
  },
  {
    id: 'module_storage_basic_01',
    assetKey: 'module_storage',
    assetPath: 'assets/phaser/modules/module_storage.png',
    xRatio: 0.5,
    yRatio: 0.82,
    widthRatio: 0.2,
    heightRatio: 0.12,
  },
];

export class MainBaseScene extends Phaser.Scene {
  private readonly backgroundLayers: BackgroundLayerView[] = [];
  private bridgeSubscription = new Subscription();
  private hoveredModuleId?: string;
  private selectedModuleId?: string;
  private readonly moduleViews = new Map<string, ModulePlaceholderView>();

  constructor(private readonly sceneBridge: PhaserSceneBridge = NOOP_SCENE_BRIDGE) {
    super('MainBaseScene');
  }

  preload(): void {
    this.preloadAssets(LUNAR_BACKGROUND_LAYERS);
    this.preloadAssets(MVP_MODULE_PLACEHOLDERS.map((module) => ({ key: module.assetKey, path: module.assetPath })));
  }

  create(): void {
    this.createBackgroundLayers();
    this.createModulePlaceholders();
    this.subscribeToBridgeCommands();
    this.sceneBridge.emitFromPhaser({ type: 'sceneReady' });

    this.layoutBackgroundLayers(this.scale.width, this.scale.height);
    this.layoutModulePlaceholders(this.scale.width, this.scale.height);
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: { width: number; height: number }): void {
    this.layoutBackgroundLayers(gameSize.width, gameSize.height);
    this.layoutModulePlaceholders(gameSize.width, gameSize.height);
  }

  private preloadAssets(assets: readonly PhaserAssetConfig[]): void {
    for (const asset of assets) {
      if (!this.textures.exists(asset.key)) {
        this.load.image(asset.key, asset.path);
      }
    }
  }

  private createBackgroundLayers(): void {
    this.backgroundLayers.length = 0;

    for (const config of LUNAR_BACKGROUND_LAYERS) {
      const visual = this.add.image(0, 0, config.key).setOrigin(0.5).setDepth(config.depth);

      this.backgroundLayers.push({ config, visual });
    }
  }

  private layoutBackgroundLayers(width: number, height: number): void {
    for (const { config, visual } of this.backgroundLayers) {
      visual
        .setPosition(width * config.xRatio, height * config.yRatio)
        .setDisplaySize(width * config.widthRatio, height * config.heightRatio);
    }
  }

  private createModulePlaceholders(): void {
    for (const config of MVP_MODULE_PLACEHOLDERS) {
      const visual = this.add.image(0, 0, config.assetKey).setOrigin(0.5).setDepth(10).setAlpha(0.94);
      const hotspot = this.add
        .rectangle(0, 0, 1, 1, DEFAULT_MODULE_FILL_COLOR, 0.08)
        .setData('moduleId', config.id)
        .setOrigin(0.5)
        .setDepth(11)
        .setInteractive({ useHandCursor: true });

      hotspot
        .on('pointerover', () => {
          this.hoveredModuleId = config.id;
          this.applyModuleVisualState(config.id);
          this.sceneBridge.emitFromPhaser({ type: 'moduleHovered', moduleId: config.id });
        })
        .on('pointerout', () => {
          this.hoveredModuleId = undefined;
          this.applyModuleVisualState(config.id);
          this.sceneBridge.emitFromPhaser({ type: 'moduleUnhovered', moduleId: config.id });
        })
        .on('pointerdown', () => {
          this.sceneBridge.emitFromPhaser({ type: 'moduleSelected', moduleId: config.id });
        });

      this.moduleViews.set(config.id, { config, hotspot, visual });
      this.applyModuleVisualState(config.id);
    }
  }

  private layoutModulePlaceholders(width: number, height: number): void {
    for (const { config, hotspot, visual } of this.moduleViews.values()) {
      const moduleWidth = width * config.widthRatio;
      const moduleHeight = height * config.heightRatio;
      const x = width * config.xRatio;
      const y = height * config.yRatio;

      hotspot.setPosition(x, y).setDisplaySize(moduleWidth, moduleHeight);
      visual.setPosition(x, y).setDisplaySize(moduleWidth, moduleHeight);
    }
  }

  private subscribeToBridgeCommands(): void {
    this.bridgeSubscription.unsubscribe();
    this.bridgeSubscription = this.sceneBridge.angularEvents$.subscribe((event) => {
      this.applyAngularCommand(event);
    });
    this.events.once('shutdown', this.unsubscribeFromBridgeCommands, this);
    this.events.once('destroy', this.unsubscribeFromBridgeCommands, this);
  }

  private applyAngularCommand(event: AngularToPhaserEvent): void {
    if (event.type === 'highlightModule') {
      this.selectedModuleId = event.moduleId;
      this.applyAllModuleVisualStates();
      return;
    }

    this.selectedModuleId = undefined;
    this.applyAllModuleVisualStates();
  }

  private applyAllModuleVisualStates(): void {
    for (const moduleId of this.moduleViews.keys()) {
      this.applyModuleVisualState(moduleId);
    }
  }

  private applyModuleVisualState(moduleId: string): void {
    const view = this.moduleViews.get(moduleId)!;

    if (this.selectedModuleId === moduleId) {
      view.visual.setTint(SELECTED_MODULE_TINT).setAlpha(1);
      view.hotspot
        .setFillStyle(SELECTED_MODULE_FILL_COLOR, 0.7)
        .setStrokeStyle(4, SELECTED_MODULE_STROKE_COLOR, 1);
      return;
    }

    if (this.hoveredModuleId === moduleId) {
      view.visual.setTint(HOVER_MODULE_TINT).setAlpha(0.98);
      view.hotspot.setFillStyle(HOVER_MODULE_FILL_COLOR, 0.55).setStrokeStyle(3, HOVER_MODULE_STROKE_COLOR, 1);
      return;
    }

    view.visual.setTint(DEFAULT_MODULE_TINT).clearTint().setAlpha(0.94);
    view.hotspot.setFillStyle(DEFAULT_MODULE_FILL_COLOR, 0.4).setStrokeStyle(2, DEFAULT_MODULE_STROKE_COLOR, 0.9);
  }

  private unsubscribeFromBridgeCommands(): void {
    this.bridgeSubscription.unsubscribe();
  }
}
