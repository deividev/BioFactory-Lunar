import type { MachineState } from '../enums';
import type { ItemAmount, ResourceAmount } from './common.models';

export interface MachineDefinition {
  id: string;
  name: string;
  description?: string;
  acceptedRecipeIds: string[];
}

export interface MachineInstance {
  id: string;
  definitionId: string;
  state: MachineState;
  currentRecipeId?: string;
  remainingSeconds?: number;
  durationSeconds?: number;
  outputPending?: ItemAmount[];
}

export interface RecipeDefinition {
  id: string;
  name: string;
  machineDefinitionId: string;
  inputs: ItemAmount[];
  output: ItemAmount;
  durationSeconds: number;
  resourceCosts: ResourceAmount[];
}
