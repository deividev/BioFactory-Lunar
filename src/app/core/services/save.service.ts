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
export const DEFAULT_SAVE_STORAGE_KEY = 'biofactory_lunar_save_slot_1';

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
    const saveData = this.gameState.toSaveData(savedAt);

    if (!isValidSaveData(saveData)) {
      return this.fail('invalid_save_data', 'Saved game data is invalid.', 'warning');
    }

    try {
      this.storage.setItem(DEFAULT_SAVE_STORAGE_KEY, JSON.stringify(saveData));
      this.alerts.addSuccess('Game saved.');
      return { success: true };
    } catch {
      return this.fail('save_failed', 'Unable to save game.', 'critical');
    }
  }

  loadGame(): SaveActionResult<SaveData> {
    let rawSaveData: string | null;

    try {
      rawSaveData = this.storage.getItem(DEFAULT_SAVE_STORAGE_KEY);
    } catch {
      return this.fail('load_failed', 'Unable to load game.', 'critical');
    }

    if (rawSaveData === null) {
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
      this.alerts.addSuccess('Game loaded.');
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

  private fail(code: SaveActionFailureCode, message: string, severity: 'warning' | 'critical'): SaveActionFailure {
    if (severity === 'warning') {
      this.alerts.addWarning(message);
    } else {
      this.alerts.addCritical(message);
    }

    return { success: false, code, message };
  }
}