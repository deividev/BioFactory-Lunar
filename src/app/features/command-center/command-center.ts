import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import {
  COLONY_SUPPORT_EMERGENCY_ACTION,
  COLONY_SUPPORT_UPGRADES,
  STORAGE_UPGRADES,
  TUTORIAL_STEPS,
  getPendingDemoUnlockPreviews,
} from '../../core/data';
import { ContractState } from '../../core/enums';
import {
  DemoFlowService,
  GameStateService,
  InfrastructureService,
  ResourceService,
  SaveService,
  TutorialService,
  type SaveActionResult,
} from '../../core/services';
import type { InfrastructureActionResult } from '../../core/services';

const COLONY_SUPPORT_UPGRADE_BY_ID = new Map(
  COLONY_SUPPORT_UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
);

const STORAGE_UPGRADE_BY_ID = new Map(STORAGE_UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
const SUPPORT_RESOURCE_ORDER = ['energy', 'water', 'oxygen'] as const;
const SUPPORT_RESOURCE_LABELS: Record<(typeof SUPPORT_RESOURCE_ORDER)[number], string> = {
  energy: 'Energy',
  water: 'Water',
  oxygen: 'Oxygen',
};
const UNLOCK_ACTION_PRIORITY = {
  ready: 0,
  pending: 1,
  later: 2,
} as const;

function getColonySupportUpgradeLevel(upgradeId: string): number {
  return upgradeId.endsWith('_ii') ? 2 : 1;
}

function formatColonySupportLevel(level: number): string {
  return level === 1 ? 'Level I' : 'Level II';
}

function formatPassiveSupportSummary(upgrade: (typeof COLONY_SUPPORT_UPGRADES)[number]): string {
  return `+${upgrade.passiveGeneration.quantity} ${upgrade.passiveGeneration.resourceId} / ${upgrade.passiveGeneration.intervalSeconds}s · -${upgrade.passiveGeneration.energyCost} energy`;
}

function formatSupportCapSummary(resourceId: string, quantity: number): string {
  return `+${quantity} ${resourceId} cap`;
}

function formatUpgradeDeltaSummary(
  currentUpgrade: (typeof COLONY_SUPPORT_UPGRADES)[number],
  nextUpgrade: (typeof COLONY_SUPPORT_UPGRADES)[number],
): string {
  const outputDelta = nextUpgrade.passiveGeneration.quantity - currentUpgrade.passiveGeneration.quantity;
  const energyDelta = nextUpgrade.passiveGeneration.energyCost - currentUpgrade.passiveGeneration.energyCost;
  const capDelta = nextUpgrade.boosts
    .filter((boost) => boost.resourceId === nextUpgrade.passiveGeneration.resourceId)
    .reduce((total, boost) => total + boost.quantity, 0);

  return `Upgrade adds +${outputDelta} ${nextUpgrade.passiveGeneration.resourceId} / ${nextUpgrade.passiveGeneration.intervalSeconds}s · +${energyDelta} energy upkeep · ${formatSupportCapSummary(nextUpgrade.passiveGeneration.resourceId, capDelta)}`;
}

@Component({
  selector: 'app-command-center',
  templateUrl: './command-center.html',
  styleUrl: './command-center.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandCenter {
  private readonly demoFlow = inject(DemoFlowService);
  private readonly gameState = inject(GameStateService);
  private readonly infrastructure = inject(InfrastructureService);
  private readonly resources = inject(ResourceService);
  private readonly saveService = inject(SaveService);
  protected readonly tutorialService = inject(TutorialService);

  protected readonly saveStatus = signal<string>('');
  protected readonly hasSaveError = signal<boolean>(false);
  protected readonly supportStatus = signal<string>('Colony support controls standing by.');
  protected readonly hasSupportError = signal<boolean>(false);
  protected readonly demoObjective = this.demoFlow.objectiveSummary;
  protected readonly emergencyAction = COLONY_SUPPORT_EMERGENCY_ACTION;

  protected readonly steps = computed(() => {
    const { completedStepIds, activeStepId } = this.tutorialService.tutorial();
    return TUTORIAL_STEPS.map((step) => ({
      ...step,
      done: completedStepIds.includes(step.id),
      active: step.id === activeStepId,
    }));
  });

  protected readonly completedCount = computed(
    () => this.tutorialService.tutorial().completedStepIds.length,
  );

  protected readonly nextUnlocks = computed(() => {
    const contracts = this.gameState.contracts();
    const inventory = this.gameState.inventory().items;
    const infrastructure = this.gameState.infrastructure();
    const credits = this.resources.balances()['credits'] ?? 0;
    const tutorialComplete = this.tutorialService.isComplete();

    const actionableUnlocks = getPendingDemoUnlockPreviews({
      completedContractIds: contracts
        .filter((contract) => contract.state === 'completed')
        .map((contract) => contract.id),
      infrastructureUpgradeIds: [
        ...infrastructure.colonySupportUpgradeIds,
        ...infrastructure.storageUpgradeIds,
      ],
    }).map((unlock) => {
      if (unlock.targetType === 'contract') {
        const starterContract = contracts.find((contract) => contract.id === unlock.targetId);
        const availableProteinLeaf = inventory['protein_leaf'] ?? 0;

        if (starterContract?.state === ContractState.Active && availableProteinLeaf >= 2) {
          return {
            ...unlock,
            actionState: 'ready' as const,
            actionBadge: 'Ready now',
            actionLabel: 'Deliver the starter contract in Contracts.',
          };
        }

        if (starterContract?.state === ContractState.Active) {
          return {
            ...unlock,
            actionState: 'pending' as const,
            actionBadge: 'In progress',
            actionLabel: `Grow ${Math.max(0, 2 - availableProteinLeaf)} more Protein Leaf, then deliver in Contracts.`,
          };
        }

        return {
          ...unlock,
          actionState: 'pending' as const,
          actionBadge: 'Next step',
          actionLabel: 'Accept the starter contract in Contracts.',
        };
      }

      if (!tutorialComplete) {
        return {
          ...unlock,
          actionState: 'later' as const,
          actionBadge: 'Later',
          actionLabel: 'Finish onboarding first so this upgrade becomes the next real pressure release.',
        };
      }

      const upgrade = unlock.targetType === 'colony_support'
        ? COLONY_SUPPORT_UPGRADE_BY_ID.get(unlock.targetId)
        : STORAGE_UPGRADE_BY_ID.get(unlock.targetId);
      const cost = upgrade?.cost[0]?.quantity ?? 0;
      const costGap = Math.max(0, cost - credits);

      if (costGap === 0) {
        return {
          ...unlock,
          actionState: 'ready' as const,
          actionBadge: 'Ready now',
          actionLabel: unlock.targetType === 'colony_support'
            ? 'Buy this upgrade in Colony Support.'
            : 'Buy this upgrade in Storage.',
        };
      }

      return {
        ...unlock,
        actionState: 'later' as const,
        actionBadge: 'Later',
        actionLabel: `Need ${costGap} more credits before you can buy this upgrade.`,
      };
    });

    return [...actionableUnlocks].sort(
      (left, right) => UNLOCK_ACTION_PRIORITY[left.actionState] - UNLOCK_ACTION_PRIORITY[right.actionState],
    );
  });

  protected readonly recommendedUnlock = computed(() => this.nextUnlocks()[0] ?? null);
  protected readonly secondaryUnlocks = computed(() => this.nextUnlocks().slice(1));

  protected readonly totalSteps = TUTORIAL_STEPS.length;

  protected readonly utilityRows = computed(() => {
    const balances = this.resources.balances();
    const caps = this.gameState.resources().maxValues;

    return [
      { id: 'energy', label: 'Energy', amount: balances['energy'] ?? 0, cap: caps['energy'] ?? 0 },
      { id: 'water', label: 'Water', amount: balances['water'] ?? 0, cap: caps['water'] ?? 0 },
      { id: 'oxygen', label: 'Oxygen', amount: balances['oxygen'] ?? 0, cap: caps['oxygen'] ?? 0 },
    ] as const;
  });

  protected readonly colonySupportTracks = computed(() => {
    const purchasedUpgradeIds = new Set(this.gameState.infrastructure().colonySupportUpgradeIds);

    return SUPPORT_RESOURCE_ORDER.map((resourceId) => {
      const family = COLONY_SUPPORT_UPGRADES
        .filter((upgrade) => upgrade.passiveGeneration.resourceId === resourceId)
        .sort((left, right) => getColonySupportUpgradeLevel(left.id) - getColonySupportUpgradeLevel(right.id));
      const purchasedFamily = family.filter((upgrade) => purchasedUpgradeIds.has(upgrade.id));
      const currentUpgrade = purchasedFamily[purchasedFamily.length - 1] ?? family[0]!;
      const nextUpgrade = family.find((upgrade) => (
        !purchasedUpgradeIds.has(upgrade.id)
        && getColonySupportUpgradeLevel(upgrade.id) > getColonySupportUpgradeLevel(currentUpgrade.id)
      ));
      const currentCapBoost = purchasedFamily.reduce(
        (total, upgrade) => total + upgrade.boosts
          .filter((boost) => boost.resourceId === resourceId)
          .reduce((boostTotal, boost) => boostTotal + boost.quantity, 0),
        0,
      );

      return {
        id: resourceId,
        label: SUPPORT_RESOURCE_LABELS[resourceId],
        currentUpgrade,
        currentLevelLabel: formatColonySupportLevel(getColonySupportUpgradeLevel(currentUpgrade.id)),
        currentPassiveSummary: formatPassiveSupportSummary(currentUpgrade),
        currentCapSummary: formatSupportCapSummary(resourceId, currentCapBoost),
        nextUpgrade,
        nextLevelLabel: nextUpgrade
          ? formatColonySupportLevel(getColonySupportUpgradeLevel(nextUpgrade.id))
          : undefined,
        nextUpgradeCost: nextUpgrade?.cost[0]?.quantity ?? 0,
        nextUpgradeDeltaSummary: nextUpgrade ? formatUpgradeDeltaSummary(currentUpgrade, nextUpgrade) : undefined,
        canUpgrade: nextUpgrade ? this.infrastructure.canBuyColonySupportUpgrade(nextUpgrade.id) : false,
      };
    });
  });

  protected readonly canRunEmergencyReserve = computed(() => this.infrastructure.canRunEmergencyReserve());

  protected save(): void {
    void this.saveService.saveGame().then((result) => {
      this.applySaveResult(result);
    });
  }

  protected buyColonySupportUpgrade(upgradeId: string, label: string): void {
    this.applyInfrastructureResult(this.infrastructure.buyColonySupportUpgrade(upgradeId), `${label} installed.`);
  }

  protected runEmergencyReserve(): void {
    this.applyInfrastructureResult(this.infrastructure.runEmergencyReserve(), 'Emergency Reserve dispatched.');
  }

  private applySaveResult(result: SaveActionResult): void {
    if (result.success) {
      this.hasSaveError.set(false);
      this.saveStatus.set('Game saved.');
    } else {
      this.hasSaveError.set(true);
      this.saveStatus.set(result.message);
    }
  }

  private applyInfrastructureResult(result: InfrastructureActionResult, successMessage: string): void {
    if (result.success) {
      this.hasSupportError.set(false);
      this.supportStatus.set(successMessage);
      return;
    }

    this.hasSupportError.set(true);
    this.supportStatus.set(result.message);
  }
}
