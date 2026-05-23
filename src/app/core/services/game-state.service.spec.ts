import { describe, expect, it } from 'vitest';

import { AlertType, ContractState, CropSlotState, GameSpeed, MachineState, PanelType, ShipmentState } from '../enums';
import type { ContractInstance, MachineInstance, ShipmentInstance } from '../models';
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

  it('updates greenhouse without mutating unrelated game state or leaking updater drafts', () => {
    const service = new GameStateService();
    const initial = service.getSnapshot();
    let leakedGreenhouseDraft = initial.greenhouse;

    service.updateGreenhouse((greenhouse) => {
      leakedGreenhouseDraft = greenhouse;
      return {
        ...greenhouse,
        slots: greenhouse.slots.map((slot, i) =>
          i === 0 ? { ...slot, state: CropSlotState.Planted, cropId: 'protein_leaf', remainingSeconds: 90 } : slot,
        ),
      };
    });

    leakedGreenhouseDraft.slots[0] = { id: 'leaked_slot', state: CropSlotState.Empty };

    const updated = service.getSnapshot();
    expect(updated.greenhouse.slots[0]).toEqual({
      id: 'crop_slot_01',
      state: CropSlotState.Planted,
      cropId: 'protein_leaf',
      remainingSeconds: 90,
    });
    expect(updated.resources).toEqual(initial.resources);
    expect(updated.inventory).toEqual(initial.inventory);
    expect(leakedGreenhouseDraft.slots[0]!.id).toBe('leaked_slot');
    expect(service.getSnapshot().greenhouse.slots[0]!.id).toBe('crop_slot_01');
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

  it('updates machines without mutating unrelated game state or leaking updater drafts', () => {
    const service = new GameStateService();
    const initial = service.getSnapshot();
    let leakedMachinesDraft: MachineInstance[] = [];

    service.updateMachines((machines) => {
      leakedMachinesDraft = machines;
      return machines.map((m, i) =>
        i === 0
          ? { ...m, state: MachineState.Running, currentRecipeId: 'recipe_extract_protein', durationSeconds: 60, remainingSeconds: 60 }
          : m,
      );
    });

    leakedMachinesDraft[0] = { ...leakedMachinesDraft[0]!, state: MachineState.Blocked };

    const updated = service.getSnapshot();
    expect(updated.machines[0]).toEqual({
      id: 'machine_botanical_extractor_01',
      definitionId: 'botanical_extractor',
      state: MachineState.Running,
      currentRecipeId: 'recipe_extract_protein',
      durationSeconds: 60,
      remainingSeconds: 60,
    });
    expect(updated.machines[1]).toEqual(initial.machines[1]);
    expect(updated.resources).toEqual(initial.resources);
    expect(updated.inventory).toEqual(initial.inventory);
    expect(leakedMachinesDraft[0]!.state).toBe(MachineState.Blocked);
    expect(service.getSnapshot().machines[0]!.state).toBe(MachineState.Running);
  });

  it('machines signal is frozen and update isolates outputPending from external mutation', () => {
    const service = new GameStateService();

    service.updateMachines((machines) =>
      machines.map((m, i) =>
        i === 0
          ? { ...m, state: MachineState.Completed, outputPending: [{ itemId: 'protein_extract', quantity: 2 }] }
          : m,
      ),
    );

    const machinesView = service.machines();
    expect(Object.isFrozen(machinesView)).toBe(true);
    expect(Object.isFrozen(machinesView[0])).toBe(true);
    expect(() => {
      (machinesView[0] as MachineInstance).state = MachineState.Idle;
    }).toThrow(TypeError);

    expect(service.getSnapshot().machines[0]!.state).toBe(MachineState.Completed);
    expect(service.getSnapshot().machines[0]!.outputPending).toEqual([{ itemId: 'protein_extract', quantity: 2 }]);
  });

  it('persists and restores machine durationSeconds and outputPending through a save/load round-trip', () => {
    const source = new GameStateService();

    source.updateMachines((machines) =>
      machines.map((m, i) =>
        i === 0
          ? {
              ...m,
              state: MachineState.Completed,
              currentRecipeId: 'recipe_extract_protein',
              durationSeconds: 120,
              remainingSeconds: 0,
              outputPending: [{ itemId: 'protein_extract', quantity: 3 }],
            }
          : m,
      ),
    );

    const saveData = source.toSaveData('2026-05-21T10:00:00.000Z');
    const target = new GameStateService();
    target.loadFromSave(saveData);

    const restored = target.getSnapshot();
    expect(restored.machines[0]!.state).toBe(MachineState.Completed);
    expect(restored.machines[0]!.durationSeconds).toBe(120);
    expect(restored.machines[0]!.remainingSeconds).toBe(0);
    expect(restored.machines[0]!.outputPending).toEqual([{ itemId: 'protein_extract', quantity: 3 }]);

    saveData.machines[0]!.outputPending = [];
    expect(target.getSnapshot().machines[0]!.outputPending).toEqual([{ itemId: 'protein_extract', quantity: 3 }]);
  });

  it('updates contracts without mutating unrelated game state or leaking updater drafts', () => {
    const service = new GameStateService();
    const initial = service.getSnapshot();
    let leakedContractsDraft: ContractInstance[] = [];

    service.updateContracts((contracts) => {
      leakedContractsDraft = contracts;
      return contracts.map((c, i) =>
        i === 0 ? { ...c, state: ContractState.Active } : c,
      );
    });

    leakedContractsDraft[0] = { ...leakedContractsDraft[0]!, state: ContractState.Completed };

    const updated = service.getSnapshot();
    expect(updated.contracts[0]!.state).toBe(ContractState.Active);
    expect(updated.contracts[1]!.state).toBe(ContractState.Available);
    expect(updated.resources).toEqual(initial.resources);
    expect(updated.inventory).toEqual(initial.inventory);
    expect(leakedContractsDraft[0]!.state).toBe(ContractState.Completed);
    expect(service.getSnapshot().contracts[0]!.state).toBe(ContractState.Active);
  });

  it('persists and restores contract state through a save/load round-trip', () => {
    const source = new GameStateService();

    source.updateContracts((contracts) =>
      contracts.map((c, i) =>
        i === 0 ? { ...c, state: ContractState.Active } : c,
      ),
    );

    const saveData = source.toSaveData('2026-05-23T10:00:00.000Z');
    const target = new GameStateService();
    target.loadFromSave(saveData);

    const restored = target.getSnapshot();
    expect(restored.contracts[0]!.state).toBe(ContractState.Active);
    expect(restored.contracts[1]!.state).toBe(ContractState.Available);

    saveData.contracts[0]!.state = ContractState.Completed;
    expect(target.getSnapshot().contracts[0]!.state).toBe(ContractState.Active);
  });
});
