import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
  CONTRACT_DEFINITIONS,
  ITEM_DEFINITIONS,
  MACHINE_DEFINITIONS,
  RECIPE_DEFINITIONS,
  isDemoContractVisible,
} from '../../core/data';
import { ContractState } from '../../core/enums';
import { ContractService, GameStateService, TutorialService } from '../../core/services';

const ITEM_NAME_BY_ID = new Map(ITEM_DEFINITIONS.map((item) => [item.id, item.name]));
const MACHINE_NAME_BY_ID = new Map(MACHINE_DEFINITIONS.map((machine) => [machine.id, machine.name]));

function getSourceHint(itemId: string): string | undefined {
  const recipe = RECIPE_DEFINITIONS.find((candidate) => candidate.output.itemId === itemId);

  if (recipe === undefined) {
    return undefined;
  }

  const inputSummary = recipe.inputs
    .map((input) => `${input.quantity}x ${ITEM_NAME_BY_ID.get(input.itemId) ?? input.itemId}`)
    .join(', ');
  const machineName = MACHINE_NAME_BY_ID.get(recipe.machineDefinitionId) ?? recipe.machineDefinitionId;

  return `Source: run ${recipe.name} in ${machineName} using ${inputSummary}.`;
}

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.html',
  styleUrl: './contracts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contracts {
  private readonly gameState = inject(GameStateService);
  private readonly contractService = inject(ContractService);
  private readonly tutorialService = inject(TutorialService);

  protected readonly ContractState = ContractState;

  private readonly allContracts = computed(() =>
    this.gameState.contracts().map((c) => {
      const def = CONTRACT_DEFINITIONS.find((d) => d.id === c.definitionId);
      const requiredItems = (def?.requiredItems ?? []).map((item) => ({
        ...item,
        name: ITEM_DEFINITIONS.find((d) => d.id === item.itemId)?.name ?? item.itemId,
        sourceHint: getSourceHint(item.itemId),
      }));

      return {
        ...c,
        name: def?.name ?? c.definitionId,
        description: def?.description,
        requiredItems,
        sourceHints: requiredItems
          .map((item) => item.sourceHint)
          .filter((hint): hint is string => hint !== undefined),
        requirementsSummary: requiredItems.map((item) => `${item.quantity}x ${item.name}`).join(', '),
        rewardCredits: def?.rewards.find((r) => r.resourceId === 'credits')?.quantity ?? 0,
      };
    }),
  );

  protected readonly availableContracts = computed(() =>
    this.allContracts().filter(
      (c) => c.state === ContractState.Available
        && this.contractService.isContractUnlocked(c.id)
        && isDemoContractVisible(c.id, this.tutorialService.isComplete()),
    ),
  );

  protected readonly activeContracts = computed(() =>
    this.allContracts()
      .filter((c) => c.state === ContractState.Active)
      .map((c) => {
        const progress = this.contractService.getProgress(c.id);
        return {
          ...c,
          items: (progress?.items ?? []).map((item) => ({
            ...item,
            name: ITEM_DEFINITIONS.find((d) => d.id === item.itemId)?.name ?? item.itemId,
          })),
          completable: this.contractService.isCompletable(c.id),
        };
      }),
  );

  protected readonly completedContracts = computed(() =>
    this.allContracts().filter((c) => c.state === ContractState.Completed),
  );

  protected accept(instanceId: string): void {
    this.contractService.acceptContract(instanceId);
  }

  protected deliver(instanceId: string): void {
    this.contractService.deliverContract(instanceId);
  }
}
