import type { ResourceAmount } from './common.models';

export interface InfrastructureState {
  colonySupportUpgradeIds: string[];
  storageUpgradeIds: string[];
}

export interface ColonySupportPassiveGenerationDefinition {
  resourceId: string;
  quantity: number;
  intervalSeconds: number;
  energyCost: number;
}

export interface ColonySupportUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  cost: ResourceAmount[];
  boosts: ResourceAmount[];
  passiveGeneration: ColonySupportPassiveGenerationDefinition;
  requiresUpgradeIds?: string[];
}

export interface ColonySupportEmergencyActionDefinition {
  id: string;
  name: string;
  description: string;
  cost: ResourceAmount[];
  restores: ResourceAmount[];
}

export interface StorageUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  cost: ResourceAmount[];
  capacityDelta: number;
  requiresUpgradeIds?: string[];
}