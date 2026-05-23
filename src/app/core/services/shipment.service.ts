import { effect, Injectable } from '@angular/core';

import { SHIPMENT_CATALOG } from '../data/economy.data';
import { ShipmentState } from '../enums';
import { AlertService } from './alert.service';
import { GameClockService } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { TutorialService } from './tutorial.service';

@Injectable({ providedIn: 'root' })
export class ShipmentService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly gameClock: GameClockService,
    private readonly alerts: AlertService,
    private readonly tutorialService: TutorialService,
  ) {
    effect(() => {
      const tick = this.gameClock.lastTick();
      if (tick === undefined) return;
      this.processTick(tick.deltaGameSeconds);
    });
  }

  buyShipment(catalogItemId: string): void {
    const item = SHIPMENT_CATALOG.find((c) => c.id === catalogItemId);
    if (!item) {
      this.alerts.addWarning('Shipment not found.');
      return;
    }

    const currentBalance = this.gameState.resources().values[item.cost.resourceId] ?? 0;
    if (currentBalance < item.cost.quantity) {
      this.alerts.addWarning('Not enough credits to order this shipment.');
      return;
    }

    this.gameState.updateResources((r) => ({
      ...r,
      values: {
        ...r.values,
        [item.cost.resourceId]: (r.values[item.cost.resourceId] ?? 0) - item.cost.quantity,
      },
    }));

    this.gameState.updateShipments((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        catalogItemId,
        state: ShipmentState.InTransit,
        remainingSeconds: item.durationSeconds,
      },
    ]);
    this.tutorialService.completeStep('buy_seeds');
  }

  receiveShipment(shipmentId: string): void {
    const shipment = this.gameState.shipments().find((s) => s.id === shipmentId);
    if (!shipment || shipment.state !== ShipmentState.Delivered) return;

    const catalogItem = SHIPMENT_CATALOG.find((c) => c.id === shipment.catalogItemId);
    if (!catalogItem) return;

    if (catalogItem.item) {
      const { itemId, quantity } = catalogItem.item;
      this.gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, [itemId]: (inv.items[itemId] ?? 0) + quantity },
      }));
    }

    if (catalogItem.resource) {
      const { resourceId, quantity } = catalogItem.resource;
      this.gameState.updateResources((r) => ({
        ...r,
        values: { ...r.values, [resourceId]: (r.values[resourceId] ?? 0) + quantity },
      }));
    }

    this.gameState.updateShipments((list) => list.filter((s) => s.id !== shipmentId));
    this.alerts.addSuccess(`${catalogItem.name} received!`);
    this.tutorialService.completeStep('receive_seeds');
  }

  processTick(deltaGameSeconds: number): void {
    if (deltaGameSeconds <= 0) return;
    this.gameState.updateShipments((shipments) =>
      shipments.map((s) => {
        if (s.state !== ShipmentState.InTransit) return s;
        const next = Math.max(0, s.remainingSeconds - deltaGameSeconds);
        return {
          ...s,
          remainingSeconds: next,
          state: next <= 0 ? ShipmentState.Delivered : ShipmentState.InTransit,
        };
      }),
    );
  }
}
