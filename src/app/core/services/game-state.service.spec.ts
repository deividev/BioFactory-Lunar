import { describe, expect, it } from 'vitest';

import { AlertType, GameSpeed, PanelType, ShipmentState } from '../enums';
import type { ShipmentInstance } from '../models';
import { createInitialGameState } from '../state';
import { GameStateService } from './game-state.service';

describe('GameStateService', () => {
  it('exposes a valid initial state snapshot with non-negative resource and inventory quantities', () => {
    const service = new GameStateService();

    const snapshot = service.getSnapshot();

    expect(snapshot.resources).toEqual({
      values: {
        credits: 200,
        energy: 100,
        water: 100,
        nutrients: 20,
      },
      maxValues: {
        energy: 100,
        water: 100,
        nutrients: 100,
      },
    });
    expect(snapshot.inventory).toEqual({
      items: {
        seed_protein_leaf: 2,
      },
      capacity: 100,
    });
    expect(Object.values(snapshot.resources.values).every((quantity) => quantity >= 0)).toBe(true);
    expect(Object.values(snapshot.inventory.items).every((quantity) => quantity >= 0)).toBe(true);
  });

  it('resets mutated resource and inventory branches back to the initial state', () => {
    const service = new GameStateService();

    service.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 50, water: 25 },
    }));
    service.updateInventory((inventory) => ({
      ...inventory,
      items: { ...inventory.items, seed_protein_leaf: 0, biofood_pack: 3 },
    }));

    expect(service.getSnapshot().resources.values['credits']).toBe(50);
    expect(service.getSnapshot().inventory.items['biofood_pack']).toBe(3);

    service.reset();

    expect(service.getSnapshot()).toEqual(createInitialGameState());
  });

  it('returns clone-safe snapshots and frozen branch selectors instead of raw nested signal values', () => {
    const service = new GameStateService();

    const snapshot = service.getSnapshot();
    snapshot.resources.values['credits'] = 999;
    snapshot.inventory.items['seed_protein_leaf'] = 99;
    snapshot.greenhouse.slots[0]!.id = 'mutated_slot';
    snapshot.contracts[0]!.id = 'mutated_contract';
    snapshot.ui.activePanel = PanelType.Storage;

    expect(service.getSnapshot().resources.values['credits']).toBe(200);
    expect(service.getSnapshot().inventory.items['seed_protein_leaf']).toBe(2);
    expect(service.getSnapshot().greenhouse.slots[0]!.id).toBe('crop_slot_01');
    expect(service.getSnapshot().ui.activePanel).toBe(PanelType.CommandCenter);

    const resourcesView = service.resources();
    const inventoryView = service.inventory();
    const clockView = service.clock();
    const uiView = service.ui();
    const greenhouseView = service.greenhouse();
    const contractsView = service.contracts();
    const alertsView = service.alerts();

    expect(Object.isFrozen(resourcesView)).toBe(true);
    expect(Object.isFrozen(resourcesView.values)).toBe(true);
    expect(Object.isFrozen(resourcesView.maxValues)).toBe(true);
    expect(Object.isFrozen(inventoryView)).toBe(true);
    expect(Object.isFrozen(inventoryView.items)).toBe(true);
    expect(Object.isFrozen(clockView)).toBe(true);
    expect(Object.isFrozen(uiView)).toBe(true);
    expect(Object.isFrozen(greenhouseView)).toBe(true);
    expect(Object.isFrozen(greenhouseView.slots)).toBe(true);
    expect(Object.isFrozen(contractsView)).toBe(true);
    expect(Object.isFrozen(contractsView[0])).toBe(true);
    expect(Object.isFrozen(alertsView)).toBe(true);
    expect(() => {
      (resourcesView.values as Record<string, number>)['credits'] = 1;
    }).toThrow(TypeError);
    expect(() => {
      (inventoryView.items as Record<string, number>)['seed_protein_leaf'] = 1;
    }).toThrow(TypeError);
    expect(() => {
      (clockView as { elapsedSeconds: number }).elapsedSeconds = 99;
    }).toThrow(TypeError);
    expect(() => {
      (uiView as { activePanel: PanelType }).activePanel = PanelType.Storage;
    }).toThrow(TypeError);
    expect(() => {
      (greenhouseView.slots[0] as { id: string }).id = 'leaked_slot';
    }).toThrow(TypeError);
    expect(service.getSnapshot().resources.values['credits']).toBe(200);
    expect(service.getSnapshot().inventory.items['seed_protein_leaf']).toBe(2);
    expect(service.getSnapshot().clock.elapsedSeconds).toBe(0);
    expect(service.getSnapshot().greenhouse.slots[0]!.id).toBe('crop_slot_01');
    expect(service.getSnapshot().contracts[0]!.id).toBe('contract_contract_starter_biofood_01');
    expect(service.getSnapshot().ui.activePanel).toBe(PanelType.CommandCenter);
  });

  it('updates clock, resource, inventory, and UI branches without mutating unrelated state or leaking updater drafts', () => {
    const service = new GameStateService();
    const initial = service.getSnapshot();
    let leakedClockDraft = initial.clock;
    let leakedResourcesDraft = initial.resources;
    let leakedInventoryDraft = initial.inventory;
    let leakedUiDraft = initial.ui;

    service.updateClock((clock) => {
      leakedClockDraft = clock;
      clock.elapsedSeconds = 120;
      clock.day = 1;
      clock.speed = GameSpeed.X2;
      return clock;
    });
    service.updateResources((resources) => {
      leakedResourcesDraft = resources;
      resources.values['credits'] = 275;
      return resources;
    });
    service.updateInventory((inventory) => {
      leakedInventoryDraft = inventory;
      inventory.items['biofood_pack'] = 2;
      return inventory;
    });
    service.updateUi((ui) => {
      leakedUiDraft = ui;
      ui.activePanel = PanelType.Greenhouse;
      ui.selectedModuleId = 'module_greenhouse_basic_01';
      return ui;
    });

    leakedClockDraft.elapsedSeconds = 1;
    leakedResourcesDraft.values['credits'] = 1;
    leakedInventoryDraft.items['biofood_pack'] = 99;
    leakedUiDraft.activePanel = PanelType.Storage;
    leakedUiDraft.selectedModuleId = 'module_storage_basic_01';

    const updated = service.getSnapshot();
    expect(updated.clock).toEqual({ elapsedSeconds: 120, day: 1, speed: GameSpeed.X2 });
    expect(updated.resources.values['credits']).toBe(275);
    expect(updated.inventory.items['biofood_pack']).toBe(2);
    expect(updated.ui).toEqual({ activePanel: PanelType.Greenhouse, selectedModuleId: 'module_greenhouse_basic_01' });
    expect(updated.greenhouse).toEqual(initial.greenhouse);
    expect(updated.meta).toEqual(initial.meta);
  });

  it('exports explicit save data with persistent gameplay branches and without transient UI state', () => {
    const service = new GameStateService();

    service.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 325 },
    }));
    service.updateInventory((inventory) => ({
      ...inventory,
      items: { ...inventory.items, biofood_pack: 2 },
    }));
    service.updateUi((ui) => ({
      ...ui,
      activePanel: PanelType.Storage,
      selectedModuleId: 'module_storage_basic_01',
    }));

    const saveData = service.toSaveData('2026-05-19T12:00:00.000Z');
    const rawSaveData = saveData as unknown as Record<string, unknown>;

    expect(saveData.saveVersion).toBe(1);
    expect(saveData.savedAt).toBe('2026-05-19T12:00:00.000Z');
    expect(saveData.resources.values['credits']).toBe(325);
    expect(saveData.inventory.items['biofood_pack']).toBe(2);
    expect(saveData.clock).toEqual(service.getSnapshot().clock);
    expect(saveData.modules).toEqual(service.getSnapshot().modules);
    expect(rawSaveData['ui']).toBeUndefined();
    expect(rawSaveData['state']).toBeUndefined();

    saveData.resources.values['credits'] = 1;
    expect(service.getSnapshot().resources.values['credits']).toBe(325);
  });

  it('loads save data into gameplay state while resetting transient UI selection', () => {
    const source = new GameStateService();
    source.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 450, water: 80 },
    }));
    source.updateInventory((inventory) => ({
      ...inventory,
      items: { ...inventory.items, seed_protein_leaf: 5, biofood_pack: 1 },
    }));
    source.updateClock((clock) => ({ ...clock, elapsedSeconds: 240, day: 2, speed: GameSpeed.X4 }));
    source.updateUi((ui) => ({
      ...ui,
      activePanel: PanelType.Storage,
      selectedModuleId: 'module_storage_basic_01',
    }));

    const saveData = source.toSaveData('2026-05-19T12:00:00.000Z');
    const target = new GameStateService();

    target.loadFromSave(saveData);

    const restored = target.getSnapshot();
    expect(restored.resources.values).toEqual({ credits: 450, energy: 100, water: 80, nutrients: 20 });
    expect(restored.inventory.items).toEqual({ seed_protein_leaf: 5, biofood_pack: 1 });
    expect(restored.clock).toEqual({ elapsedSeconds: 240, day: 2, speed: GameSpeed.X4 });
    expect(restored.ui).toEqual({ activePanel: PanelType.CommandCenter });
    expect(restored.modules).toEqual(saveData.modules);

    saveData.inventory.items['biofood_pack'] = 99;
    expect(target.getSnapshot().inventory.items['biofood_pack']).toBe(1);
  });

  it('updates alerts without mutating unrelated game state or leaking updater drafts', () => {
    const service = new GameStateService();
    const initial = service.getSnapshot();
    let leakedAlertsDraft = initial.alerts;

    service.updateAlerts((alerts) => {
      leakedAlertsDraft = alerts;
      alerts.push({
        id: 'alert_save_success',
        type: AlertType.Success,
        message: 'Game saved.',
        createdAt: '2026-05-19T12:00:00.000Z',
        dismissed: false,
      });
      return alerts;
    });

    leakedAlertsDraft.push({
      id: 'alert_leaked',
      type: AlertType.Warning,
      message: 'Leaked mutation.',
      createdAt: '2026-05-19T12:01:00.000Z',
      dismissed: false,
    });

    const updated = service.getSnapshot();
    expect(updated.alerts).toEqual([
      {
        id: 'alert_save_success',
        type: AlertType.Success,
        message: 'Game saved.',
        createdAt: '2026-05-19T12:00:00.000Z',
        dismissed: false,
      },
    ]);
    expect(updated.resources).toEqual(initial.resources);
    expect(updated.inventory).toEqual(initial.inventory);
  });

  it('updates shipments without mutating unrelated game state or leaking updater drafts', () => {
    const service = new GameStateService();
    const initial = service.getSnapshot();
    const testShipment: ShipmentInstance = {
      id: 'ship_test_01',
      catalogItemId: 'shipment_seed_protein_leaf_pack',
      state: ShipmentState.InTransit,
      remainingSeconds: 45,
    };
    let leakedShipmentsDraft: ShipmentInstance[] = [];

    service.updateShipments((shipments) => {
      leakedShipmentsDraft = shipments;
      return [...shipments, testShipment];
    });

    leakedShipmentsDraft.push({ ...testShipment, id: 'leaked_shipment' });

    const updated = service.getSnapshot();
    expect(updated.shipments).toEqual([testShipment]);
    expect(updated.resources).toEqual(initial.resources);
    expect(updated.inventory).toEqual(initial.inventory);
  });
});
