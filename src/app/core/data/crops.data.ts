import { QualityTier } from '../enums';
import type { CropDefinition } from '../models';

export const CROP_DEFINITIONS: readonly CropDefinition[] = [
  {
    id: 'protein_leaf',
    name: 'Protein Leaf',
    seedItemId: 'seed_protein_leaf',
    harvestItemId: 'protein_leaf',
    growthSeconds: 90,
    resourceCosts: [
      { resourceId: 'water', quantity: 5 },
      { resourceId: 'energy', quantity: 1 },
      { resourceId: 'nutrients', quantity: 1 },
    ],
    baseYield: { itemId: 'protein_leaf', quantity: 2 },
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'aqua_sprout',
    name: 'Aqua Sprout',
    seedItemId: 'seed_aqua_sprout',
    harvestItemId: 'aqua_sprout',
    growthSeconds: 120,
    resourceCosts: [
      { resourceId: 'water', quantity: 8 },
      { resourceId: 'energy', quantity: 1 },
      { resourceId: 'nutrients', quantity: 1 },
    ],
    baseYield: { itemId: 'aqua_sprout', quantity: 2 },
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'luma_moss',
    name: 'Luma Moss',
    seedItemId: 'spore_luma_moss',
    harvestItemId: 'luma_moss',
    growthSeconds: 150,
    resourceCosts: [
      { resourceId: 'water', quantity: 6 },
      { resourceId: 'energy', quantity: 1 },
      { resourceId: 'nutrients', quantity: 2 },
    ],
    baseYield: { itemId: 'luma_moss', quantity: 1 },
    qualityTier: QualityTier.Standard,
  },
] as const;
