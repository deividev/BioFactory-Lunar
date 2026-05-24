import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertType, GameSpeed } from '../enums';
import { CURRENT_SAVE_VERSION } from '../models';
import { AlertService } from './alert.service';
import { ElectronBridgeService } from './electron-bridge.service';
import { GameStateService } from './game-state.service';
import { DEFAULT_SAVE_STORAGE_KEY, SaveService, type SaveStorage, isValidSaveData } from './save.service';

class MemorySaveStorage implements SaveStorage {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null { return this.items.get(key) ?? null; }
  setItem(key: string, value: string): void { this.items.set(key, value); }
}

class ThrowingSaveStorage implements SaveStorage {
  constructor(private readonly mode: 'read' | 'write') {}
  getItem(): string | null { if (this.mode === 'read') throw new Error('read unavailable'); return null; }
  setItem(): void { if (this.mode === 'write') throw new Error('write unavailable'); }
}

describe('SaveService', () => {
  let gameState: GameStateService;
  let alerts: AlertService;
  let storage: MemorySaveStorage;
  let service: SaveService;

  function setup(saveStorage: SaveStorage = new MemorySaveStorage()): void {
    gameState = new GameStateService();
    alerts = new AlertService(gameState);
    service = SaveService.createWithStorage(gameState, alerts, saveStorage);
    storage = saveStorage instanceof MemorySaveStorage ? saveStorage : new MemorySaveStorage();
  }

  function lastAlert(): { type: AlertType; message: string; dismissed: boolean } {
    return gameState.getSnapshot().alerts.at(-1)!;
  }

  beforeEach(() => setup());

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves the current state to the single MVP LocalStorage key and adds a success alert', async () => {
    gameState.updateResources((resources) => ({ ...resources, values: { ...resources.values, credits: 350 } }));

    expect(await service.saveGame('2026-05-19T12:30:00.000Z')).toEqual({ success: true });

    const parsed = JSON.parse(storage.getItem(DEFAULT_SAVE_STORAGE_KEY)!);
    expect(parsed).toMatchObject({
      saveVersion: CURRENT_SAVE_VERSION,
      savedAt: '2026-05-19T12:30:00.000Z',
      resources: { values: { credits: 350 } },
    });
    expect(parsed.ui).toBeUndefined();
    expect(parsed.state).toBeUndefined();
    expect(lastAlert()).toMatchObject({ type: AlertType.Success, message: 'Game saved.', dismissed: false });
  });

  it('loads a valid save from LocalStorage and restores game state with a success alert', async () => {
    gameState.updateResources((resources) => ({ ...resources, values: { ...resources.values, credits: 480, water: 75 } }));
    gameState.updateInventory((inventory) => ({ ...inventory, items: { ...inventory.items, biofood_pack: 4 } }));
    gameState.updateClock((clock) => ({ ...clock, elapsedSeconds: 300, day: 3, speed: GameSpeed.X2 }));
    await service.saveGame('2026-05-19T12:30:00.000Z');
    gameState.reset();

    const result = await service.loadGame();

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.resources.values['credits']).toBe(480);
    expect(gameState.getSnapshot().resources.values).toEqual({ credits: 480, energy: 100, water: 75, nutrients: 20 });
    expect(gameState.getSnapshot().inventory.items).toEqual({ seed_protein_leaf: 2, biofood_pack: 4 });
    expect(gameState.getSnapshot().clock).toEqual({ elapsedSeconds: 300, day: 3, speed: GameSpeed.X2 });
    expect(lastAlert()).toMatchObject({ type: AlertType.Success, message: 'Game loaded.' });
  });

  it('restores the latest save silently on startup without adding success alerts', async () => {
    gameState.updateResources((resources) => ({ ...resources, values: { ...resources.values, credits: 480, water: 75 } }));
    gameState.updateInventory((inventory) => ({ ...inventory, items: { ...inventory.items, biofood_pack: 4 } }));
    await service.saveGame('2026-05-19T12:30:00.000Z');
    gameState.reset();
    gameState.updateAlerts(() => []);

    const result = await service.restoreLatestGame();

    expect(result).toMatchObject({ success: true });
    expect(gameState.getSnapshot().resources.values).toEqual({ credits: 480, energy: 100, water: 75, nutrients: 20 });
    expect(gameState.getSnapshot().inventory.items).toEqual({ seed_protein_leaf: 2, biofood_pack: 4 });
    expect(gameState.getSnapshot().alerts).toHaveLength(0);
  });

  it('reports whether the single MVP save exists without mutating alerts', async () => {
    expect(await service.hasSave()).toBe(false);
    await service.saveGame('2026-05-19T12:30:00.000Z');
    expect(await service.hasSave()).toBe(true);
    expect(gameState.getSnapshot().alerts).toHaveLength(1);
  });

  it('returns a silent no-op when startup restore finds no save', async () => {
    expect(await service.restoreLatestGame()).toEqual({ success: true, restored: false });
    expect(gameState.getSnapshot().alerts).toHaveLength(0);
  });

  it('returns controlled warning failures for missing, corrupt, and invalid save payloads', async () => {
    const cases = [
      [undefined, 'save_not_found', 'No saved game found.'],
      ['{not valid json', 'json_parse_failed', 'Saved game data could not be parsed.'],
      [JSON.stringify({ saveVersion: CURRENT_SAVE_VERSION, savedAt: 'x' }), 'invalid_save_data', 'Saved game data is invalid.'],
    ] as const;

    for (const [payload, code, message] of cases) {
      setup();
      if (payload !== undefined) storage.setItem(DEFAULT_SAVE_STORAGE_KEY, payload);
      expect(await service.loadGame()).toEqual({ success: false, code, message });
      expect(lastAlert()).toMatchObject({ type: AlertType.Warning, message });
    }
  });

  it('returns controlled critical failures for storage and restore errors', async () => {
    setup(new ThrowingSaveStorage('write'));
    expect(await service.saveGame('2026-05-19T12:30:00.000Z')).toEqual({ success: false, code: 'save_failed', message: 'Unable to save game.' });
    expect(lastAlert()).toMatchObject({ type: AlertType.Critical, message: 'Unable to save game.' });

    setup(new ThrowingSaveStorage('read'));
    expect(await service.hasSave()).toBe(false);
    expect(await service.loadGame()).toEqual({ success: false, code: 'load_failed', message: 'Unable to load game.' });
    expect(lastAlert()).toMatchObject({ type: AlertType.Critical, message: 'Unable to load game.' });

    setup();
    const validSave = gameState.toSaveData('2026-05-19T12:30:00.000Z');
    storage.setItem(DEFAULT_SAVE_STORAGE_KEY, JSON.stringify(validSave));
    service = SaveService.createWithStorage({ loadFromSave: () => { throw new Error('restore failed'); } } as unknown as GameStateService, alerts, storage);
    expect(await service.loadGame()).toEqual({ success: false, code: 'load_failed', message: 'Unable to load game.' });
  });

  it('uses the default unavailable storage wrapper as a controlled failure in non-browser contexts', async () => {
    service = new SaveService(gameState, alerts, new ElectronBridgeService());
    expect(await service.saveGame('2026-05-19T12:30:00.000Z')).toMatchObject({ success: false, code: 'save_failed' });
    expect(await service.loadGame()).toMatchObject({ success: false, code: 'load_failed' });
  });

  it('rejects invalid save data during save before writing to storage', async () => {
    const invalidGameState = { toSaveData: () => ({ saveVersion: 999, savedAt: '2026-05-19T12:30:00.000Z' }) } as unknown as GameStateService;
    service = SaveService.createWithStorage(invalidGameState, alerts, storage);

    expect(await service.saveGame('2026-05-19T12:30:00.000Z')).toEqual({ success: false, code: 'invalid_save_data', message: 'Saved game data is invalid.' });
    expect(storage.getItem(DEFAULT_SAVE_STORAGE_KEY)).toBeNull();
    expect(lastAlert()).toMatchObject({ type: AlertType.Warning, message: 'Saved game data is invalid.' });
  });

  it('autosaves silently on an interval and persists updated inventory values', () => {
    vi.useFakeTimers();

    service.startAutosave(5000);
    gameState.updateInventory((inventory) => ({
      ...inventory,
      items: { ...inventory.items, biofood_pack: 3 },
    }));

    vi.advanceTimersByTime(5000);

    const parsed = JSON.parse(storage.getItem(DEFAULT_SAVE_STORAGE_KEY)!);
    expect(parsed.inventory.items['biofood_pack']).toBe(3);
    expect(gameState.getSnapshot().alerts).toHaveLength(0);
  });

  it('stops autosaving after stopAutosave is called', () => {
    vi.useFakeTimers();

    service.startAutosave(5000);
    service.stopAutosave();
    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 333 },
    }));

    vi.advanceTimersByTime(5000);

    expect(storage.getItem(DEFAULT_SAVE_STORAGE_KEY)).toBeNull();
  });

  it('deduplicates repeated autosave failure alerts until a save succeeds again', () => {
    vi.useFakeTimers();

    setup(new ThrowingSaveStorage('write'));
    service.startAutosave(5000);

    vi.advanceTimersByTime(10000);

    expect(gameState.getSnapshot().alerts.filter((alert) => alert.message === 'Unable to save game.')).toHaveLength(1);

    service.stopAutosave();
  });

  it('validates SaveData shape before loading it into game state', () => {
    const validSave = gameState.toSaveData('2026-05-19T12:30:00.000Z');
    const invalidValues = [null, [], { ...validSave, saveVersion: 999 }, { ...validSave, savedAt: 123 }, { saveVersion: CURRENT_SAVE_VERSION, savedAt: validSave.savedAt }];

    expect(isValidSaveData(validSave)).toBe(true);
    for (const value of invalidValues) expect(isValidSaveData(value)).toBe(false);
  });

  // ── Electron bridge path ────────────────────────────────────────────────────

  describe('Electron bridge routing', () => {
    function makeElectronBridge(overrides: Partial<{
      saveGame: (payload: string) => Promise<void>;
      loadGame: () => Promise<string | null>;
      hasSave: () => Promise<boolean>;
    }> = {}): ElectronBridgeService {
      return {
        isElectron: () => true,
        saveGame: vi.fn().mockResolvedValue(undefined),
        loadGame: vi.fn().mockResolvedValue(null),
        hasSave: vi.fn().mockResolvedValue(false),
        ...overrides,
      } as unknown as ElectronBridgeService;
    }

    it('routes saveGame() through the Electron bridge when in Electron context', async () => {
      const saveMock = vi.fn().mockResolvedValue(undefined);
      const bridge = makeElectronBridge({ saveGame: saveMock });
      service = SaveService.createWithStorage(gameState, alerts, storage, bridge);

      const result = await service.saveGame('2026-05-20T10:00:00.000Z');

      expect(result).toEqual({ success: true });
      expect(saveMock).toHaveBeenCalledOnce();
      const payload = JSON.parse(saveMock.mock.calls[0][0] as string);
      expect(payload).toMatchObject({ savedAt: '2026-05-20T10:00:00.000Z' });
      expect(lastAlert()).toMatchObject({ type: AlertType.Success, message: 'Game saved.' });
    });

    it('returns save_failed when the Electron bridge saveGame rejects', async () => {
      const bridge = makeElectronBridge({ saveGame: vi.fn().mockRejectedValue(new Error('disk full')) });
      service = SaveService.createWithStorage(gameState, alerts, storage, bridge);

      const result = await service.saveGame('2026-05-20T10:00:00.000Z');

      expect(result).toEqual({ success: false, code: 'save_failed', message: 'Unable to save game.' });
      expect(lastAlert()).toMatchObject({ type: AlertType.Critical, message: 'Unable to save game.' });
    });

    it('routes loadGame() through the Electron bridge, parses the result, and restores state', async () => {
      gameState.updateResources((r) => ({ ...r, values: { ...r.values, credits: 600 } }));
      const rawSave = JSON.stringify(gameState.toSaveData('2026-05-20T10:00:00.000Z'));
      gameState.reset();

      const bridge = makeElectronBridge({ loadGame: vi.fn().mockResolvedValue(rawSave) });
      service = SaveService.createWithStorage(gameState, alerts, storage, bridge);

      const result = await service.loadGame();

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.resources.values['credits']).toBe(600);
      expect(gameState.getSnapshot().resources.values['credits']).toBe(600);
      expect(lastAlert()).toMatchObject({ type: AlertType.Success, message: 'Game loaded.' });
    });

    it('returns save_not_found when the Electron bridge loadGame returns null', async () => {
      const bridge = makeElectronBridge({ loadGame: vi.fn().mockResolvedValue(null) });
      service = SaveService.createWithStorage(gameState, alerts, storage, bridge);

      const result = await service.loadGame();

      expect(result).toEqual({ success: false, code: 'save_not_found', message: 'No saved game found.' });
    });

    it('returns load_failed when the Electron bridge loadGame rejects', async () => {
      const bridge = makeElectronBridge({ loadGame: vi.fn().mockRejectedValue(new Error('ipc error')) });
      service = SaveService.createWithStorage(gameState, alerts, storage, bridge);

      const result = await service.loadGame();

      expect(result).toEqual({ success: false, code: 'load_failed', message: 'Unable to load game.' });
    });

    it('restores latest game silently from Electron bridge without adding alerts', async () => {
      gameState.updateResources((r) => ({ ...r, values: { ...r.values, credits: 750 } }));
      const rawSave = JSON.stringify(gameState.toSaveData('2026-05-20T10:00:00.000Z'));
      gameState.reset();
      gameState.updateAlerts(() => []);

      const bridge = makeElectronBridge({ loadGame: vi.fn().mockResolvedValue(rawSave) });
      service = SaveService.createWithStorage(gameState, alerts, storage, bridge);

      const result = await service.restoreLatestGame();

      expect(result).toMatchObject({ success: true });
      expect(gameState.getSnapshot().resources.values['credits']).toBe(750);
      expect(gameState.getSnapshot().alerts).toHaveLength(0);
    });

    it('returns a silent no-op from restoreLatestGame when Electron bridge returns null', async () => {
      const bridge = makeElectronBridge({ loadGame: vi.fn().mockResolvedValue(null) });
      service = SaveService.createWithStorage(gameState, alerts, storage, bridge);

      const result = await service.restoreLatestGame();

      expect(result).toEqual({ success: true, restored: false });
      expect(gameState.getSnapshot().alerts).toHaveLength(0);
    });

    it('routes hasSave() through the Electron bridge', async () => {
      const hasSaveMock = vi.fn().mockResolvedValue(true);
      const bridge = makeElectronBridge({ hasSave: hasSaveMock });
      service = SaveService.createWithStorage(gameState, alerts, storage, bridge);

      const result = await service.hasSave();

      expect(hasSaveMock).toHaveBeenCalledOnce();
      expect(result).toBe(true);
    });

    it('returns false from hasSave() when the Electron bridge hasSave rejects', async () => {
      const bridge = makeElectronBridge({ hasSave: vi.fn().mockRejectedValue(new Error('ipc error')) });
      service = SaveService.createWithStorage(gameState, alerts, storage, bridge);

      expect(await service.hasSave()).toBe(false);
    });
  });
});