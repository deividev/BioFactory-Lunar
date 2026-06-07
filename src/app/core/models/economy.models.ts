import type { ContractState, ShipmentState } from '../enums';
import type { ItemAmount, ResourceAmount } from './common.models';

export interface ContractDefinition {
  id: string;
  name: string;
  description?: string;
  requiredItems: ItemAmount[];
  rewards: ResourceAmount[];
  unlockRequirementIds?: string[];
  repeatable?: boolean;
}

export interface ContractInstance {
  id: string;
  definitionId: string;
  state: ContractState;
  progressItems: Record<string, number>;
}

export interface ShipmentCatalogItem {
  id: string;
  name: string;
  item?: ItemAmount;
  resource?: ResourceAmount;
  cost: ResourceAmount;
  durationSeconds: number;
  unlockRequirementIds?: string[];
}

export interface ShipmentInstance {
  id: string;
  catalogItemId: string;
  state: ShipmentState;
  remainingSeconds: number;
}
