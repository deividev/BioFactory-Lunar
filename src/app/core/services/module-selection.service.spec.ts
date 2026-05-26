import { describe, expect, it, vi } from 'vitest';

import { PhaserBridgeService, type AngularToPhaserEvent } from '../../game/bridge';
import { PanelType } from '../enums';
import { createInitialGameState } from '../state';
import { GameStateService } from './game-state.service';
import { ModuleSelectionService } from './module-selection.service';

function createHarness(): {
  readonly bridge: PhaserBridgeService;
  readonly commands: AngularToPhaserEvent[];
  readonly gameState: GameStateService;
  readonly service: ModuleSelectionService;
} {
  const gameState = new GameStateService();
  const bridge = new PhaserBridgeService();
  const commands: AngularToPhaserEvent[] = [];

  bridge.angularEvents$.subscribe((event) => commands.push(event));

  return {
    bridge,
    commands,
    gameState,
    service: new ModuleSelectionService(gameState, bridge),
  };
}

describe('ModuleSelectionService', () => {
  it('maps MVP module instance selections to Angular-owned panel state', () => {
    const { gameState, service } = createHarness();

    expect(service.selectModule('module_greenhouse_basic_01')).toBe(true);
    expect(gameState.getSnapshot().ui).toEqual({
      activePanel: PanelType.Greenhouse,
      selectedModuleId: 'module_greenhouse_basic_01',
    });

    expect(service.selectModule('module_processing_basic_01')).toBe(true);
    expect(gameState.getSnapshot().ui).toEqual({
      activePanel: PanelType.Processing,
      selectedModuleId: 'module_processing_basic_01',
    });

    expect(service.selectModule('module_shipping_hangar_basic_01')).toBe(true);
    expect(gameState.getSnapshot().ui).toEqual({
      activePanel: PanelType.Shipping,
      selectedModuleId: 'module_shipping_hangar_basic_01',
    });

    expect(service.selectModule('module_storage_basic_01')).toBe(true);
    expect(gameState.getSnapshot().ui).toEqual({
      activePanel: PanelType.Storage,
      selectedModuleId: 'module_storage_basic_01',
    });
  });

  it('ignores unknown module IDs without mutating UI state or sending highlights', () => {
    const { commands, gameState, service } = createHarness();
    const initialUi = gameState.getSnapshot().ui;

    expect(service.selectModule('module_unknown_01')).toBe(false);

    expect(gameState.getSnapshot().ui).toEqual(initialUi);
    expect(commands).toEqual([]);
  });

  it('ignores modules with unknown definitions without mutating UI state or sending highlights', () => {
    const state = createInitialGameState();
    const bridge = new PhaserBridgeService();
    const commands: AngularToPhaserEvent[] = [];
    const gameState = {
      getSnapshot: () => ({
        ...state,
        modules: [
          {
            ...state.modules[0]!,
            id: 'module_unknown_definition_01',
            definitionId: 'unknown_definition',
          },
        ],
      }),
      updateUi: vi.fn(),
    } as unknown as GameStateService;
    const service = new ModuleSelectionService(gameState, bridge);

    bridge.angularEvents$.subscribe((event) => commands.push(event));

    expect(service.selectModule('module_unknown_definition_01')).toBe(false);

    expect(gameState.updateUi).not.toHaveBeenCalled();
    expect(commands).toEqual([]);
  });

  it('sends highlight commands for valid selections and clears selected module state', () => {
    const { commands, gameState, service } = createHarness();

    service.selectModule('module_command_center_basic_01');
    service.clearSelection();

    expect(commands).toEqual([
      { type: 'highlightModule', moduleId: 'module_command_center_basic_01' },
      { type: 'clearHighlight' },
    ]);
    expect(gameState.getSnapshot().ui).toEqual({ activePanel: PanelType.CommandCenter });
  });

  it('returns the expected panel for known and unknown modules', () => {
    const { service } = createHarness();

    expect(service.getPanelForModule('module_command_center_basic_01')).toBe(PanelType.CommandCenter);
    expect(service.getPanelForModule('module_unknown_01')).toBeUndefined();
  });

  it('returns the module id that owns a given panel when present', () => {
    const { service } = createHarness();

    expect(service.getModuleIdForPanel(PanelType.Greenhouse)).toBe('module_greenhouse_basic_01');
  });

  it('returns undefined when no module maps to the requested panel', () => {
    const state = createInitialGameState();
    const bridge = new PhaserBridgeService();
    const gameState = {
      getSnapshot: () => ({
        ...state,
        modules: [
          {
            ...state.modules[0]!,
            id: 'module_unknown_definition_01',
            definitionId: 'unknown_definition',
          },
        ],
      }),
      updateUi: vi.fn(),
    } as unknown as GameStateService;
    const service = new ModuleSelectionService(gameState, bridge);

    expect(service.getModuleIdForPanel(PanelType.Greenhouse)).toBeUndefined();
  });
});
