import { QualityTier, ResourceCategory } from '../enums';
import type { ItemDefinition, ResourceDefinition } from '../models';

export const RESOURCE_DEFINITIONS: readonly ResourceDefinition[] = [
  {
    id: 'credits',
    name: 'Credits',
    category: ResourceCategory.Currency,
    description: 'Primary lunar economy currency.',
  },
  {
    id: 'energy',
    name: 'Energy',
    category: ResourceCategory.Utility,
    description: 'Base power reserve for habitat and production systems.',
    maxDefault: 100,
  },
  {
    id: 'water',
    name: 'Water',
    category: ResourceCategory.Utility,
    description: 'Irrigation and biological process input.',
    maxDefault: 100,
  },
  {
    id: 'nutrients',
    name: 'Nutrients',
    category: ResourceCategory.Input,
    description: 'Growth medium additive used by early crops.',
    maxDefault: 100,
  },
  {
    id: 'oxygen',
    name: 'Oxygen',
    category: ResourceCategory.Utility,
    description: 'Pressurized breathable reserve used to stabilize greenhouse planting cycles.',
    maxDefault: 100,
  },
] as const;

export const ITEM_DEFINITIONS: readonly ItemDefinition[] = [
  {
    id: 'seed_protein_leaf',
    name: 'Protein Leaf Seed',
    category: ResourceCategory.Input,
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'seed_aqua_sprout',
    name: 'Aqua Sprout Seed',
    category: ResourceCategory.Input,
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'spore_luma_moss',
    name: 'Luma Moss Spore',
    category: ResourceCategory.Input,
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'protein_leaf',
    name: 'Protein Leaf',
    category: ResourceCategory.Crop,
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'aqua_sprout',
    name: 'Aqua Sprout',
    category: ResourceCategory.Crop,
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'luma_moss',
    name: 'Luma Moss',
    category: ResourceCategory.Crop,
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'biofood_pack',
    name: 'Biofood Pack',
    category: ResourceCategory.Processed,
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'nutrient_mix',
    name: 'Nutrient Mix',
    category: ResourceCategory.Processed,
    qualityTier: QualityTier.Standard,
  },
  {
    id: 'glow_pigment',
    name: 'Glow Pigment',
    category: ResourceCategory.Processed,
    qualityTier: QualityTier.Standard,
  },
] as const;
