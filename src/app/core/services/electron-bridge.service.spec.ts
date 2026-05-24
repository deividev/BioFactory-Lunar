import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ElectronBridgeService } from './electron-bridge.service';

type MockElectronApi = {
  getAppVersion: () => Promise<string>;
  saveGame: (payload: string) => Promise<void>;
  loadGame: () => Promise<string | null>;
  hasSave: () => Promise<boolean>;
};

function stubElectronApi(overrides: Partial<MockElectronApi> = {}): MockElectronApi {
  const api: MockElectronApi = {
    getAppVersion: vi.fn().mockResolvedValue('1.0.0'),
    saveGame: vi.fn().mockResolvedValue(undefined),
    loadGame: vi.fn().mockResolvedValue(null),
    hasSave: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
  vi.stubGlobal('electronAPI', api);
  return api;
}

describe('ElectronBridgeService', () => {
  let service: ElectronBridgeService;

  beforeEach(() => {
    service = new ElectronBridgeService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false from isElectron() when electronAPI is not defined', () => {
    expect(service.isElectron()).toBe(false);
  });

  it('returns true from isElectron() when electronAPI is defined', () => {
    stubElectronApi();
    expect(service.isElectron()).toBe(true);
  });

  it('delegates saveGame() to electronAPI.saveGame() with the given payload', async () => {
    const saveGameMock = vi.fn().mockResolvedValue(undefined);
    stubElectronApi({ saveGame: saveGameMock });

    await service.saveGame('{"key":"value"}');

    expect(saveGameMock).toHaveBeenCalledOnce();
    expect(saveGameMock).toHaveBeenCalledWith('{"key":"value"}');
  });

  it('delegates loadGame() to electronAPI.loadGame() and returns the save string', async () => {
    const loadGameMock = vi.fn().mockResolvedValue('{"saveVersion":3}');
    stubElectronApi({ loadGame: loadGameMock });

    const result = await service.loadGame();

    expect(loadGameMock).toHaveBeenCalledOnce();
    expect(result).toBe('{"saveVersion":3}');
  });

  it('delegates loadGame() and returns null when no save file exists', async () => {
    const loadGameMock = vi.fn().mockResolvedValue(null);
    stubElectronApi({ loadGame: loadGameMock });

    const result = await service.loadGame();

    expect(result).toBeNull();
  });

  it('delegates hasSave() to electronAPI.hasSave() and returns true when a save exists', async () => {
    const hasSaveMock = vi.fn().mockResolvedValue(true);
    stubElectronApi({ hasSave: hasSaveMock });

    const result = await service.hasSave();

    expect(hasSaveMock).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it('delegates hasSave() and returns false when no save exists', async () => {
    const hasSaveMock = vi.fn().mockResolvedValue(false);
    stubElectronApi({ hasSave: hasSaveMock });

    const result = await service.hasSave();

    expect(result).toBe(false);
  });
});
