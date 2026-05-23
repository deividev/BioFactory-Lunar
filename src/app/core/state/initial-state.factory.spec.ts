import { describe, expect, it } from 'vitest';

import { ContractState, CropSlotState, GameSpeed, MachineState, ModuleState, PanelType } from '../enums';
import {
  createInitialClockState,
  createInitialContractInstances,
  createInitialGameState,
  createInitialGreenhouseState,
  createInitialInventoryState,
  createInitialMachineInstances,
  createInitialModuleInstances,
  createInitialResourceState,
  createInitialSettingsState,
  createInitialTutorialState,
} from './index';

describe('initial state factories', () => {
  it('creates the initial resource state from MVP defaults', () => {
    expect(createInitialResourceState()).toEqual({
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
  });

  it('creates the starter inventory and greenhouse state', () => {
    expect(createInitialInventoryState()).toEqual({
      items: {
        seed_protein_leaf: 2,
      },
      capacity: 100,
    });

    expect(createInitialGreenhouseState().slots).toEqual([
      { id: 'crop_slot_01', state: CropSlotState.Empty },
      { id: 'crop_slot_02', state: CropSlotState.Empty },
      { id: 'crop_slot_03', state: CropSlotState.Empty },
      { id: 'crop_slot_04', state: CropSlotState.Empty },
    ]);
  });

  it('creates machine, contract, module, settings, and tutorial defaults', () => {
    expect(createInitialMachineInstances()).toEqual([
      { id: 'machine_botanical_extractor_01', definitionId: 'botanical_extractor', state: MachineState.Idle },
      { id: 'machine_orbital_packager_01', definitionId: 'orbital_packager', state: MachineState.Idle },
    ]);

    expect(createInitialContractInstances().map((contract) => contract.state)).toEqual([
      ContractState.Available,
      ContractState.Available,
      ContractState.Available,
      ContractState.Available,
      ContractState.Available,
      ContractState.Available,
    ]);

    expect(createInitialModuleInstances()).toEqual([
      {
        id: 'module_command_center_basic_01',
        definitionId: 'command_center_basic',
        state: ModuleState.Active,
        position: { x: 0, y: 0 },
      },
      {
        id: 'module_greenhouse_basic_01',
        definitionId: 'greenhouse_basic',
        state: ModuleState.Active,
        position: { x: 2, y: 0 },
      },
      {
        id: 'module_processing_basic_01',
        definitionId: 'processing_basic',
        state: ModuleState.Active,
        position: { x: 0, y: 2 },
      },
      {
        id: 'module_shipping_hangar_basic_01',
        definitionId: 'shipping_hangar_basic',
        state: ModuleState.Active,
        position: { x: 2, y: 2 },
      },
      {
        id: 'module_storage_basic_01',
        definitionId: 'storage_basic',
        state: ModuleState.Active,
        position: { x: 4, y: 2 },
      },
    ]);

    expect(createInitialSettingsState()).toEqual({
      masterVolume: 1,
      musicVolume: 0.8,
      effectsVolume: 0.8,
      fullscreen: false,
    });
    expect(createInitialTutorialState()).toEqual({ completedStepIds: [], activeStepId: 'accept_first_contract' });
  });

  it('creates a full initial game state with placeholder-safe optional systems', () => {
    const state = createInitialGameState();

    expect(state.clock).toEqual({ elapsedSeconds: 0, day: 1, speed: GameSpeed.X1 });
    expect(state.ui).toEqual({ activePanel: PanelType.CommandCenter });
    expect(state.shipments).toEqual([]);
    expect(state.robots).toEqual([]);
    expect(state.research).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.alerts).toEqual([]);
    expect(state.meta.schemaVersion).toBe(1);
    expect(state.meta.createdAt).toBe(state.meta.updatedAt);
  });

  it('returns fresh mutable runtime objects on each factory call', () => {
    const first = createInitialGameState();
    const second = createInitialGameState();

    first.resources.values['credits'] = 999;
    first.inventory.items['seed_protein_leaf'] = 0;
    first.greenhouse.slots[0].state = CropSlotState.Blocked;
    first.machines[0].state = MachineState.Running;
    first.contracts[0].progressItems['biofood_pack'] = 1;
    first.modules[0].position.x = 99;
    first.tutorial.completedStepIds.push('mutated');

    expect(second.resources.values['credits']).toBe(200);
    expect(second.inventory.items['seed_protein_leaf']).toBe(2);
    expect(second.greenhouse.slots[0].state).toBe(CropSlotState.Empty);
    expect(second.machines[0].state).toBe(MachineState.Idle);
    expect(second.contracts[0].progressItems).toEqual({});
    expect(second.modules[0].position.x).toBe(0);
    expect(second.tutorial.completedStepIds).toEqual([]);
  });

  it('creates independent clock objects for focused consumers', () => {
    const firstClock = createInitialClockState();
    const secondClock = createInitialClockState();

    firstClock.elapsedSeconds = 120;

    expect(secondClock).toEqual({ elapsedSeconds: 0, day: 1, speed: GameSpeed.X1 });
  });

  it('initial machine instances omit durationSeconds and outputPending for backward-compat save reads', () => {
    const machines = createInitialMachineInstances();

    for (const machine of machines) {
      expect(machine.durationSeconds).toBeUndefined();
      expect(machine.outputPending).toBeUndefined();
    }
  });
});
