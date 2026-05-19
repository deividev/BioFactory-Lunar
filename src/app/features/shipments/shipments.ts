import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { SHIPMENT_CATALOG } from '../../core/data';
import { GameStateService } from '../../core/services';

@Component({
  selector: 'app-shipments',
  templateUrl: './shipments.html',
  styleUrl: './shipments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shipments {
  private readonly gameState = inject(GameStateService);

  protected readonly shipmentCatalog = SHIPMENT_CATALOG;
  protected readonly activeShipmentCount = computed(() => this.gameState.shipments().length);
}
