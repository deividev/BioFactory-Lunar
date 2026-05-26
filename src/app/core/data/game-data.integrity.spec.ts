import { describe, expect, it } from 'vitest';

import {
  CONTRACT_DEFINITIONS,
  CROP_DEFINITIONS,
  DEMO_FINALE_CONTRACT_DEFINITION_ID,
  ITEM_DEFINITIONS,
  MACHINE_DEFINITIONS,
  MODULE_DEFINITIONS,
  RECIPE_DEFINITIONS,
  RESOURCE_DEFINITIONS,
  SHIPMENT_CATALOG,
  TUTORIAL_STEPS,
} from './index';
import { ModuleType, ResourceCategory } from '../enums';

const idPattern = /^[a-z][a-z0-9_-]*$/;
const requiredCropResourceIds = ['water', 'energy', 'nutrients', 'oxygen'] as const;
const requiredRecipeResourceIds = ['water', 'energy', 'nutrients'] as const;

function idsOf(items: readonly { id: string }[]): string[] {
  return items.map((item) => item.id);
}

function expectUniqueIds(items: readonly { id: string }[]): void {
  const ids = idsOf(items);

  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => idPattern.test(id))).toBe(true);
}

function expectResourceCostsResolve(
  productions: readonly { id: string; resourceCosts?: readonly { resourceId: string; quantity: number }[] }[],
  resourceIds: ReadonlySet<string>,
  requiredResourceIds: readonly string[],
): void {
  expect(
    productions.map((production) => ({
      productionId: production.id,
      resourceCosts: production.resourceCosts,
    })),
  ).toEqual(
    productions.map((production) => ({
      productionId: production.id,
      resourceCosts: expect.any(Array),
    })),
  );

  for (const production of productions) {
    const productionCostIds = production.resourceCosts?.map((cost) => cost.resourceId) ?? [];

    expect(production.resourceCosts?.length).toBe(requiredResourceIds.length);
    expect(new Set(productionCostIds).size).toBe(requiredResourceIds.length);
    expect(requiredResourceIds.every((resourceId) => productionCostIds.includes(resourceId))).toBe(true);
    expect(production.resourceCosts?.every((cost) => resourceIds.has(cost.resourceId))).toBe(true);
    expect(production.resourceCosts?.every((cost) => cost.quantity > 0)).toBe(true);
  }
}

describe('MVP static game data', () => {
  it('defines the required MVP resources and item IDs', () => {
    expect(idsOf(RESOURCE_DEFINITIONS)).toEqual(['credits', 'energy', 'water', 'nutrients', 'oxygen']);
    expect(RESOURCE_DEFINITIONS.find((resource) => resource.id === 'credits')?.category).toBe(
      ResourceCategory.Currency,
    );

    expect(idsOf(ITEM_DEFINITIONS)).toEqual([
      'seed_protein_leaf',
      'seed_aqua_sprout',
      'spore_luma_moss',
      'protein_leaf',
      'aqua_sprout',
      'luma_moss',
      'biofood_pack',
      'nutrient_mix',
      'glow_pigment',
    ]);
  });

  it('defines the three MVP crops with valid seed and harvest item references', () => {
    expect(idsOf(CROP_DEFINITIONS)).toEqual(['protein_leaf', 'aqua_sprout', 'luma_moss']);

    const itemIds = new Set(idsOf(ITEM_DEFINITIONS));

    expect(CROP_DEFINITIONS.map((crop) => crop.seedItemId)).toEqual([
      'seed_protein_leaf',
      'seed_aqua_sprout',
      'spore_luma_moss',
    ]);
    expect(CROP_DEFINITIONS.every((crop) => itemIds.has(crop.seedItemId))).toBe(true);
    expect(CROP_DEFINITIONS.every((crop) => itemIds.has(crop.harvestItemId))).toBe(true);
  });

  it('defines MVP machines and processing recipes with valid references', () => {
    expect(idsOf(MACHINE_DEFINITIONS)).toEqual(['botanical_extractor', 'orbital_packager']);
    expect(idsOf(RECIPE_DEFINITIONS)).toEqual([
      'recipe_protein_leaf_to_biofood_pack',
      'recipe_aqua_sprout_to_nutrient_mix',
      'recipe_luma_moss_to_glow_pigment',
    ]);

    const machineIds = new Set(idsOf(MACHINE_DEFINITIONS));
    const itemIds = new Set(idsOf(ITEM_DEFINITIONS));

    expect(RECIPE_DEFINITIONS.every((recipe) => machineIds.has(recipe.machineDefinitionId))).toBe(true);
    expect(RECIPE_DEFINITIONS.every((recipe) => recipe.inputs.every((input) => itemIds.has(input.itemId)))).toBe(
      true,
    );
    expect(RECIPE_DEFINITIONS.every((recipe) => itemIds.has(recipe.output.itemId))).toBe(true);
  });

  it('defines MVP contracts, shipment catalog items, and modules', () => {
    expect(CONTRACT_DEFINITIONS).toHaveLength(9);
    expect(CONTRACT_DEFINITIONS.map((contract) => contract.id)).toEqual([
      'contract_starter_biofood',
      'contract_greenhouse_protein',
      'contract_hydroponic_samples',
      'contract_nutrient_mix',
      'contract_orbital_meal_reserve',
      'contract_luma_pigment',
      'contract_mixed_bio_sample',
      'contract_habitat_growth_booster',
      DEMO_FINALE_CONTRACT_DEFINITION_ID,
    ]);
    expect(idsOf(SHIPMENT_CATALOG)).toEqual([
      'shipment_seed_protein_leaf_pack',
      'shipment_seed_aqua_sprout_pack',
      'shipment_spore_luma_moss_pack',
      'shipment_water_supply',
      'shipment_nutrient_pack',
      'shipment_oxygen_tank',
    ]);
    expect(SHIPMENT_CATALOG.find((shipment) => shipment.id === 'shipment_water_supply')?.resource).toEqual({
      resourceId: 'water',
      quantity: 25,
    });
    expect(SHIPMENT_CATALOG.find((shipment) => shipment.id === 'shipment_nutrient_pack')?.resource).toEqual({
      resourceId: 'nutrients',
      quantity: 20,
    });
    expect(SHIPMENT_CATALOG.find((shipment) => shipment.id === 'shipment_oxygen_tank')?.resource).toEqual({
      resourceId: 'oxygen',
      quantity: 25,
    });
    expect(idsOf(MODULE_DEFINITIONS)).toEqual([
      'command_center_basic',
      'greenhouse_basic',
      'processing_basic',
      'shipping_hangar_basic',
      'storage_basic',
    ]);
    expect(MODULE_DEFINITIONS.map((module) => module.type)).toEqual([
      ModuleType.CommandCenter,
      ModuleType.Greenhouse,
      ModuleType.Processing,
      ModuleType.Shipping,
      ModuleType.Storage,
    ]);
  });

  it('keeps tutorial onboarding copy aligned with the guided demo ramp', () => {
    expect(TUTORIAL_STEPS.find((step) => step.id === 'accept_first_contract')?.description).toContain('Starter Biofood Delivery');
    expect(TUTORIAL_STEPS.find((step) => step.id === 'buy_seeds')?.description).toContain('Protein Leaf seed pack');
    expect(TUTORIAL_STEPS.find((step) => step.id === 'buy_seeds')?.description).toContain('Shipments panel');
    expect(TUTORIAL_STEPS.find((step) => step.id === 'receive_seeds')?.description).toContain('Shipments panel');
    expect(TUTORIAL_STEPS.find((step) => step.id === 'process_product')?.description).toContain('Orbital Packager');
    expect(TUTORIAL_STEPS.find((step) => step.id === 'deliver_contract')?.description).toContain('unlock the finale contract');
  });

  it('keeps catalog IDs unique and references resolvable', () => {
    [
      RESOURCE_DEFINITIONS,
      ITEM_DEFINITIONS,
      CROP_DEFINITIONS,
      MACHINE_DEFINITIONS,
      RECIPE_DEFINITIONS,
      CONTRACT_DEFINITIONS,
      SHIPMENT_CATALOG,
      MODULE_DEFINITIONS,
    ].forEach(expectUniqueIds);

    const resourceIds = new Set(idsOf(RESOURCE_DEFINITIONS));
    const itemIds = new Set(idsOf(ITEM_DEFINITIONS));

    expect(CONTRACT_DEFINITIONS.every((contract) => contract.requiredItems.every((item) => itemIds.has(item.itemId))))
      .toBe(true);
    expect(CONTRACT_DEFINITIONS.every((contract) => contract.rewards.every((reward) => resourceIds.has(reward.resourceId))))
      .toBe(true);
    expect(
      SHIPMENT_CATALOG.every((shipment) => {
        const hasValidItem = shipment.item === undefined || itemIds.has(shipment.item.itemId);
        const hasValidResource = shipment.resource === undefined || resourceIds.has(shipment.resource.resourceId);

        return (shipment.item !== undefined || shipment.resource !== undefined) && hasValidItem && hasValidResource;
      }),
    ).toBe(true);
    expect(SHIPMENT_CATALOG.every((shipment) => resourceIds.has(shipment.cost.resourceId))).toBe(true);
    expect(MODULE_DEFINITIONS.every((module) => module.buildCost.every((cost) => resourceIds.has(cost.resourceId)))).toBe(
      true,
    );
  });

  it('keeps crop production resource costs tied to canonical resources', () => {
    const resourceIds = new Set(idsOf(RESOURCE_DEFINITIONS));

    expectResourceCostsResolve(CROP_DEFINITIONS, resourceIds, requiredCropResourceIds);
    expect(CROP_DEFINITIONS.map((crop) => [crop.id, crop.resourceCosts?.map((cost) => cost.resourceId)])).toEqual([
      ['protein_leaf', ['water', 'energy', 'nutrients', 'oxygen']],
      ['aqua_sprout', ['water', 'energy', 'nutrients', 'oxygen']],
      ['luma_moss', ['water', 'energy', 'nutrients', 'oxygen']],
    ]);
  });

  it('keeps recipe production resource costs tied to canonical resources', () => {
    const resourceIds = new Set(idsOf(RESOURCE_DEFINITIONS));

    expectResourceCostsResolve(RECIPE_DEFINITIONS, resourceIds, requiredRecipeResourceIds);
    expect(RECIPE_DEFINITIONS.map((recipe) => [recipe.id, recipe.resourceCosts?.map((cost) => cost.resourceId)])).toEqual([
      ['recipe_protein_leaf_to_biofood_pack', ['water', 'energy', 'nutrients']],
      ['recipe_aqua_sprout_to_nutrient_mix', ['water', 'energy', 'nutrients']],
      ['recipe_luma_moss_to_glow_pigment', ['water', 'energy', 'nutrients']],
    ]);
  });

  it('does not use processed item IDs as production resource costs', () => {
    const itemIds = new Set(idsOf(ITEM_DEFINITIONS));
    const productionCosts = [...CROP_DEFINITIONS, ...RECIPE_DEFINITIONS].flatMap(
      (production) => production.resourceCosts ?? [],
    );

    expect(productionCosts).not.toHaveLength(0);
    expect(productionCosts.some((cost) => cost.resourceId === 'nutrient_mix')).toBe(false);
    expect(productionCosts.every((cost) => !itemIds.has(cost.resourceId))).toBe(true);
  });
});
