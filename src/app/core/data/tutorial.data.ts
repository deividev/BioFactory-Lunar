export interface TutorialStepDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export const TUTORIAL_STEPS: readonly TutorialStepDefinition[] = [
  {
    id: 'accept_first_contract',
    label: 'Accept a Contract',
    description: 'Open the Contracts panel and accept an available contract.',
  },
  {
    id: 'buy_seeds',
    label: 'Buy Seeds',
    description: 'Open the Supply panel and order a seed shipment.',
  },
  {
    id: 'receive_seeds',
    label: 'Receive Seeds',
    description: 'Wait for your seed shipment to arrive, then collect it.',
  },
  {
    id: 'plant_crop',
    label: 'Plant a Crop',
    description: 'Open the Greenhouse panel and plant a seed in an empty slot.',
  },
  {
    id: 'harvest_crop',
    label: 'Harvest Your Crop',
    description: 'Wait for your crop to finish growing, then harvest it.',
  },
  {
    id: 'process_product',
    label: 'Process a Product',
    description: 'Open the Processing panel and start a production recipe.',
  },
  {
    id: 'deliver_contract',
    label: 'Deliver the Contract',
    description: 'Return to the Contracts panel and deliver your active contract.',
  },
] as const;

export const TUTORIAL_STEP_IDS = TUTORIAL_STEPS.map((step) => step.id);
