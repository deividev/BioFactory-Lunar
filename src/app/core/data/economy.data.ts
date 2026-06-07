import type { ContractDefinition, ShipmentCatalogItem } from '../models';

const STARTER_CONTRACT_INSTANCE_ID = 'contract_contract_starter_biofood_01' as const;
const HYDROPONIC_SAMPLES_CONTRACT_INSTANCE_ID = 'contract_contract_hydroponic_samples_01' as const;
const NUTRIENT_MIX_CONTRACT_INSTANCE_ID = 'contract_contract_nutrient_mix_01' as const;
const LUMA_PIGMENT_CONTRACT_INSTANCE_ID = 'contract_contract_luma_pigment_01' as const;

export const CONTRACT_DEFINITIONS: readonly ContractDefinition[] = [
  {
    id: 'contract_starter_biofood',
    name: 'Starter Protein Delivery',
    description: 'Order Protein Leaf seeds, then plant and harvest 2 Protein Leaf for the first delivery.',
    requiredItems: [{ itemId: 'protein_leaf', quantity: 2 }],
    rewards: [{ resourceId: 'credits', quantity: 80 }],
  },
  {
    id: 'contract_open_protein_buyback',
    name: 'Open Protein Buyback',
    description: 'Repeatable standing order. Deliver 2 Protein Leaf for a small credit cushion whenever you need to keep the colony running.',
    requiredItems: [{ itemId: 'protein_leaf', quantity: 2 }],
    rewards: [{ resourceId: 'credits', quantity: 12 }],
    unlockRequirementIds: [`contract:${STARTER_CONTRACT_INSTANCE_ID}`],
    repeatable: true,
  },
  {
    id: 'contract_greenhouse_protein',
    name: 'Processed Biofood Batch',
    requiredItems: [{ itemId: 'biofood_pack', quantity: 1 }],
    rewards: [{ resourceId: 'credits', quantity: 55 }],
    unlockRequirementIds: [`contract:${STARTER_CONTRACT_INSTANCE_ID}`],
  },
  {
    id: 'contract_hydroponic_samples',
    name: 'Hydroponic Sample Request',
    requiredItems: [{ itemId: 'aqua_sprout', quantity: 2 }],
    rewards: [{ resourceId: 'credits', quantity: 70 }],
    unlockRequirementIds: [`contract:${STARTER_CONTRACT_INSTANCE_ID}`],
  },
  {
    id: 'contract_nutrient_mix',
    name: 'Nutrient Mix Supply',
    requiredItems: [{ itemId: 'nutrient_mix', quantity: 1 }],
    rewards: [{ resourceId: 'credits', quantity: 90 }],
    unlockRequirementIds: [`contract:${HYDROPONIC_SAMPLES_CONTRACT_INSTANCE_ID}`],
  },
  {
    id: 'contract_orbital_meal_reserve',
    name: 'Orbital Meal Reserve',
    requiredItems: [{ itemId: 'biofood_pack', quantity: 1 }],
    rewards: [{ resourceId: 'credits', quantity: 110 }],
    unlockRequirementIds: ['infrastructure:storage_bay_ii'],
  },
  {
    id: 'contract_luma_pigment',
    name: 'Luma Pigment Order',
    requiredItems: [{ itemId: 'glow_pigment', quantity: 1 }],
    rewards: [{ resourceId: 'credits', quantity: 125 }],
    unlockRequirementIds: ['infrastructure:water_recycler_ii'],
  },
  {
    id: 'contract_mixed_bio_sample',
    name: 'Mixed Bio Sample',
    requiredItems: [
      { itemId: 'biofood_pack', quantity: 1 },
      { itemId: 'nutrient_mix', quantity: 1 },
    ],
    rewards: [{ resourceId: 'credits', quantity: 155 }],
    unlockRequirementIds: [`contract:${NUTRIENT_MIX_CONTRACT_INSTANCE_ID}`],
  },
  {
    id: 'contract_habitat_growth_booster',
    name: 'Habitat Growth Booster',
    requiredItems: [
      { itemId: 'glow_pigment', quantity: 1 },
      { itemId: 'protein_leaf', quantity: 2 },
    ],
    rewards: [{ resourceId: 'credits', quantity: 180 }],
    unlockRequirementIds: [`contract:${LUMA_PIGMENT_CONTRACT_INSTANCE_ID}`],
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
    unlockRequirementIds: [`contract:${STARTER_CONTRACT_INSTANCE_ID}`],
  },
  {
    id: 'shipment_spore_luma_moss_pack',
    name: 'Luma Moss Spore Pack',
    item: { itemId: 'spore_luma_moss', quantity: 3 },
    cost: { resourceId: 'credits', quantity: 65 },
    durationSeconds: 75,
    unlockRequirementIds: ['infrastructure:water_recycler_ii'],
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
