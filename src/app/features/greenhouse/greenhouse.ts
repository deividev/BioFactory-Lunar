import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CROP_DEFINITIONS } from '../../core/data';
import { GameStateService } from '../../core/services';

@Component({
  selector: 'app-greenhouse',
  templateUrl: './greenhouse.html',
  styleUrl: './greenhouse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Greenhouse {
  private readonly gameState = inject(GameStateService);

  protected readonly cropCatalog = CROP_DEFINITIONS;
  protected readonly slots = computed(() => this.gameState.greenhouse().slots);
}
