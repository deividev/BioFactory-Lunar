import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ITEM_DEFINITIONS, RESOURCE_DEFINITIONS, SHIPMENT_CATALOG } from '../../core/data';
import { ShipmentState } from '../../core/enums';
import type { ShipmentCatalogItem, ShipmentInstance } from '../../core/models';
import { GameStateService, ShipmentService } from '../../core/services';

@Component({
  selector: 'app-shipments',
  templateUrl: './shipments.html',
  styleUrl: './shipments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shipments {
  private readonly gameState = inject(GameStateService);
  private readonly shipmentSvc = inject(ShipmentService);

  protected readonly ShipmentState = ShipmentState;
  protected readonly catalog = computed<readonly ShipmentCatalogItem[]>(() =>
    SHIPMENT_CATALOG.filter((item) => this.shipmentSvc.isShipmentUnlocked(item.id)),
  );
  protected readonly activeShipments = computed<readonly ShipmentInstance[]>(() =>
    this.gameState.shipments().filter((s) => s.state === ShipmentState.InTransit),
  );
  protected readonly deliveredShipments = computed<readonly ShipmentInstance[]>(() =>
    this.gameState.shipments().filter((s) => s.state === ShipmentState.Delivered),
  );
  protected readonly credits = computed<number>(
    () => this.gameState.resources().values['credits'] ?? 0,
  );

  protected canAfford(item: ShipmentCatalogItem): boolean {
    return this.credits() >= item.cost.quantity;
  }

  protected getCatalogName(catalogItemId: string): string {
    return SHIPMENT_CATALOG.find((c) => c.id === catalogItemId)?.name ?? catalogItemId;
  }

  protected getRewardLabel(item: ShipmentCatalogItem): string {
    if (item.item) {
      const def = ITEM_DEFINITIONS.find((d) => d.id === item.item!.itemId);
      return `×${item.item.quantity} ${def?.name ?? item.item.itemId}`;
    }
    if (item.resource) {
      const def = RESOURCE_DEFINITIONS.find((d) => d.id === item.resource!.resourceId);
      return `×${item.resource.quantity} ${def?.name ?? item.resource.resourceId}`;
    }
    return '';
  }

  protected buy(item: ShipmentCatalogItem): void {
    this.shipmentSvc.buyShipment(item.id);
  }

  protected receive(shipmentId: string): void {
    this.shipmentSvc.receiveShipment(shipmentId);
  }
}
