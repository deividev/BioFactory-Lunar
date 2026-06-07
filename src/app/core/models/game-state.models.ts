import type { GameSpeed, PanelType } from '../enums';
import type { ContractInstance, ShipmentInstance } from './economy.models';
import type { GreenhouseState } from './crop.models';
import type { BaseModuleInstance } from './module.models';
import type { InfrastructureState } from './infrastructure.models';
import type { MachineInstance } from './production.models';
import type { Alert, GameEventInstance, ResearchNodeInstance, RobotInstance } from './progression.models';
import type { InventoryState, ResourceState } from './resource.models';

export interface ClockState {
  elapsedSeconds: number;
  day: number;
  speed: GameSpeed;
}

export interface UIState {
  activePanel: PanelType;
  selectedModuleId?: string;
  selectedEntityId?: string;
}

export interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  fullscreen: boolean;
}

export interface TutorialState {
  completedStepIds: string[];
  activeStepId?: string;
}

export interface DemoFlowState {
  phase: 'menu' | 'guided_run' | 'completed';
  objectiveContractInstanceId?: string;
  guidanceMode: 'tutorial' | 'objective';
  completedAt?: string;
  optionalScopes: {
    event: boolean;
    robot: boolean;
  };
}

export interface GameMetaState {
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface GameState {
  clock: ClockState;
  resources: ResourceState;
  inventory: InventoryState;
  infrastructure: InfrastructureState;
  greenhouse: GreenhouseState;
  machines: MachineInstance[];
  contracts: ContractInstance[];
  shipments: ShipmentInstance[];
  modules: BaseModuleInstance[];
  robots: RobotInstance[];
  research: ResearchNodeInstance[];
  events: GameEventInstance[];
  alerts: Alert[];
  demo: DemoFlowState;
  ui: UIState;
  settings: SettingsState;
  tutorial: TutorialState;
  meta: GameMetaState;
}

export const CURRENT_SAVE_VERSION = 1;

export interface SaveData {
  saveVersion: number;
  savedAt: string;
  meta: GameMetaState;
  clock: ClockState;
  resources: ResourceState;
  inventory: InventoryState;
  infrastructure?: InfrastructureState;
  greenhouse: GreenhouseState;
  machines: MachineInstance[];
  contracts: ContractInstance[];
  shipments: ShipmentInstance[];
  modules: BaseModuleInstance[];
  robots: RobotInstance[];
  research: ResearchNodeInstance[];
  events: GameEventInstance[];
  alerts: Alert[];
  demo?: DemoFlowState;
  tutorial: TutorialState;
  settings: SettingsState;
}
