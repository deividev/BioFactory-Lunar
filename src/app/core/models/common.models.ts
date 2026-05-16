export interface ResourceAmount {
  resourceId: string;
  quantity: number;
}

export interface ProductionResourceCostContext {
  productionId: string;
  moduleId?: string;
  resourceCosts: ResourceAmount[];
}

export interface ItemAmount {
  itemId: string;
  quantity: number;
}

export interface UnlockRequirement {
  id: string;
  description: string;
  requiredResourceIds?: string[];
  requiredItemIds?: string[];
  requiredModuleIds?: string[];
  requiredResearchIds?: string[];
}

export interface Position2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}
