import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CONTRACT_DEFINITIONS, ITEM_DEFINITIONS, isDemoContractVisible } from '../../core/data';
import { ContractState } from '../../core/enums';
import { ContractService, GameStateService, TutorialService } from '../../core/services';

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
      return {
        ...c,
        name: def?.name ?? c.definitionId,
        rewardCredits: def?.rewards.find((r) => r.resourceId === 'credits')?.quantity ?? 0,
      };
    }),
  );

  protected readonly availableContracts = computed(() =>
    this.allContracts().filter(
      (c) => c.state === ContractState.Available && isDemoContractVisible(c.id, this.tutorialService.isComplete()),
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
