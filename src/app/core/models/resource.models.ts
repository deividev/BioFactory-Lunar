import type { QualityTier, ResourceCategory } from '../enums';

export interface ResourceDefinition {
  id: string;
  name: string;
  category: ResourceCategory;
  description?: string;
  qualityTier?: QualityTier;
  maxDefault?: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  category: ResourceCategory;
  description?: string;
  qualityTier?: QualityTier;
}

export interface InventoryState {
  items: Record<string, number>;
  capacity: number;
}

export interface ResourceState {
  values: Record<string, number>;
  maxValues: Record<string, number>;
}
