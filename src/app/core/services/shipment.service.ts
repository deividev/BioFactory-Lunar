import { effect, Injectable, untracked } from '@angular/core';

import {
  areDemoUnlockRequirementsMet,
  ITEM_DEFINITIONS,
  RESOURCE_DEFINITIONS,
  TUTORIAL_STARTER_SHIPMENT_CATALOG_ID,
} from '../data';
import { SHIPMENT_CATALOG } from '../data/economy.data';
import { ContractState, ShipmentState } from '../enums';
import { InventoryService } from './inventory.service';
import { ResourceService } from './resource.service';
import { AlertService } from './alert.service';
import { GameClockService } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { TutorialService } from './tutorial.service';

const RESOURCE_CAP_BY_ID = new Map(
  RESOURCE_DEFINITIONS.map((definition) => [definition.id, definition.maxDefault]),
);
const KNOWN_ITEM_IDS = new Set(ITEM_DEFINITIONS.map((definition) => definition.id));

@Injectable({ providedIn: 'root' })
export class ShipmentService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly gameClock: GameClockService,
    private readonly inventory: InventoryService,
    private readonly resources: ResourceService,
    private readonly alerts: AlertService,
    private readonly tutorialService: TutorialService,
  ) {
    effect(() => {
      const tick = this.gameClock.lastTick();
      if (tick === undefined) return;
      untracked(() => this.processTick(tick.deltaGameSeconds));
    });
  }

  isShipmentUnlocked(catalogItemId: string): boolean {
    const item = SHIPMENT_CATALOG.find((catalogItem) => catalogItem.id === catalogItemId);

    return item !== undefined && areDemoUnlockRequirementsMet(item.unlockRequirementIds, this.getUnlockContext());
  }

  buyShipment(catalogItemId: string): void {
    const item = SHIPMENT_CATALOG.find((c) => c.id === catalogItemId);
    if (!item) {
      this.alerts.addWarning('Shipment not found.');
      return;
    }

    if (!this.isShipmentUnlocked(catalogItemId)) {
      this.alerts.addWarning('This shipment is not unlocked yet.');
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
    if (catalogItemId === TUTORIAL_STARTER_SHIPMENT_CATALOG_ID) {
      this.tutorialService.completeStep('buy_seeds');
    }
  }

  receiveShipment(shipmentId: string): void {
    const shipment = this.gameState.shipments().find((s) => s.id === shipmentId);
    if (!shipment || shipment.state !== ShipmentState.Delivered) return;

    const catalogItem = SHIPMENT_CATALOG.find((c) => c.id === shipment.catalogItemId);
    if (!catalogItem) return;

    const receiveError = this.validateReceivablePayload(catalogItem);
    if (receiveError !== undefined) {
      this.alerts.addWarning(receiveError);
      return;
    }

    if (catalogItem.item) {
      const { itemId, quantity } = catalogItem.item;
      const result = this.inventory.addItem(itemId, quantity);
      if (!result.success) {
        this.alerts.addWarning(result.message);
        return;
      }
    }

    if (catalogItem.resource) {
      const { resourceId, quantity } = catalogItem.resource;
      const result = this.resources.add(resourceId, quantity);
      if (!result.success) {
        this.alerts.addWarning(result.message);
        return;
      }
    }

    this.gameState.updateShipments((list) => list.filter((s) => s.id !== shipmentId));
    this.alerts.addSuccess(`${catalogItem.name} received!`);
    if (shipment.catalogItemId === TUTORIAL_STARTER_SHIPMENT_CATALOG_ID) {
      this.tutorialService.completeStep('receive_seeds');
    }
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

  private validateReceivablePayload(catalogItem: (typeof SHIPMENT_CATALOG)[number]): string | undefined {
    if (catalogItem.item !== undefined) {
      if (!KNOWN_ITEM_IDS.has(catalogItem.item.itemId)) {
        return `Unknown item: ${catalogItem.item.itemId}`;
      }

      const nextUsedCapacity = this.inventory.usedCapacity() + catalogItem.item.quantity;
      const capacity = this.gameState.inventory().capacity;

      if (nextUsedCapacity > capacity) {
        return `Adding ${catalogItem.item.quantity} ${catalogItem.item.itemId} would exceed inventory capacity of ${capacity}.`;
      }
    }

    if (catalogItem.resource !== undefined) {
      const { resourceId, quantity } = catalogItem.resource;
      if (!RESOURCE_CAP_BY_ID.has(resourceId)) {
        return `Unknown resource: ${resourceId}`;
      }

      const nextAmount = this.resources.getAmount(resourceId) + quantity;
      const cap = this.gameState.resources().maxValues[resourceId] ?? RESOURCE_CAP_BY_ID.get(resourceId);

      if (cap !== undefined && nextAmount > cap) {
        return `Adding ${quantity} ${resourceId} would exceed the cap of ${cap}.`;
      }
    }

    return undefined;
  }

  private getUnlockContext() {
    return {
      completedContractIds: this.gameState.contracts()
        .filter((contract) => contract.state === ContractState.Completed)
        .map((contract) => contract.id),
      infrastructureUpgradeIds: [
        ...this.gameState.infrastructure().colonySupportUpgradeIds,
        ...this.gameState.infrastructure().storageUpgradeIds,
      ],
    };
  }
}
