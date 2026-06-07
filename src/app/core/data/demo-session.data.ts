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

export interface DemoUnlockContext {
  readonly completedContractIds: readonly string[];
  readonly infrastructureUpgradeIds: readonly string[];
}

export interface DemoUnlockRequirementTarget {
  readonly type: 'contract' | 'infrastructure';
  readonly id: string;
}

export interface DemoUnlockPreview {
  readonly id: string;
  readonly targetType: 'contract' | 'colony_support' | 'storage';
  readonly targetId: string;
  readonly panelLabel: string;
  readonly requirementLabel: string;
  readonly unlocksSummary: string;
}

const CONTRACT_UNLOCK_PREFIX = 'contract:' as const;
const INFRASTRUCTURE_UNLOCK_PREFIX = 'infrastructure:' as const;
const STARTER_CONTRACT_INSTANCE_ID = 'contract_contract_starter_biofood_01' as const;

const DEMO_UNLOCK_PREVIEW_DEFINITIONS: ReadonlyArray<{
  readonly id: string;
  readonly targetType: DemoUnlockPreview['targetType'];
  readonly targetId: string;
  readonly panelLabel: string;
  readonly requirementIds: readonly string[];
  readonly requirementLabel: string;
  readonly unlocksSummary: string;
}> = [
  {
    id: 'starter_progression',
    targetType: 'contract',
    targetId: STARTER_CONTRACT_INSTANCE_ID,
    panelLabel: 'Contracts',
    requirementIds: [`contract:${STARTER_CONTRACT_INSTANCE_ID}`],
    requirementLabel: 'Complete Starter Protein Delivery',
    unlocksSummary: 'Aqua Sprout seeds, Processed Biofood Batch, Hydroponic Sample Request, Aqua Sprout planting, and Nutrient Mix processing.',
  },
  {
    id: 'water_recycler_branch',
    targetType: 'colony_support',
    targetId: 'water_recycler_ii',
    panelLabel: 'Colony Support',
    requirementIds: ['infrastructure:water_recycler_ii'],
    requirementLabel: 'Upgrade Water Recycler to Level II',
    unlocksSummary: 'Luma Moss spores, Luma Pigment Order, Luma Moss planting, and Glow Pigment processing.',
  },
  {
    id: 'storage_bay_branch',
    targetType: 'storage',
    targetId: 'storage_bay_ii',
    panelLabel: 'Storage',
    requirementIds: ['infrastructure:storage_bay_ii'],
    requirementLabel: 'Install Storage Bay II',
    unlocksSummary: 'Orbital Meal Reserve and a larger cargo buffer for stacked deliveries.',
  },
] as const;

export const DEMO_OPTIONAL_SCOPES = {
  event: false,
  robot: false,
} as const;

export const DEMO_FINALE_CONTRACT_DEFINITION_ID = 'contract_lunar_habitat_kit' as const;
export const DEMO_FINALE_CONTRACT_INSTANCE_ID = `contract_${DEMO_FINALE_CONTRACT_DEFINITION_ID}_01` as const;

export function isDemoContractVisible(contractId: string, tutorialComplete: boolean): boolean {
  return tutorialComplete || contractId !== DEMO_FINALE_CONTRACT_INSTANCE_ID;
}

export function getDemoUnlockRequirementTarget(requirementId: string): DemoUnlockRequirementTarget | null {
  if (requirementId.startsWith(CONTRACT_UNLOCK_PREFIX)) {
    return {
      type: 'contract',
      id: requirementId.slice(CONTRACT_UNLOCK_PREFIX.length),
    };
  }

  if (requirementId.startsWith(INFRASTRUCTURE_UNLOCK_PREFIX)) {
    return {
      type: 'infrastructure',
      id: requirementId.slice(INFRASTRUCTURE_UNLOCK_PREFIX.length),
    };
  }

  return null;
}

export function areDemoUnlockRequirementsMet(
  requirementIds: readonly string[] | undefined,
  context: DemoUnlockContext,
): boolean {
  const completedContractIds = new Set(context.completedContractIds);
  const infrastructureUpgradeIds = new Set(context.infrastructureUpgradeIds);

  return (requirementIds ?? []).every((requirementId) => {
    const target = getDemoUnlockRequirementTarget(requirementId);

    if (target === null) {
      return false;
    }

    return target.type === 'contract'
      ? completedContractIds.has(target.id)
      : infrastructureUpgradeIds.has(target.id);
  });
}

export function getPendingDemoUnlockPreviews(context: DemoUnlockContext): readonly DemoUnlockPreview[] {
  return DEMO_UNLOCK_PREVIEW_DEFINITIONS
    .filter((preview) => !areDemoUnlockRequirementsMet(preview.requirementIds, context))
    .map((preview) => ({
      id: preview.id,
      targetType: preview.targetType,
      targetId: preview.targetId,
      panelLabel: preview.panelLabel,
      requirementLabel: preview.requirementLabel,
      unlocksSummary: preview.unlocksSummary,
    }));
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