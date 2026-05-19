import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CONTRACT_DEFINITIONS } from '../../core/data';
import { GameStateService } from '../../core/services';

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.html',
  styleUrl: './contracts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contracts {
  private readonly gameState = inject(GameStateService);

  protected readonly contracts = computed(() =>
    this.gameState.contracts().map((contract) => ({
      ...contract,
      name: CONTRACT_DEFINITIONS.find((definition) => definition.id === contract.definitionId)?.name ?? contract.definitionId,
    })),
  );
}
