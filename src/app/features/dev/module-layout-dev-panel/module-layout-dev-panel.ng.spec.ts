import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhaserBridgeService } from '../../../game/bridge';
import { MVP_MODULE_HOTSPOTS } from '../../../game/phaser/scenes/main-base-layout.config';
import { MODULE_LAYOUT_STORAGE_KEY, ModuleLayoutDevPanel } from './module-layout-dev-panel';

describe('ModuleLayoutDevPanel', () => {
  let fixture: ComponentFixture<ModuleLayoutDevPanel>;
  let el: HTMLElement;
  let phaserBridge: PhaserBridgeService;
  const originalFetch = globalThis.fetch;
  const originalElectronApi = (globalThis as typeof globalThis & { electronAPI?: Window['electronAPI'] }).electronAPI;
  const originalLocalStorage = globalThis.localStorage;
  const originalClipboard = navigator.clipboard;

  function setClipboard(writeText?: (value: string) => Promise<void>): void {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: writeText ? { writeText } : undefined,
    });
  }

  async function clickAction(testId: string): Promise<void> {
    const button = el.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);

    expect(button).not.toBeNull();

    button!.click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function statusText(): string {
    return el.querySelector('[data-testid="layout-copy-status"]')?.textContent?.trim() ?? '';
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
    globalThis.localStorage.removeItem(MODULE_LAYOUT_STORAGE_KEY);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });

    if (originalElectronApi === undefined) {
      delete (globalThis as typeof globalThis & { electronAPI?: Window['electronAPI'] }).electronAPI;
    } else {
      (globalThis as typeof globalThis & { electronAPI?: Window['electronAPI'] }).electronAPI = originalElectronApi;
    }

    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModuleLayoutDevPanel] }).compileComponents();
    fixture = TestBed.createComponent(ModuleLayoutDevPanel);
    el = fixture.nativeElement;
    phaserBridge = TestBed.inject(PhaserBridgeService);
    fixture.detectChanges();
  });

  it('renders the dev panel heading', () => {
    expect(el.textContent).toContain('Module Layout');
  });

  it('sends a layout patch when a slider changes', () => {
    const spy = vi.spyOn(phaserBridge, 'sendModuleLayoutAdjust');
    const slider = el.querySelector<HTMLInputElement>('[data-testid="layout-slider-xRatio"]');

    expect(slider).not.toBeNull();

    slider!.value = '0.42';
    slider!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('module_command_center_basic_01', { xRatio: 0.42 });
    expect(JSON.parse(localStorage.getItem(MODULE_LAYOUT_STORAGE_KEY) ?? '{}')).toEqual({
      module_command_center_basic_01: { xRatio: 0.42, yRatio: 0.77, widthRatio: 0.15, heightRatio: 0.1, spriteWidthRatio: 0.26, spriteHeightRatio: 0.27 },
    });
  });

  it('restores persisted layouts and reapplies them when the Phaser scene becomes ready', () => {
    localStorage.setItem(
      MODULE_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        module_command_center_basic_01: {
          xRatio: 0.41,
          yRatio: 0.905,
          widthRatio: 0.15,
          heightRatio: 0.1,
          spriteWidthRatio: 0.29,
          spriteHeightRatio: 0.21,
        },
      }),
    );

    const persistedFixture = TestBed.createComponent(ModuleLayoutDevPanel);
    const persistedBridge = TestBed.inject(PhaserBridgeService);
    const spy = vi.spyOn(persistedBridge, 'sendModuleLayoutAdjust');

    persistedFixture.detectChanges();

    const slider = persistedFixture.nativeElement.querySelector('[data-testid="layout-slider-xRatio"]') as HTMLInputElement | null;

    expect(slider?.value).toBe('0.41');
    expect(spy).toHaveBeenCalledWith('module_command_center_basic_01', {
      xRatio: 0.41,
      yRatio: 0.905,
      widthRatio: 0.15,
      heightRatio: 0.1,
      spriteWidthRatio: 0.29,
      spriteHeightRatio: 0.21,
    });

    spy.mockClear();
    persistedBridge.emitFromPhaser({ type: 'sceneReady' });

    expect(spy).toHaveBeenCalledWith('module_command_center_basic_01', {
      xRatio: 0.41,
      yRatio: 0.905,
      widthRatio: 0.15,
      heightRatio: 0.1,
      spriteWidthRatio: 0.29,
      spriteHeightRatio: 0.21,
    });
  });

  it('ignores Phaser events that are not scene-ready notifications', () => {
    localStorage.setItem(
      MODULE_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        module_command_center_basic_01: {
          xRatio: 0.41,
          yRatio: 0.905,
          widthRatio: 0.15,
          heightRatio: 0.1,
          spriteWidthRatio: 0.29,
          spriteHeightRatio: 0.21,
        },
      }),
    );

    const persistedFixture = TestBed.createComponent(ModuleLayoutDevPanel);
    const persistedBridge = TestBed.inject(PhaserBridgeService);
    const spy = vi.spyOn(persistedBridge, 'sendModuleLayoutAdjust');

    persistedFixture.detectChanges();
    spy.mockClear();
    persistedBridge.emitFromPhaser({ type: 'moduleHovered', moduleId: 'module_command_center_basic_01' });

    expect(spy).not.toHaveBeenCalled();
  });

  it('clears persisted layouts when reset all returns everything to defaults', () => {
    const slider = el.querySelector<HTMLInputElement>('[data-testid="layout-slider-xRatio"]');
    const resetButton = el.querySelector<HTMLButtonElement>('[data-testid="layout-reset-all"]');

    expect(slider).not.toBeNull();
    expect(resetButton).not.toBeNull();

    slider!.value = '0.42';
    slider!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(localStorage.getItem(MODULE_LAYOUT_STORAGE_KEY)).not.toBeNull();

    resetButton!.click();
    fixture.detectChanges();

    expect(localStorage.getItem(MODULE_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it('resets the selected module back to its defaults', async () => {
    const spy = vi.spyOn(phaserBridge, 'sendModuleLayoutAdjust');
    const slider = el.querySelector<HTMLInputElement>('[data-testid="layout-slider-xRatio"]');
    const resetButton = el.querySelector<HTMLButtonElement>('[data-testid="layout-reset-selected"]');

    expect(slider).not.toBeNull();
    expect(resetButton).not.toBeNull();

    slider!.value = '0.42';
    slider!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    setClipboard(vi.fn().mockResolvedValue(undefined));
    await clickAction('layout-copy-config');

    resetButton!.click();
    fixture.detectChanges();

    expect(slider!.value).toBe(String(MVP_MODULE_HOTSPOTS[0]!.xRatio));
    expect(spy).toHaveBeenLastCalledWith(MVP_MODULE_HOTSPOTS[0]!.id, {
      xRatio: MVP_MODULE_HOTSPOTS[0]!.xRatio,
      yRatio: MVP_MODULE_HOTSPOTS[0]!.yRatio,
      widthRatio: MVP_MODULE_HOTSPOTS[0]!.widthRatio,
      heightRatio: MVP_MODULE_HOTSPOTS[0]!.heightRatio,
      spriteWidthRatio: MVP_MODULE_HOTSPOTS[0]!.spriteWidthRatio,
      spriteHeightRatio: MVP_MODULE_HOTSPOTS[0]!.spriteHeightRatio,
    });
    expect(localStorage.getItem(MODULE_LAYOUT_STORAGE_KEY)).toBeNull();
    expect(statusText()).toContain('Adjust values, then click "Apply to source".');
  });

  it('switches the selected module and resets the status banner', async () => {
    const select = el.querySelector<HTMLSelectElement>('[data-testid="layout-module-select"]');
    const xSlider = el.querySelector<HTMLInputElement>('[data-testid="layout-slider-xRatio"]');

    expect(select).not.toBeNull();
    expect(xSlider).not.toBeNull();

    setClipboard(vi.fn().mockResolvedValue(undefined));
    await clickAction('layout-copy-config');

    select!.value = 'module_greenhouse_basic_01';
    select!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(xSlider!.value).toBe(String(MVP_MODULE_HOTSPOTS[1]!.xRatio));
    expect(statusText()).toContain('Adjust values, then click "Apply to source".');
  });

  it('ignores reset selected requests for unknown module ids', () => {
    const sendPatchSpy = vi.spyOn(phaserBridge, 'sendModuleLayoutAdjust');
    const component = fixture.componentInstance as unknown as {
      selectedModuleId: { set: (value: string) => void };
      resetSelected: () => void;
    };

    component.selectedModuleId.set('module_unknown_01');
    component.resetSelected();

    expect(sendPatchSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(MODULE_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it('ignores invalid persisted layouts and keeps valid numeric overrides', () => {
    localStorage.setItem(
      MODULE_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        module_command_center_basic_01: {
          xRatio: 'nope',
          yRatio: 0.91,
          widthRatio: Number.NaN,
          heightRatio: 0.13,
          spriteWidthRatio: 0.33,
          spriteHeightRatio: 0.2,
        },
        module_greenhouse_basic_01: 'invalid-shape',
      }),
    );

    const persistedFixture = TestBed.createComponent(ModuleLayoutDevPanel);
    persistedFixture.detectChanges();

    const persistedEl = persistedFixture.nativeElement as HTMLElement;
    const xSlider = persistedEl.querySelector<HTMLInputElement>('[data-testid="layout-slider-xRatio"]');
    const ySlider = persistedEl.querySelector<HTMLInputElement>('[data-testid="layout-slider-yRatio"]');

    expect(xSlider?.value).toBe(String(MVP_MODULE_HOTSPOTS[0]!.xRatio));
    expect(ySlider?.value).toBe('0.91');
  });

  it('falls back to defaults for malformed or non-record persisted payloads', () => {
    localStorage.setItem(MODULE_LAYOUT_STORAGE_KEY, 'not-json');

    const malformedFixture = TestBed.createComponent(ModuleLayoutDevPanel);
    malformedFixture.detectChanges();

    const malformedEl = malformedFixture.nativeElement as HTMLElement;
    const malformedXSlider = malformedEl.querySelector<HTMLInputElement>('[data-testid="layout-slider-xRatio"]');

    expect(malformedXSlider?.value).toBe(String(MVP_MODULE_HOTSPOTS[0]!.xRatio));

    localStorage.setItem(MODULE_LAYOUT_STORAGE_KEY, JSON.stringify(['not-a-record']));

    const nonRecordFixture = TestBed.createComponent(ModuleLayoutDevPanel);
    nonRecordFixture.detectChanges();

    const nonRecordEl = nonRecordFixture.nativeElement as HTMLElement;
    const nonRecordXSlider = nonRecordEl.querySelector<HTMLInputElement>('[data-testid="layout-slider-xRatio"]');

    expect(nonRecordXSlider?.value).toBe(String(MVP_MODULE_HOTSPOTS[0]!.xRatio));
  });

  it('uses an in-memory fallback when localStorage is unavailable', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: undefined,
    });

    const storageLessFixture = TestBed.createComponent(ModuleLayoutDevPanel);
    storageLessFixture.detectChanges();

    const storageLessComponent = storageLessFixture.componentInstance as unknown as {
      updateRatio: (key: 'xRatio', rawValue: string) => void;
      resetAll: () => void;
    };

    expect(() => storageLessComponent.updateRatio('xRatio', '0.44')).not.toThrow();
    expect(() => storageLessComponent.resetAll()).not.toThrow();
  });

  it('falls back to hotspot defaults when serializing a missing layout entry', () => {
    const component = fixture.componentInstance as unknown as {
      moduleLayouts: { set: (value: Record<string, (typeof MVP_MODULE_HOTSPOTS)[number]>) => void };
      serializedAllModules: () => string;
      serializedScriptJson: () => string;
    };

    component.moduleLayouts.set({
      module_greenhouse_basic_01: { ...MVP_MODULE_HOTSPOTS[1]! },
    });

    expect(component.serializedAllModules()).toContain("id: 'module_command_center_basic_01'");
    expect(JSON.parse(component.serializedScriptJson())).toMatchObject({
      module_command_center_basic_01: {
        xRatio: MVP_MODULE_HOTSPOTS[0]!.xRatio,
        yRatio: MVP_MODULE_HOTSPOTS[0]!.yRatio,
      },
    });
  });

  it('exposes undefined selected layout data when no module is selected', () => {
    const component = fixture.componentInstance as unknown as {
      selectedModuleId: { set: (value: string) => void };
      selectedLayout: () => unknown;
      serializedConfig: () => string | undefined;
    };

    component.selectedModuleId.set('');

    expect(component.selectedLayout()).toBeUndefined();
    expect(component.serializedConfig()).toBeUndefined();
  });

  it('applies layout JSON through the Electron bridge when available', async () => {
    const applyDevLayouts = vi.fn().mockResolvedValue(undefined);

    (globalThis as typeof globalThis & { electronAPI?: Window['electronAPI'] }).electronAPI = {
      saveGame: vi.fn(),
      loadGame: vi.fn(),
      hasSave: vi.fn(),
      applyDevLayouts,
      openExternalUrl: vi.fn(),
    } as unknown as Window['electronAPI'];

    const electronFixture = TestBed.createComponent(ModuleLayoutDevPanel);
    electronFixture.detectChanges();
    fixture = electronFixture;
    el = electronFixture.nativeElement as HTMLElement;

    await clickAction('layout-copy-json');

    expect(applyDevLayouts).toHaveBeenCalledOnce();
    expect(applyDevLayouts.mock.calls[0]?.[0]).toContain('module_command_center_basic_01');
    expect(statusText()).toContain('Applied to source!');
  });

  it('marks apply-to-source as failed when Electron apply throws', async () => {
    (globalThis as typeof globalThis & { electronAPI?: Window['electronAPI'] }).electronAPI = {
      saveGame: vi.fn(),
      loadGame: vi.fn(),
      hasSave: vi.fn(),
      applyDevLayouts: vi.fn().mockRejectedValue(new Error('boom')),
      openExternalUrl: vi.fn(),
    } as unknown as Window['electronAPI'];

    const electronFixture = TestBed.createComponent(ModuleLayoutDevPanel);
    electronFixture.detectChanges();
    fixture = electronFixture;
    el = electronFixture.nativeElement as HTMLElement;

    await clickAction('layout-copy-json');

    expect(statusText()).toContain('Failed.');
  });

  it('posts layout JSON to the local dev server before using the clipboard fallback', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchSpy as typeof globalThis.fetch;

    await clickAction('layout-copy-json');

    expect(fetchSpy).toHaveBeenCalledWith('http://127.0.0.1:4299/apply-layouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('module_command_center_basic_01'),
    });
    expect(statusText()).toContain('Applied to source!');
  });

  it('falls back to the clipboard when the local dev server does not apply layouts', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as typeof globalThis.fetch;
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    await clickAction('layout-copy-json');

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0]?.[0]).toContain('module_command_center_basic_01');
    expect(statusText()).toContain('Copied. Paste into scripts/module-layout-overrides.json');
  });

  it('reports clipboard failures for both apply-to-source and export flows', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as typeof globalThis.fetch;
    setClipboard(vi.fn().mockRejectedValue(new Error('denied')));

    await clickAction('layout-copy-json');
    expect(statusText()).toContain('Failed.');

    await clickAction('layout-copy-config');
    expect(statusText()).toContain('Failed.');

    setClipboard();

    await clickAction('layout-copy-config');
    expect(statusText()).toContain('Failed.');
  });

  it('fails apply-to-source when neither the dev server nor clipboard is available', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as typeof globalThis.fetch;
    setClipboard();

    await clickAction('layout-copy-json');

    expect(statusText()).toContain('Failed.');
  });

  it('exports the full hotspot config snippet to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    await clickAction('layout-copy-config');

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('export const MVP_MODULE_HOTSPOTS'));
    expect(writeText.mock.calls[0]?.[0]).toContain("spritePath: 'assets/phaser/modules/module_command_center.png'");
    expect(statusText()).toContain('Copied. Paste into scripts/module-layout-overrides.json');
  });

  it('tracks controls by their ratio key', () => {
    const component = fixture.componentInstance as unknown as {
      trackControl: (_index: number, control: { key: 'xRatio' }) => string;
    };

    expect(component.trackControl(0, { key: 'xRatio' })).toBe('xRatio');
  });
});