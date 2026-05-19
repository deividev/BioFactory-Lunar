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

interface ModuleHotspotConfig {
  readonly id: string;
  readonly label: string;
  readonly xRatio: number;
  readonly yRatio: number;
  readonly widthRatio: number;
  readonly heightRatio: number;
}

interface ModuleHotspotView {
  readonly config: ModuleHotspotConfig;
  readonly hotspot: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
}

interface BackgroundLayerView {
  readonly config: BackgroundLayerConfig;
  readonly visual: Phaser.GameObjects.Image;
}

const NOOP_SCENE_BRIDGE: PhaserSceneBridge = {
  angularEvents$: EMPTY,
  emitFromPhaser: () => undefined,
};

const MODULE_HOTSPOT_FILL_COLOR = 0x0f172a;
const DEFAULT_MODULE_STROKE_COLOR = 0x3bc9c8;
const HOVER_MODULE_STROKE_COLOR = 0x9be8ff;
const SELECTED_MODULE_STROKE_COLOR = 0x00e6ff;
const DEFAULT_MODULE_FILL_ALPHA = 0;
const HOVER_MODULE_FILL_ALPHA = 0.045;
const SELECTED_MODULE_FILL_ALPHA = 0.09;
const DEFAULT_MODULE_STROKE_ALPHA = 0.14;
const HOVER_MODULE_STROKE_ALPHA = 0.82;
const SELECTED_MODULE_STROKE_ALPHA = 1;

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

const MVP_MODULE_HOTSPOTS: readonly ModuleHotspotConfig[] = [
  {
    id: 'module_command_center_basic_01',
    label: 'Command Center',
    xRatio: 0.5,
    yRatio: 0.52,
    widthRatio: 0.14,
    heightRatio: 0.08,
  },
  {
    id: 'module_greenhouse_basic_01',
    label: 'Greenhouse',
    xRatio: 0.32,
    yRatio: 0.66,
    widthRatio: 0.16,
    heightRatio: 0.09,
  },
  {
    id: 'module_processing_basic_01',
    label: 'Processing',
    xRatio: 0.5,
    yRatio: 0.68,
    widthRatio: 0.14,
    heightRatio: 0.09,
  },
  {
    id: 'module_shipping_hangar_basic_01',
    label: 'Shipping',
    xRatio: 0.68,
    yRatio: 0.66,
    widthRatio: 0.16,
    heightRatio: 0.09,
  },
  {
    id: 'module_storage_basic_01',
    label: 'Storage',
    xRatio: 0.5,
    yRatio: 0.82,
    widthRatio: 0.22,
    heightRatio: 0.07,
  },
];

export class MainBaseScene extends Phaser.Scene {
  private readonly backgroundLayers: BackgroundLayerView[] = [];
  private bridgeSubscription = new Subscription();
  private hoveredModuleId?: string;
  private selectedModuleId?: string;
  private readonly moduleViews = new Map<string, ModuleHotspotView>();

  constructor(private readonly sceneBridge: PhaserSceneBridge = NOOP_SCENE_BRIDGE) {
    super('MainBaseScene');
  }

  preload(): void {
    this.preloadAssets(LUNAR_BACKGROUND_LAYERS);
  }

  create(): void {
    this.createBackgroundLayers();
    this.createModuleHotspots();
    this.subscribeToBridgeCommands();
    this.sceneBridge.emitFromPhaser({ type: 'sceneReady' });

    this.layoutBackgroundLayers(this.scale.width, this.scale.height);
    this.layoutModuleHotspots(this.scale.width, this.scale.height);
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: { width: number; height: number }): void {
    this.layoutBackgroundLayers(gameSize.width, gameSize.height);
    this.layoutModuleHotspots(gameSize.width, gameSize.height);
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

  private createModuleHotspots(): void {
    for (const config of MVP_MODULE_HOTSPOTS) {
      const hotspot = this.add
        .rectangle(0, 0, 1, 1, MODULE_HOTSPOT_FILL_COLOR, DEFAULT_MODULE_FILL_ALPHA)
        .setData('moduleId', config.id)
        .setOrigin(0.5)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });
      const label = this.createModuleLabel(config.label);

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

      this.moduleViews.set(config.id, { config, hotspot, label });
      this.applyModuleVisualState(config.id);
    }
  }

  private createModuleLabel(label: string): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, label, {
        align: 'center',
        backgroundColor: '#0f172acc',
        color: '#e2e6f0',
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '12px',
        fontStyle: '700',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(11)
      .setAlpha(0)
      .setVisible(false);
  }

  private layoutModuleHotspots(width: number, height: number): void {
    for (const { config, hotspot, label } of this.moduleViews.values()) {
      const moduleWidth = width * config.widthRatio;
      const moduleHeight = height * config.heightRatio;
      const x = width * config.xRatio;
      const y = height * config.yRatio;

      hotspot.setPosition(x, y).setDisplaySize(moduleWidth, moduleHeight);
      label.setPosition(x, y - moduleHeight / 2 - 8);
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
      view.hotspot
        .setFillStyle(MODULE_HOTSPOT_FILL_COLOR, SELECTED_MODULE_FILL_ALPHA)
        .setStrokeStyle(2, SELECTED_MODULE_STROKE_COLOR, SELECTED_MODULE_STROKE_ALPHA);
      view.label.setVisible(true).setAlpha(1);
      return;
    }

    if (this.hoveredModuleId === moduleId) {
      view.hotspot
        .setFillStyle(MODULE_HOTSPOT_FILL_COLOR, HOVER_MODULE_FILL_ALPHA)
        .setStrokeStyle(2, HOVER_MODULE_STROKE_COLOR, HOVER_MODULE_STROKE_ALPHA);
      view.label.setVisible(true).setAlpha(0.95);
      return;
    }

    view.hotspot
      .setFillStyle(MODULE_HOTSPOT_FILL_COLOR, DEFAULT_MODULE_FILL_ALPHA)
      .setStrokeStyle(1, DEFAULT_MODULE_STROKE_COLOR, DEFAULT_MODULE_STROKE_ALPHA);
    view.label.setVisible(false).setAlpha(0);
  }

  private unsubscribeFromBridgeCommands(): void {
    this.bridgeSubscription.unsubscribe();
  }
}
