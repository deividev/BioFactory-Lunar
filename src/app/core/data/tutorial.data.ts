export interface TutorialStepDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export const TUTORIAL_STARTER_CONTRACT_INSTANCE_ID = 'contract_contract_starter_biofood_01' as const;
export const TUTORIAL_STARTER_SHIPMENT_CATALOG_ID = 'shipment_seed_protein_leaf_pack' as const;
export const TUTORIAL_STARTER_CROP_ID = 'protein_leaf' as const;
export const TUTORIAL_STARTER_RECIPE_ID = 'recipe_protein_leaf_to_biofood_pack' as const;

export const TUTORIAL_STEPS: readonly TutorialStepDefinition[] = [
  {
    id: 'accept_first_contract',
    label: 'Accept a Contract',
    description: 'Open the Contracts panel and accept Starter Protein Delivery to lock in the first payout.',
  },
  {
    id: 'buy_seeds',
    label: 'Buy Seeds',
    description: 'Open the Shipments panel and order a Protein Leaf seed pack for the first greenhouse run.',
  },
  {
    id: 'receive_seeds',
    label: 'Receive Seeds',
    description: 'Wait for the seed shipment to arrive, then collect it from the Shipments panel.',
  },
  {
    id: 'plant_crop',
    label: 'Plant a Crop',
    description: 'Open the Greenhouse panel and plant Protein Leaf seeds in an empty grow slot.',
  },
  {
    id: 'harvest_crop',
    label: 'Harvest Your Crop',
    description: 'Wait for the crop to finish growing, then harvest the Protein Leaf yield.',
  },
  {
    id: 'deliver_contract',
    label: 'Deliver the Contract',
    description: 'Return to the Contracts panel and deliver 2 Protein Leaf to clear the starter order.',
  },
  {
    id: 'process_product',
    label: 'Process a Product',
    description: 'Open the Processing panel and run Protein Leaf to Biofood Pack in the Orbital Packager to finish onboarding and unlock the finale contract.',
  },
] as const;

export const TUTORIAL_STEP_IDS = TUTORIAL_STEPS.map((step) => step.id);
