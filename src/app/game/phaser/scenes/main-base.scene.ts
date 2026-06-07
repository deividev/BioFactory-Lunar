import Phaser from 'phaser';
import { EMPTY, Subscription, type Observable } from 'rxjs';

import type { AngularToPhaserEvent, PhaserToAngularEvent } from '../../bridge';
import {
  MVP_MODULE_HOTSPOTS,
  type ModuleHotspotConfig,
  type ModuleLayoutPatch,
  type ModuleLayoutRatios,
} from './main-base-layout.config';

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
  readonly alpha?: number;
  readonly blendMode?: number;
}

interface ModuleHotspotView {
  readonly config: ModuleHotspotConfig;
  readonly hotspot: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  readonly sprite: Phaser.GameObjects.Image;
}

interface BackgroundLayerView {
  readonly config: BackgroundLayerConfig;
  readonly visual: Phaser.GameObjects.Image;
}

const NOOP_SCENE_BRIDGE: PhaserSceneBridge = {
  angularEvents$: EMPTY,
  emitFromPhaser: () => undefined,
};

const MODULE_HOTSPOT_FILL_COLOR = 0x111827;
const DEFAULT_MODULE_STROKE_COLOR = 0x7c8b9c;
const HOVER_MODULE_STROKE_COLOR = 0xfbbf24;
const SELECTED_MODULE_STROKE_COLOR = 0xf59e0b;
const CROP_READY_FLASH_COLOR = 0x4ade80;
const DEFAULT_MODULE_FILL_ALPHA = 0;
const HOVER_MODULE_FILL_ALPHA = 0;
const SELECTED_MODULE_FILL_ALPHA = 0;
const DEFAULT_MODULE_STROKE_ALPHA = 0;
const HOVER_MODULE_STROKE_ALPHA = 0;
const SELECTED_MODULE_STROKE_ALPHA = 0;
const CROP_READY_FLASH_STROKE_ALPHA = 0;
const SELECTED_GLOW_COLOR = 0xf59e0b;
const SELECTED_GLOW_OUTER_STRENGTH = 8;

type SpriteWithFX = Phaser.GameObjects.Image & {
  preFX?: {
    clear(): void;
    addGlow(color: number, outer: number, inner: number, knockout: boolean): unknown;
  };
};

function applySpriteGlow(sprite: Phaser.GameObjects.Image, color: number, strength: number): void {
  const fx = (sprite as SpriteWithFX).preFX;
  if (fx == null) { return; }
  fx.clear();
  fx.addGlow(color, strength, 0, false);
}

function clearSpriteGlow(sprite: Phaser.GameObjects.Image): void {
  const fx = (sprite as SpriteWithFX).preFX;
  if (fx == null) { return; }
  fx.clear();
}
const CROP_READY_FLASH_DURATION_MS = 1800;
const OBJECTIVE_PULSE_TINT_COLOR = 0xf59e0b;
const COMPLETION_PULSE_TINT_COLOR = 0x22d3ee;
const SCREEN_BLEND_MODE = (Phaser as unknown as { BlendModes?: { SCREEN?: number } }).BlendModes?.SCREEN;

const LUNAR_BACKGROUND_LAYERS: readonly BackgroundLayerConfig[] = [
  {
    key: 'bg_sky_base',
    path: 'assets/phaser/backgrounds/lunar/bg_sky_base.png',
    xRatio: 0.5,
    yRatio: 0.49,
    widthRatio: 1.04,
    heightRatio: 1.04,
    depth: 0,
  },
  {
    key: 'bg_stars_far',
    path: 'assets/phaser/backgrounds/lunar/bg_stars_far.png',
    xRatio: 0.5,
    yRatio: 0.49,
    widthRatio: 1.06,
    heightRatio: 1.06,
    depth: 1,
    alpha: 0.88,
    blendMode: SCREEN_BLEND_MODE,
  },
  {
    key: 'bg_earth',
    path: 'assets/phaser/backgrounds/lunar/bg_earth.png',
    xRatio: 0.83,
    yRatio: 0.19,
    widthRatio: 0.19,
    heightRatio: 0.33,
    depth: 2,
    alpha: 0.7,
  },
  {
    key: 'bg_lunar_ground',
    path: 'assets/phaser/backgrounds/lunar/bg_lunar_ground_removebg.png',
    xRatio: 0.5,
    yRatio: 0.85,
    widthRatio: 1.04,
    heightRatio: 0.52,
    depth: 4,
  },
];

function spriteKeyFromPath(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  const lastDot = path.lastIndexOf('.');
  return path.slice(lastSlash + 1, lastDot);
}

type DemoPulseState = 'none' | 'objective' | 'completion';

export class MainBaseScene extends Phaser.Scene {
  private readonly backgroundLayers: BackgroundLayerView[] = [];
  private bridgeSubscription = new Subscription();
  private readonly cropReadyFlashingModuleIds = new Set<string>();
  private readonly cropReadyFlashTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private demoPulseState: DemoPulseState = 'none';
  private readonly failedTextureKeys = new Set<string>();
  private hoveredModuleId?: string;
  private readonly layoutOverrides = new Map<string, ModuleLayoutPatch>();
  private selectedModuleId?: string;
  private readonly moduleViews = new Map<string, ModuleHotspotView>();

  constructor(private readonly sceneBridge: PhaserSceneBridge = NOOP_SCENE_BRIDGE) {
    super('MainBaseScene');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.failedTextureKeys.add(file.key);
    });
    const moduleAssets: PhaserAssetConfig[] = MVP_MODULE_HOTSPOTS.map((config) => ({
      key: spriteKeyFromPath(config.spritePath),
      path: config.spritePath,
    }));
    this.preloadAssets([...LUNAR_BACKGROUND_LAYERS, ...moduleAssets]);
  }

  create(): void {
    this.generateProceduralFallbackTextures();
    this.createBackgroundLayers();
    this.animateStarsLayer();
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
      const visual = this.add
        .image(0, 0, config.key)
        .setOrigin(0.5)
        .setDepth(config.depth)
        .setAlpha(config.alpha ?? 1);

      if (config.blendMode !== undefined) {
        visual.setBlendMode(config.blendMode);
      }

      this.backgroundLayers.push({ config, visual });
    }
  }

  private animateStarsLayer(): void {
    const starsView = this.backgroundLayers.find(({ config }) => config.key === 'bg_stars_far');
    if (starsView == null) { return; }
    this.tweens.add({
      targets: starsView.visual,
      alpha: { from: 0.15, to: 1.0 },
      ease: 'Sine.easeInOut',
      duration: 2000,
      hold: 500,
      yoyo: true,
      repeat: -1,
      repeatDelay: 800,
    });
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
      const sprite = this.add.image(0, 0, spriteKeyFromPath(config.spritePath)).setOrigin(0.5).setDepth(10);

      const hotspot = this.add
        .rectangle(0, 0, 1, 1, MODULE_HOTSPOT_FILL_COLOR, DEFAULT_MODULE_FILL_ALPHA)
        .setData('moduleId', config.id)
        .setOrigin(0.5)
        .setDepth(8)
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

      this.moduleViews.set(config.id, { config, hotspot, label, sprite });
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
    for (const { config, hotspot, label, sprite } of this.moduleViews.values()) {
      const effectiveLayout = this.resolveModuleLayout(config);
      const hotspotWidth = width * effectiveLayout.widthRatio;
      const hotspotHeight = height * effectiveLayout.heightRatio;
      const spriteWidth = width * effectiveLayout.spriteWidthRatio;
      const spriteHeight = height * effectiveLayout.spriteHeightRatio;
      const x = width * effectiveLayout.xRatio;
      const y = height * effectiveLayout.yRatio;

      hotspot.setPosition(x, y).setDisplaySize(hotspotWidth, hotspotHeight);
      label.setPosition(x, y - spriteHeight / 2 - 8);
      sprite.setPosition(x, y).setDisplaySize(spriteWidth, spriteHeight);
    }
  }

  private resolveModuleLayout(config: ModuleHotspotConfig): ModuleLayoutRatios {
    const override = this.layoutOverrides.get(config.id);

    return {
      xRatio: override?.xRatio ?? config.xRatio,
      yRatio: override?.yRatio ?? config.yRatio,
      widthRatio: override?.widthRatio ?? config.widthRatio,
      heightRatio: override?.heightRatio ?? config.heightRatio,
      spriteWidthRatio: override?.spriteWidthRatio ?? config.spriteWidthRatio,
      spriteHeightRatio: override?.spriteHeightRatio ?? config.spriteHeightRatio,
    };
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
    if (event.type === 'playObjectivePulse') {
      this.demoPulseState = 'objective';
      this.applyDemoPulseState();
      return;
    }

    if (event.type === 'playCompletionPulse') {
      this.demoPulseState = 'completion';
      this.applyDemoPulseState();
      return;
    }

    if (event.type === 'clearDemoPulse') {
      this.demoPulseState = 'none';
      this.applyDemoPulseState();
      return;
    }

    if (event.type === 'adjustModuleLayout') {
      const nextOverride = {
        ...(this.layoutOverrides.get(event.moduleId) ?? {}),
        ...event.patch,
      };

      this.layoutOverrides.set(event.moduleId, nextOverride);
      this.layoutModuleHotspots(this.scale.width, this.scale.height);
      return;
    }

    if (event.type === 'cropReady') {
      this.startCropReadyFlash(event.moduleId);
      return;
    }

    if (event.type === 'highlightModule') {
      this.selectedModuleId = event.moduleId;
      this.applyAllModuleVisualStates();
      return;
    }

    this.selectedModuleId = undefined;
    this.applyAllModuleVisualStates();
  }

  private applyDemoPulseState(): void {
    for (const { visual } of this.backgroundLayers) {
      if (this.demoPulseState === 'objective') {
        visual.setTint(OBJECTIVE_PULSE_TINT_COLOR);
        continue;
      }

      if (this.demoPulseState === 'completion') {
        visual.setTint(COMPLETION_PULSE_TINT_COLOR);
        continue;
      }

      visual.clearTint();
    }
  }

  private startCropReadyFlash(moduleId: string): void {
    const existing = this.cropReadyFlashTimers.get(moduleId);
    if (existing !== undefined) clearTimeout(existing);

    this.cropReadyFlashingModuleIds.add(moduleId);
    this.applyModuleVisualState(moduleId);

    const timer = setTimeout(() => {
      this.cropReadyFlashingModuleIds.delete(moduleId);
      this.cropReadyFlashTimers.delete(moduleId);
      this.applyModuleVisualState(moduleId);
    }, CROP_READY_FLASH_DURATION_MS);

    this.cropReadyFlashTimers.set(moduleId, timer);
  }

  private applyAllModuleVisualStates(): void {
    for (const moduleId of this.moduleViews.keys()) {
      this.applyModuleVisualState(moduleId);
    }
  }

  private applyModuleVisualState(moduleId: string): void {
    const view = this.moduleViews.get(moduleId)!;

    if (this.cropReadyFlashingModuleIds.has(moduleId)) {
      clearSpriteGlow(view.sprite);
      view.hotspot
        .setFillStyle(MODULE_HOTSPOT_FILL_COLOR, HOVER_MODULE_FILL_ALPHA)
        .setStrokeStyle(2, CROP_READY_FLASH_COLOR, CROP_READY_FLASH_STROKE_ALPHA);
      view.sprite.setTint(CROP_READY_FLASH_COLOR);
      view.label.setVisible(true).setAlpha(0.95);
      return;
    }

    if (this.selectedModuleId === moduleId) {
      clearSpriteGlow(view.sprite);
      view.hotspot
        .setFillStyle(MODULE_HOTSPOT_FILL_COLOR, SELECTED_MODULE_FILL_ALPHA)
        .setStrokeStyle(2, SELECTED_MODULE_STROKE_COLOR, SELECTED_MODULE_STROKE_ALPHA);
      view.sprite.setTint(SELECTED_GLOW_COLOR);
      view.label.setVisible(true).setAlpha(1);
      return;
    }

    if (this.hoveredModuleId === moduleId) {
      clearSpriteGlow(view.sprite);
      view.hotspot
        .setFillStyle(MODULE_HOTSPOT_FILL_COLOR, HOVER_MODULE_FILL_ALPHA)
        .setStrokeStyle(2, HOVER_MODULE_STROKE_COLOR, HOVER_MODULE_STROKE_ALPHA);
      view.sprite.clearTint();
      view.label.setVisible(true).setAlpha(0.95);
      return;
    }

    clearSpriteGlow(view.sprite);
    view.hotspot
      .setFillStyle(MODULE_HOTSPOT_FILL_COLOR, DEFAULT_MODULE_FILL_ALPHA)
      .setStrokeStyle(1, DEFAULT_MODULE_STROKE_COLOR, DEFAULT_MODULE_STROKE_ALPHA);
    view.sprite.clearTint();
    view.label.setVisible(false).setAlpha(0);
  }

  private unsubscribeFromBridgeCommands(): void {
    this.bridgeSubscription.unsubscribe();
    for (const timer of this.cropReadyFlashTimers.values()) {
      clearTimeout(timer);
    }
    this.cropReadyFlashTimers.clear();
    this.cropReadyFlashingModuleIds.clear();
  }

  private generateProceduralFallbackTextures(): void {
    const W = 800;
    const H = 600;

    for (const layer of LUNAR_BACKGROUND_LAYERS) {
      if (!this.failedTextureKeys.has(layer.key) && this.textures.exists(layer.key)) {
        continue;
      }

      const g = this.make.graphics({ x: 0, y: 0 }, false);

      if (layer.key === 'bg_sky_base') {
        g.fillGradientStyle(0x020b15, 0x020b15, 0x050b13, 0x050b13, 1);
        g.fillRect(0, 0, W, H);
      } else if (layer.key === 'bg_stars_far') {
        g.fillStyle(0x000000, 0);
        g.fillRect(0, 0, W, H);
        for (let i = 0; i < 220; i++) {
          const sx = Math.floor(Math.random() * W);
          const sy = Math.floor(Math.random() * H);
          const sr = Math.random() * 1.5 + 0.5;
          const sa = 0.4 + Math.random() * 0.6;
          g.fillStyle(0xffffff, sa);
          g.fillCircle(sx, sy, sr);
        }
      } else if (layer.key === 'bg_earth') {
        g.fillStyle(0x000000, 0);
        g.fillRect(0, 0, W, H);
        g.fillStyle(0x1a5276, 1);
        g.fillCircle(100, 100, 75);
        g.fillStyle(0x27ae60, 0.65);
        g.fillEllipse(80, 90, 55, 38);
        g.fillStyle(0xffffff, 0.15);
        g.fillCircle(100, 100, 75);
      } else if (layer.key === 'bg_lunar_ground') {
        g.fillStyle(0x1a2332, 1);
        g.fillRect(0, 0, W, H);
      } else {
        g.fillStyle(0x050b13, 1);
        g.fillRect(0, 0, W, H);
      }

      g.generateTexture(layer.key, W, H);
      g.destroy();
    }
  }

}
