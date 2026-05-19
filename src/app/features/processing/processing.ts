import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { MACHINE_DEFINITIONS, RECIPE_DEFINITIONS } from '../../core/data';
import { GameStateService } from '../../core/services';

@Component({
  selector: 'app-processing',
  templateUrl: './processing.html',
  styleUrl: './processing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Processing {
  private readonly gameState = inject(GameStateService);

  protected readonly machines = computed(() =>
    this.gameState.machines().map((machine) => ({
      ...machine,
      name: MACHINE_DEFINITIONS.find((definition) => definition.id === machine.definitionId)?.name ?? machine.definitionId,
    })),
  );
  protected readonly recipeCount = RECIPE_DEFINITIONS.length;
}
