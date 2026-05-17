import Phaser from 'phaser';
import { EMPTY, Subscription, type Observable } from 'rxjs';

import type { AngularToPhaserEvent, PhaserToAngularEvent } from '../../bridge';

const TEMP_BACKGROUND_KEY = 'main-base-background';
const TEMP_BACKGROUND_PATH = 'assets/backgrounds/bg_lunar_prototype.png';

export interface PhaserSceneBridge {
  readonly angularEvents$: Observable<AngularToPhaserEvent>;
  emitFromPhaser(event: PhaserToAngularEvent): void;
}

interface ModulePlaceholderConfig {
  readonly id: string;
  readonly label: string;
  readonly xRatio: number;
  readonly yRatio: number;
  readonly widthRatio: number;
  readonly heightRatio: number;
}

interface ModulePlaceholderView {
  readonly config: ModulePlaceholderConfig;
  readonly hotspot: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
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

const MVP_MODULE_PLACEHOLDERS: readonly ModulePlaceholderConfig[] = [
  {
    id: 'module_command_center_basic_01',
    label: 'Command',
    xRatio: 0.5,
    yRatio: 0.42,
    widthRatio: 0.16,
    heightRatio: 0.15,
  },
  {
    id: 'module_greenhouse_basic_01',
    label: 'Greenhouse',
    xRatio: 0.3,
    yRatio: 0.62,
    widthRatio: 0.18,
    heightRatio: 0.14,
  },
  {
    id: 'module_processing_basic_01',
    label: 'Processing',
    xRatio: 0.5,
    yRatio: 0.66,
    widthRatio: 0.16,
    heightRatio: 0.14,
  },
  {
    id: 'module_shipping_hangar_basic_01',
    label: 'Shipping',
    xRatio: 0.7,
    yRatio: 0.62,
    widthRatio: 0.18,
    heightRatio: 0.14,
  },
  {
    id: 'module_storage_basic_01',
    label: 'Storage',
    xRatio: 0.5,
    yRatio: 0.82,
    widthRatio: 0.2,
    heightRatio: 0.12,
  },
];

export class MainBaseScene extends Phaser.Scene {
  private background?: Phaser.GameObjects.Image;
  private bridgeSubscription = new Subscription();
  private hoveredModuleId?: string;
  private selectedModuleId?: string;
  private readonly moduleViews = new Map<string, ModulePlaceholderView>();

  constructor(private readonly sceneBridge: PhaserSceneBridge = NOOP_SCENE_BRIDGE) {
    super('MainBaseScene');
  }

  preload(): void {
    if (!this.textures.exists(TEMP_BACKGROUND_KEY)) {
      this.load.image(TEMP_BACKGROUND_KEY, TEMP_BACKGROUND_PATH);
    }
  }

  create(): void {
    this.background = this.add.image(0, 0, TEMP_BACKGROUND_KEY);
    this.createModulePlaceholders();
    this.subscribeToBridgeCommands();
    this.sceneBridge.emitFromPhaser({ type: 'sceneReady' });

    this.layoutBackground(this.scale.width, this.scale.height);
    this.layoutModulePlaceholders(this.scale.width, this.scale.height);
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: { width: number; height: number }): void {
    this.layoutBackground(gameSize.width, gameSize.height);
    this.layoutModulePlaceholders(gameSize.width, gameSize.height);
  }

  private layoutBackground(width: number, height: number): void {
    this.background?.setPosition(width / 2, height / 2).setDisplaySize(width, height);
  }

  private createModulePlaceholders(): void {
    for (const config of MVP_MODULE_PLACEHOLDERS) {
      const hotspot = this.add
        .rectangle(0, 0, 1, 1, DEFAULT_MODULE_FILL_COLOR, 0.4)
        .setData('moduleId', config.id)
        .setOrigin(0.5)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(0, 0, config.label, {
          align: 'center',
          color: '#d9f7ff',
          fontFamily: 'monospace',
          fontSize: '24px',
        })
        .setOrigin(0.5)
        .setDepth(11);

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

  private layoutModulePlaceholders(width: number, height: number): void {
    for (const { config, hotspot, label } of this.moduleViews.values()) {
      const moduleWidth = width * config.widthRatio;
      const moduleHeight = height * config.heightRatio;
      const x = width * config.xRatio;
      const y = height * config.yRatio;

      hotspot.setPosition(x, y).setDisplaySize(moduleWidth, moduleHeight);
      label.setPosition(x, y);
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
        .setFillStyle(SELECTED_MODULE_FILL_COLOR, 0.7)
        .setStrokeStyle(4, SELECTED_MODULE_STROKE_COLOR, 1);
      return;
    }

    if (this.hoveredModuleId === moduleId) {
      view.hotspot.setFillStyle(HOVER_MODULE_FILL_COLOR, 0.55).setStrokeStyle(3, HOVER_MODULE_STROKE_COLOR, 1);
      return;
    }

    view.hotspot.setFillStyle(DEFAULT_MODULE_FILL_COLOR, 0.4).setStrokeStyle(2, DEFAULT_MODULE_STROKE_COLOR, 0.9);
  }

  private unsubscribeFromBridgeCommands(): void {
    this.bridgeSubscription.unsubscribe();
  }
}
