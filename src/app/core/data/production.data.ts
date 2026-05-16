import type { MachineDefinition, RecipeDefinition } from '../models';

export const MACHINE_DEFINITIONS: readonly MachineDefinition[] = [
  {
    id: 'botanical_extractor',
    name: 'Botanical Extractor',
    description: 'Processes lunar crops into biological production inputs.',
    acceptedRecipeIds: ['recipe_aqua_sprout_to_nutrient_mix', 'recipe_luma_moss_to_glow_pigment'],
  },
  {
    id: 'orbital_packager',
    name: 'Orbital Packager',
    description: 'Packages edible biomass for contract delivery.',
    acceptedRecipeIds: ['recipe_protein_leaf_to_biofood_pack'],
  },
] as const;

export const RECIPE_DEFINITIONS: readonly RecipeDefinition[] = [
  {
    id: 'recipe_protein_leaf_to_biofood_pack',
    name: 'Protein Leaf to Biofood Pack',
    machineDefinitionId: 'orbital_packager',
    inputs: [{ itemId: 'protein_leaf', quantity: 2 }],
    output: { itemId: 'biofood_pack', quantity: 1 },
    durationSeconds: 60,
    resourceCosts: [
      { resourceId: 'water', quantity: 1 },
      { resourceId: 'energy', quantity: 4 },
      { resourceId: 'nutrients', quantity: 1 },
    ],
  },
  {
    id: 'recipe_aqua_sprout_to_nutrient_mix',
    name: 'Aqua Sprout to Nutrient Mix',
    machineDefinitionId: 'botanical_extractor',
    inputs: [{ itemId: 'aqua_sprout', quantity: 2 }],
    output: { itemId: 'nutrient_mix', quantity: 1 },
    durationSeconds: 75,
    resourceCosts: [
      { resourceId: 'water', quantity: 2 },
      { resourceId: 'energy', quantity: 5 },
      { resourceId: 'nutrients', quantity: 1 },
    ],
  },
  {
    id: 'recipe_luma_moss_to_glow_pigment',
    name: 'Luma Moss to Glow Pigment',
    machineDefinitionId: 'botanical_extractor',
    inputs: [{ itemId: 'luma_moss', quantity: 1 }],
    output: { itemId: 'glow_pigment', quantity: 1 },
    durationSeconds: 90,
    resourceCosts: [
      { resourceId: 'water', quantity: 1 },
      { resourceId: 'energy', quantity: 5 },
      { resourceId: 'nutrients', quantity: 2 },
    ],
  },
] as const;
