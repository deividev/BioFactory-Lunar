import type { ContractDefinition, ShipmentCatalogItem } from '../models';

export const CONTRACT_DEFINITIONS: readonly ContractDefinition[] = [
  {
    id: 'contract_starter_biofood',
    name: 'Starter Biofood Delivery',
    requiredItems: [{ itemId: 'biofood_pack', quantity: 1 }],
    rewards: [{ resourceId: 'credits', quantity: 80 }],
  },
  {
    id: 'contract_greenhouse_protein',
    name: 'Greenhouse Protein Batch',
    requiredItems: [{ itemId: 'protein_leaf', quantity: 2 }],
    rewards: [{ resourceId: 'credits', quantity: 55 }],
  },
  {
    id: 'contract_hydroponic_samples',
    name: 'Hydroponic Sample Request',
    requiredItems: [{ itemId: 'aqua_sprout', quantity: 2 }],
    rewards: [{ resourceId: 'credits', quantity: 70 }],
  },
  {
    id: 'contract_nutrient_mix',
    name: 'Nutrient Mix Supply',
    requiredItems: [{ itemId: 'nutrient_mix', quantity: 1 }],
    rewards: [{ resourceId: 'credits', quantity: 90 }],
  },
  {
    id: 'contract_orbital_meal_reserve',
    name: 'Orbital Meal Reserve',
    requiredItems: [{ itemId: 'biofood_pack', quantity: 1 }],
    rewards: [{ resourceId: 'credits', quantity: 110 }],
  },
  {
    id: 'contract_luma_pigment',
    name: 'Luma Pigment Order',
    requiredItems: [{ itemId: 'glow_pigment', quantity: 1 }],
    rewards: [{ resourceId: 'credits', quantity: 125 }],
  },
  {
    id: 'contract_mixed_bio_sample',
    name: 'Mixed Bio Sample',
    requiredItems: [
      { itemId: 'biofood_pack', quantity: 1 },
      { itemId: 'nutrient_mix', quantity: 1 },
    ],
    rewards: [{ resourceId: 'credits', quantity: 155 }],
  },
  {
    id: 'contract_habitat_growth_booster',
    name: 'Habitat Growth Booster',
    requiredItems: [
      { itemId: 'glow_pigment', quantity: 1 },
      { itemId: 'protein_leaf', quantity: 2 },
    ],
    rewards: [{ resourceId: 'credits', quantity: 180 }],
  },
  {
    id: 'contract_lunar_habitat_kit',
    name: 'Lunar Habitat Kit',
    requiredItems: [
      { itemId: 'biofood_pack', quantity: 1 },
      { itemId: 'nutrient_mix', quantity: 1 },
      { itemId: 'glow_pigment', quantity: 1 },
    ],
    rewards: [{ resourceId: 'credits', quantity: 240 }],
  },
] as const;

export const SHIPMENT_CATALOG: readonly ShipmentCatalogItem[] = [
  {
    id: 'shipment_seed_protein_leaf_pack',
    name: 'Protein Leaf Seed Pack',
    item: { itemId: 'seed_protein_leaf', quantity: 4 },
    cost: { resourceId: 'credits', quantity: 35 },
    durationSeconds: 45,
  },
  {
    id: 'shipment_seed_aqua_sprout_pack',
    name: 'Aqua Sprout Seed Pack',
    item: { itemId: 'seed_aqua_sprout', quantity: 4 },
    cost: { resourceId: 'credits', quantity: 45 },
    durationSeconds: 60,
  },
  {
    id: 'shipment_spore_luma_moss_pack',
    name: 'Luma Moss Spore Pack',
    item: { itemId: 'spore_luma_moss', quantity: 3 },
    cost: { resourceId: 'credits', quantity: 65 },
    durationSeconds: 75,
  },
  {
    id: 'shipment_water_supply',
    name: 'Water Supply',
    resource: { resourceId: 'water', quantity: 25 },
    cost: { resourceId: 'credits', quantity: 25 },
    durationSeconds: 45,
  },
  {
    id: 'shipment_nutrient_pack',
    name: 'Basic Nutrient Pack',
    resource: { resourceId: 'nutrients', quantity: 20 },
    cost: { resourceId: 'credits', quantity: 35 },
    durationSeconds: 45,
  },
  {
    id: 'shipment_oxygen_tank',
    name: 'Oxygen Tank Refill',
    resource: { resourceId: 'oxygen', quantity: 25 },
    cost: { resourceId: 'credits', quantity: 30 },
    durationSeconds: 45,
  },
] as const;
