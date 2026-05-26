export interface DemoScreenCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
}

export type DemoObjectiveStatus = 'blocked' | 'actionable' | 'completable' | 'wishlist';

export interface DemoObjectiveStatusCopy {
  readonly badge: string;
  readonly description: string;
}

export const DEMO_OPTIONAL_SCOPES = {
  event: false,
  robot: false,
} as const;

export const DEMO_FINALE_CONTRACT_DEFINITION_ID = 'contract_lunar_habitat_kit' as const;
export const DEMO_FINALE_CONTRACT_INSTANCE_ID = `contract_${DEMO_FINALE_CONTRACT_DEFINITION_ID}_01` as const;

export function isDemoContractVisible(contractId: string, tutorialComplete: boolean): boolean {
  return tutorialComplete || contractId !== DEMO_FINALE_CONTRACT_INSTANCE_ID;
}

export const DEMO_OBJECTIVE_STATUS_COPY: Readonly<Record<DemoObjectiveStatus, DemoObjectiveStatusCopy>> = {
  blocked: {
    badge: 'Blocked',
    description: 'Finish the onboarding loop to unlock the capstone delivery.',
  },
  actionable: {
    badge: 'Actionable',
    description: 'The capstone delivery is live. Accept it or keep producing the missing cargo.',
  },
  completable: {
    badge: 'Completable',
    description: 'All finale cargo is ready. Return to Contracts and finish the demo objective.',
  },
  wishlist: {
    badge: 'Wishlist',
    description: 'The demo objective is complete. Keep exploring this save or jump back to the menu for a fresh run.',
  },
} as const;

export const DEMO_MENU_COPY = {
  eyebrow: 'Biofactory Lunar Demo',
  title: 'Start the guided factory run',
  description: 'Build the first lunar biofactory loop, recover an in-progress session, and push toward the Lunar Habitat Kit finale contract.',
} as const satisfies DemoScreenCopy;

export const DEMO_COMPLETION_COPY = {
  eyebrow: 'Demo Complete',
  title: 'Add Biofactory Lunar to your Steam Wishlist',
  description: 'The Lunar Habitat Kit finale is complete. Continue exploring the current save or return to the menu for a fresh run.',
} as const satisfies DemoScreenCopy;