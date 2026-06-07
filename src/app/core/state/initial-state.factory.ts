import { ContractState, CropSlotState, GameSpeed, MachineState, ModuleState, PanelType } from '../enums';
import { CONTRACT_DEFINITIONS, DEMO_OPTIONAL_SCOPES, MACHINE_DEFINITIONS, MODULE_DEFINITIONS } from '../data';
import type {
  BaseModuleInstance,
  ClockState,
  ContractInstance,
  DemoFlowState,
  GameState,
  GreenhouseState,
  InfrastructureState,
  InventoryState,
  MachineInstance,
  ResourceState,
  SettingsState,
  TutorialState,
} from '../models';

const INITIAL_TIMESTAMP = '2026-01-01T00:00:00.000Z';

const modulePositions: Record<string, { x: number; y: number }> = {
  command_center_basic: { x: 0, y: 0 },
  greenhouse_basic: { x: 2, y: 0 },
  processing_basic: { x: 0, y: 2 },
  shipping_hangar_basic: { x: 2, y: 2 },
  storage_basic: { x: 4, y: 2 },
};

export function createInitialClockState(): ClockState {
  return {
    elapsedSeconds: 0,
    day: 1,
    speed: GameSpeed.X1,
  };
}

export function createInitialResourceState(): ResourceState {
  return {
    values: {
      credits: 150,
      energy: 55,
      water: 60,
      nutrients: 35,
      oxygen: 45,
    },
    maxValues: {
      energy: 120,
      water: 124,
      nutrients: 100,
      oxygen: 116,
    },
  };
}

export function createInitialInventoryState(): InventoryState {
  return {
    items: {},
    capacity: 12,
  };
}

export function createInitialInfrastructureState(): InfrastructureState {
  return {
    colonySupportUpgradeIds: ['solar_array_i', 'water_recycler_i', 'oxygen_recycler_i'],
    storageUpgradeIds: [],
  };
}

export function createInitialGreenhouseState(): GreenhouseState {
  return {
    slots: Array.from({ length: 4 }, (_, index) => ({
      id: `crop_slot_0${index + 1}`,
      state: CropSlotState.Empty,
    })),
  };
}

export function createInitialMachineInstances(): MachineInstance[] {
  return MACHINE_DEFINITIONS.map((machine) => ({
    id: `machine_${machine.id}_01`,
    definitionId: machine.id,
    state: MachineState.Idle,
  }));
}

export function createInitialContractInstances(): ContractInstance[] {
  return CONTRACT_DEFINITIONS.map((contract) => ({
    id: `contract_${contract.id}_01`,
    definitionId: contract.id,
    state: ContractState.Available,
    progressItems: {},
  }));
}

export function createInitialModuleInstances(): BaseModuleInstance[] {
  return MODULE_DEFINITIONS.map((module) => ({
    id: `module_${module.id}_01`,
    definitionId: module.id,
    state: ModuleState.Active,
    position: { ...modulePositions[module.id] },
  }));
}

export function createInitialSettingsState(): SettingsState {
  return {
    masterVolume: 1,
    musicVolume: 0.8,
    effectsVolume: 0.8,
    fullscreen: false,
  };
}

export function createInitialTutorialState(): TutorialState {
  return {
    completedStepIds: [],
    activeStepId: 'accept_first_contract',
  };
}

export function createInitialDemoFlowState(): DemoFlowState {
  return {
    phase: 'menu',
    guidanceMode: 'tutorial',
    optionalScopes: { ...DEMO_OPTIONAL_SCOPES },
  };
}

export function createInitialGameState(): GameState {
  return {
    clock: createInitialClockState(),
    resources: createInitialResourceState(),
    inventory: createInitialInventoryState(),
    infrastructure: createInitialInfrastructureState(),
    greenhouse: createInitialGreenhouseState(),
    machines: createInitialMachineInstances(),
    contracts: createInitialContractInstances(),
    shipments: [],
    modules: createInitialModuleInstances(),
    robots: [],
    research: [],
    events: [],
    alerts: [],
    demo: createInitialDemoFlowState(),
    ui: {
      activePanel: PanelType.CommandCenter,
    },
    settings: createInitialSettingsState(),
    tutorial: createInitialTutorialState(),
    meta: {
      createdAt: INITIAL_TIMESTAMP,
      updatedAt: INITIAL_TIMESTAMP,
      schemaVersion: 1,
    },
  };
}
