import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ElectronBridgeService } from '../../../core/services/electron-bridge.service';
import { PhaserBridgeService } from '../../../game/bridge';
import {
  MODULE_LAYOUT_RATIO_KEYS,
  MVP_MODULE_HOTSPOTS,
  type ModuleHotspotConfig,
  type ModuleLayoutPatch,
  type ModuleLayoutRatioKey,
  type ModuleLayoutRatios,
} from '../../../game/phaser/scenes/main-base-layout.config';

interface ModuleLayoutControlDefinition {
  readonly key: ModuleLayoutRatioKey;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

type ModuleLayoutState = Record<string, ModuleHotspotConfig>;
type ModuleLayoutStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type PersistedModuleLayoutState = Record<string, ModuleLayoutRatios>;

export const MODULE_LAYOUT_STORAGE_KEY = 'biofactory_lunar_dev_module_layouts';

const MODULE_LAYOUT_CONTROLS: readonly ModuleLayoutControlDefinition[] = [
  { key: 'xRatio', label: 'X ratio', min: 0, max: 1, step: 0.005 },
  { key: 'yRatio', label: 'Y ratio', min: 0, max: 1, step: 0.005 },
  { key: 'widthRatio', label: 'Hotspot width', min: 0.05, max: 0.5, step: 0.005 },
  { key: 'heightRatio', label: 'Hotspot height', min: 0.05, max: 0.4, step: 0.005 },
  { key: 'spriteWidthRatio', label: 'Sprite width', min: 0.05, max: 0.8, step: 0.005 },
  { key: 'spriteHeightRatio', label: 'Sprite height', min: 0.05, max: 0.8, step: 0.005 },
];

const unavailableStorage: ModuleLayoutStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function createDefaultLayouts(): ModuleLayoutState {
  return Object.fromEntries(MVP_MODULE_HOTSPOTS.map((config) => [config.id, { ...config }])) as ModuleLayoutState;
}

function extractRatios(config: ModuleHotspotConfig): ModuleLayoutRatios {
  return {
    xRatio: config.xRatio,
    yRatio: config.yRatio,
    widthRatio: config.widthRatio,
    heightRatio: config.heightRatio,
    spriteWidthRatio: config.spriteWidthRatio,
    spriteHeightRatio: config.spriteHeightRatio,
  };
}

function createLayoutStorage(): ModuleLayoutStorage {
  return typeof globalThis.localStorage === 'undefined' ? unavailableStorage : globalThis.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasSameRatios(left: ModuleLayoutRatios, right: ModuleLayoutRatios): boolean {
  return MODULE_LAYOUT_RATIO_KEYS.every((key) => left[key] === right[key]);
}

function buildAllModulesSnippet(layouts: ModuleLayoutState): string {
  const entries = MVP_MODULE_HOTSPOTS.map((config) => {
    const layout = layouts[config.id] ?? config;

    return [
      '  {',
      `    id: '${config.id}',`,
      `    label: '${config.label}',`,
      `    xRatio: ${layout.xRatio},`,
      `    yRatio: ${layout.yRatio},`,
      `    widthRatio: ${layout.widthRatio},`,
      `    heightRatio: ${layout.heightRatio},`,
      `    spriteWidthRatio: ${layout.spriteWidthRatio},`,
      `    spriteHeightRatio: ${layout.spriteHeightRatio},`,
      `    spritePath: '${config.spritePath}',`,
      '  },',
    ].join('\n');
  });

  return [
    '// Paste into: main-base-layout.config.ts → MVP_MODULE_HOTSPOTS',
    'export const MVP_MODULE_HOTSPOTS: readonly ModuleHotspotConfig[] = [',
    ...entries,
    '];',
  ].join('\n');
}

function createPersistedLayoutState(layouts: ModuleLayoutState): PersistedModuleLayoutState {
  const persistedLayouts: PersistedModuleLayoutState = {};

  for (const config of MVP_MODULE_HOTSPOTS) {
    const layout = layouts[config.id];

    if (layout !== undefined && !hasSameRatios(layout, config)) {
      persistedLayouts[config.id] = extractRatios(layout);
    }
  }

  return persistedLayouts;
}

function loadPersistedLayouts(storage: ModuleLayoutStorage): ModuleLayoutState {
  const defaults = createDefaultLayouts();
  const rawPersistedLayouts = storage.getItem(MODULE_LAYOUT_STORAGE_KEY);

  if (rawPersistedLayouts === null) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(rawPersistedLayouts) as unknown;

    if (!isRecord(parsed)) {
      return defaults;
    }

    for (const config of MVP_MODULE_HOTSPOTS) {
      const persistedConfig = parsed[config.id];

      if (!isRecord(persistedConfig)) {
        continue;
      }

      defaults[config.id] = {
        ...defaults[config.id],
        ...Object.fromEntries(
          MODULE_LAYOUT_RATIO_KEYS.flatMap((key) => {
            const value = persistedConfig[key];
            return typeof value === 'number' && Number.isFinite(value) ? [[key, value]] : [];
          }),
        ),
      };
    }

    return defaults;
  } catch {
    return defaults;
  }
}

@Component({
  selector: 'app-module-layout-dev-panel',
  templateUrl: './module-layout-dev-panel.html',
  styleUrl: './module-layout-dev-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleLayoutDevPanel {
  protected readonly controls = MODULE_LAYOUT_CONTROLS;
  protected readonly copiedState = signal<'idle' | 'copied' | 'failed' | 'applied'>('idle');
  protected readonly moduleOptions = MVP_MODULE_HOTSPOTS;
  /* v8 ignore next -- MVP module hotspots are a fixed non-empty runtime constant. */
  protected readonly selectedModuleId = signal(MVP_MODULE_HOTSPOTS[0]?.id ?? '');

  private readonly destroyRef = inject(DestroyRef);
  private readonly electronBridge = inject(ElectronBridgeService);
  private readonly phaserBridge = inject(PhaserBridgeService);
  private readonly storage = createLayoutStorage();
  private readonly moduleLayouts = signal<ModuleLayoutState>(loadPersistedLayouts(this.storage));

  protected readonly selectedLayout = computed(() => this.moduleLayouts()[this.selectedModuleId()]);
  protected readonly serializedConfig = computed(() => JSON.stringify(this.selectedLayout(), null, 2));
  protected readonly serializedAllModules = computed(() => buildAllModulesSnippet(this.moduleLayouts()));
  /* v8 ignore next -- moduleLayouts is always seeded from MVP_MODULE_HOTSPOTS, so the fallback is defensive only. */
  protected readonly serializedScriptJson = computed(() =>
    JSON.stringify(
      Object.fromEntries(
        MVP_MODULE_HOTSPOTS.map((config) => [config.id, extractRatios(this.moduleLayouts()[config.id] ?? config)]),
      ),
      null,
      2,
    ),
  );

  ngOnInit(): void {
    this.reapplyPersistedLayouts();

    this.phaserBridge.phaserEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type === 'sceneReady') {
          this.reapplyPersistedLayouts();
        }
      });
  }

  protected selectModule(moduleId: string): void {
    this.selectedModuleId.set(moduleId);
    this.copiedState.set('idle');
  }

  protected updateRatio(key: ModuleLayoutRatioKey, rawValue: string): void {
    const moduleId = this.selectedModuleId();
    const value = Number(rawValue);

    this.moduleLayouts.update((layouts) => ({
      ...layouts,
      [moduleId]: {
        ...layouts[moduleId],
        [key]: value,
      },
    }));

    this.sendPatch(moduleId, { [key]: value });
    this.persistLayouts();
    this.copiedState.set('idle');
  }

  protected resetSelected(): void {
    const moduleId = this.selectedModuleId();
    const fallback = MVP_MODULE_HOTSPOTS.find((config) => config.id === moduleId);

    if (!fallback) {
      return;
    }

    this.moduleLayouts.update((layouts) => ({
      ...layouts,
      [moduleId]: { ...fallback },
    }));

    this.sendPatch(moduleId, extractRatios(fallback));
    this.persistLayouts();
    this.copiedState.set('idle');
  }

  protected resetAll(): void {
    const defaultLayouts = createDefaultLayouts();

    this.moduleLayouts.set(defaultLayouts);
    this.persistLayouts(defaultLayouts);

    for (const config of MVP_MODULE_HOTSPOTS) {
      this.sendPatch(config.id, extractRatios(config));
    }

    this.copiedState.set('idle');
  }

  protected async copyJsonForScript(): Promise<void> {
    if (this.electronBridge.isElectron()) {
      try {
        await this.electronBridge.applyDevLayouts(this.serializedScriptJson());
        this.copiedState.set('applied');
      } catch {
        this.copiedState.set('failed');
      }
      return;
    }

    // In browser dev mode: POST to the local companion server (pnpm dev starts it
    // automatically on port 4299). If the server is unreachable, fall back to clipboard.
    try {
      const response = await fetch('http://127.0.0.1:4299/apply-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overridesJson: this.serializedScriptJson() }),
      });

      if (response.ok) {
        this.copiedState.set('applied');
        return;
      }
    } catch {
      // Server not running — fall through to clipboard
    }

    const clipboard = navigator.clipboard;

    if (!clipboard) {
      this.copiedState.set('failed');
      return;
    }

    try {
      await clipboard.writeText(this.serializedScriptJson());
      this.copiedState.set('copied');
    } catch {
      this.copiedState.set('failed');
    }
  }

  protected async copyConfig(): Promise<void> {
    const clipboard = navigator.clipboard;

    if (!clipboard) {
      this.copiedState.set('failed');
      return;
    }

    try {
      await clipboard.writeText(this.serializedAllModules());
      this.copiedState.set('copied');
    } catch {
      this.copiedState.set('failed');
    }
  }

  protected trackControl(_index: number, control: ModuleLayoutControlDefinition): ModuleLayoutRatioKey {
    return control.key;
  }

  private sendPatch(moduleId: string, patch: ModuleLayoutPatch): void {
    this.phaserBridge.sendModuleLayoutAdjust(moduleId, patch);
  }

  private persistLayouts(layouts = this.moduleLayouts()): void {
    const persistedLayouts = createPersistedLayoutState(layouts);

    if (Object.keys(persistedLayouts).length === 0) {
      this.storage.removeItem(MODULE_LAYOUT_STORAGE_KEY);
      return;
    }

    this.storage.setItem(MODULE_LAYOUT_STORAGE_KEY, JSON.stringify(persistedLayouts));
  }

  private reapplyPersistedLayouts(): void {
    const layouts = this.moduleLayouts();

    for (const config of MVP_MODULE_HOTSPOTS) {
      const layout = layouts[config.id];

      if (layout !== undefined && !hasSameRatios(layout, config)) {
        this.sendPatch(config.id, extractRatios(layout));
      }
    }
  }
}