import type { ModuleState, ModuleType } from '../enums';
import type { Position2D, ResourceAmount, Size2D, UnlockRequirement } from './common.models';

export interface BaseModuleDefinition {
  id: string;
  name: string;
  type: ModuleType;
  description?: string;
  size: Size2D;
  buildCost: ResourceAmount[];
  unlockRequirements?: UnlockRequirement[];
}

export interface BaseModuleInstance {
  id: string;
  definitionId: string;
  state: ModuleState;
  position: Position2D;
}
