import type { CropSlotState, QualityTier } from '../enums';
import type { ItemAmount, ResourceAmount } from './common.models';

export interface CropDefinition {
  id: string;
  name: string;
  seedItemId: string;
  harvestItemId: string;
  growthSeconds: number;
  resourceCosts: ResourceAmount[];
  baseYield: ItemAmount;
  qualityTier: QualityTier;
  unlockRequirementIds?: string[];
}

export interface CropSlot {
  id: string;
  state: CropSlotState;
  cropId?: string;
  plantedAt?: number;
  remainingSeconds?: number;
}

export interface GreenhouseState {
  slots: CropSlot[];
}
