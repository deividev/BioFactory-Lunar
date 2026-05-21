import { Injectable } from '@angular/core';

import { CURRENT_SAVE_VERSION, type SaveData } from '../models';
import { AlertService } from './alert.service';
import { GameStateService } from './game-state.service';

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type SaveActionFailureCode = 'save_not_found' | 'json_parse_failed' | 'invalid_save_data' | 'save_failed' | 'load_failed';
type SaveActionFailure = { readonly success: false; readonly code: SaveActionFailureCode; readonly message: string };
type SaveActionSuccess<T = undefined> = T extends undefined
  ? { readonly success: true }
  : { readonly success: true; readonly data: T };
export type SaveActionResult<T = undefined> = SaveActionSuccess<T> | SaveActionFailure;
export type RestoreLatestSaveResult = SaveActionResult<SaveData> | { readonly success: true; readonly restored: false };
export const DEFAULT_SAVE_STORAGE_KEY = 'biofactory_lunar_save_slot_1';
export const DEFAULT_AUTOSAVE_INTERVAL_MS = 10000;

const SAVE_REQUIRED_BRANCH_KEYS = [
  'meta', 'clock', 'resources', 'inventory', 'greenhouse', 'machines', 'contracts', 'shipments',
  'modules', 'robots', 'research', 'events', 'alerts', 'tutorial', 'settings',
] as const satisfies readonly (keyof SaveData)[];

const unavailableStorage: SaveStorage = {
  getItem: () => {
    throw new Error('LocalStorage is unavailable.');
  },
  setItem: () => {
    throw new Error('LocalStorage is unavailable.');
  },
};

function createBrowserSaveStorage(): SaveStorage {
  return typeof globalThis.localStorage === 'undefined' ? unavailableStorage : globalThis.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidSaveData(value: unknown): value is SaveData {
  return (
    isRecord(value) &&
    value['saveVersion'] === CURRENT_SAVE_VERSION &&
    typeof value['savedAt'] === 'string' &&
    SAVE_REQUIRED_BRANCH_KEYS.every((key) => key in value)
  );
}

@Injectable({ providedIn: 'root' })
export class SaveService {
  private storage = createBrowserSaveStorage();
  private autosaveTimerId: ReturnType<typeof setInterval> | undefined;
  private autosaveFailureAlertShown = false;

  constructor(
    private readonly gameState: GameStateService,
    private readonly alerts: AlertService,
  ) {}

  static createWithStorage(gameState: GameStateService, alerts: AlertService, storage: SaveStorage): SaveService {
    const service = new SaveService(gameState, alerts);
    service.storage = storage;
    return service;
  }

  saveGame(savedAt = new Date().toISOString()): SaveActionResult {
    return this.writeSave(savedAt, { notifyOnSuccess: true, dedupeAutosaveFailures: false });
  }

  restoreLatestGame(): RestoreLatestSaveResult {
    return this.readSave({ notifyOnSuccess: false, warnOnMissingSave: false });
  }

  startAutosave(intervalMs = DEFAULT_AUTOSAVE_INTERVAL_MS): void {
    if (this.autosaveTimerId !== undefined) {
      return;
    }

    this.autosaveTimerId = setInterval(() => {
      this.writeSave(new Date().toISOString(), { notifyOnSuccess: false, dedupeAutosaveFailures: true });
    }, intervalMs);
  }

  stopAutosave(): void {
    if (this.autosaveTimerId === undefined) {
      return;
    }

    clearInterval(this.autosaveTimerId);
    this.autosaveTimerId = undefined;
  }

  private writeSave(
    savedAt: string,
    options: { notifyOnSuccess: boolean; dedupeAutosaveFailures: boolean },
  ): SaveActionResult {
    const saveData = this.gameState.toSaveData(savedAt);

    if (!isValidSaveData(saveData)) {
      return this.fail('invalid_save_data', 'Saved game data is invalid.', 'warning', options.dedupeAutosaveFailures);
    }

    try {
      this.storage.setItem(DEFAULT_SAVE_STORAGE_KEY, JSON.stringify(saveData));

      if (options.notifyOnSuccess) {
        this.alerts.addSuccess('Game saved.');
      }

      this.autosaveFailureAlertShown = false;
      return { success: true };
    } catch {
      return this.fail('save_failed', 'Unable to save game.', 'critical', options.dedupeAutosaveFailures);
    }
  }

  loadGame(): SaveActionResult<SaveData> {
    const result = this.readSave({ notifyOnSuccess: true, warnOnMissingSave: true });

    if (result.success && 'restored' in result) {
      return this.fail('save_not_found', 'No saved game found.', 'warning');
    }

    return result;
  }

  private readSave(options: { notifyOnSuccess: boolean; warnOnMissingSave: boolean }): RestoreLatestSaveResult {
    let rawSaveData: string | null;

    try {
      rawSaveData = this.storage.getItem(DEFAULT_SAVE_STORAGE_KEY);
    } catch {
      return this.fail('load_failed', 'Unable to load game.', 'critical');
    }

    if (rawSaveData === null) {
      if (!options.warnOnMissingSave) {
        return { success: true, restored: false };
      }

      return this.fail('save_not_found', 'No saved game found.', 'warning');
    }

    let parsedSaveData: unknown;

    try {
      parsedSaveData = JSON.parse(rawSaveData);
    } catch {
      return this.fail('json_parse_failed', 'Saved game data could not be parsed.', 'warning');
    }

    if (!isValidSaveData(parsedSaveData)) {
      return this.fail('invalid_save_data', 'Saved game data is invalid.', 'warning');
    }

    try {
      this.gameState.loadFromSave(parsedSaveData);

      if (options.notifyOnSuccess) {
        this.alerts.addSuccess('Game loaded.');
      }

      return { success: true, data: parsedSaveData };
    } catch {
      return this.fail('load_failed', 'Unable to load game.', 'critical');
    }
  }

  hasSave(): boolean {
    try {
      return this.storage.getItem(DEFAULT_SAVE_STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }

  private fail(
    code: SaveActionFailureCode,
    message: string,
    severity: 'warning' | 'critical',
    dedupeAutosaveFailures = false,
  ): SaveActionFailure {
    if (dedupeAutosaveFailures && this.autosaveFailureAlertShown) {
      return { success: false, code, message };
    }

    if (severity === 'warning') {
      this.alerts.addWarning(message);
    } else {
      this.alerts.addCritical(message);
    }

    if (dedupeAutosaveFailures) {
      this.autosaveFailureAlertShown = true;
    }

    return { success: false, code, message };
  }
}
