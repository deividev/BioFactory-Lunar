import { computed, Injectable, type Signal } from '@angular/core';

import { ITEM_DEFINITIONS } from '../data';
import type { ActionResult, ItemAmount, ItemDefinition, InventoryState } from '../models';
import { GameStateService } from './game-state.service';

export type InventoryActionFailureCode =
  | 'unknown_item'
  | 'invalid_quantity'
  | 'inventory_capacity_exceeded'
  | 'insufficient_item';

export type InventoryActionResult = ActionResult<InventoryActionFailureCode>;

const ITEM_DEFINITION_BY_ID = new Map<string, ItemDefinition>(
  ITEM_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const SUCCESS: InventoryActionResult = { success: true };

function calculateUsedCapacity(items: Readonly<Record<string, number>>): number {
  return Object.values(items).reduce((total, quantity) => total + Math.max(0, quantity), 0);
}

function calculateRemainingCapacity(inventory: InventoryState): number {
  return Math.max(0, inventory.capacity - calculateUsedCapacity(inventory.items));
}

function cloneAndFreezeItems(items: Record<string, number>): Readonly<Record<string, number>> {
  return Object.freeze({ ...items });
}

function invalidQuantityResult(): InventoryActionResult {
  return {
    success: false,
    code: 'invalid_quantity',
    message: 'Quantity must be a positive finite number.',
  };
}

function unknownItemResult(itemId: string): InventoryActionResult {
  return {
    success: false,
    code: 'unknown_item',
    message: `Unknown item: ${itemId}`,
  };
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  readonly items: Signal<Readonly<Record<string, number>>> = computed(() =>
    cloneAndFreezeItems(this.gameState.inventory().items),
  );

  readonly usedCapacity: Signal<number> = computed(() => calculateUsedCapacity(this.gameState.inventory().items));

  readonly remainingCapacity: Signal<number> = computed(() => calculateRemainingCapacity(this.gameState.inventory()));

  constructor(private readonly gameState: GameStateService) {}

  getQuantity(itemId: string): number {
    if (!this.isKnownItem(itemId)) {
      return 0;
    }

    return this.gameState.inventory().items[itemId] ?? 0;
  }

  hasItems(items: readonly ItemAmount[]): boolean {
    return items.every(
      (item) =>
        this.isKnownItem(item.itemId) &&
        this.isValidQuantity(item.quantity) &&
        this.getQuantity(item.itemId) >= item.quantity,
    );
  }

  addItem(itemId: string, quantity: number): InventoryActionResult {
    const validationError = this.validateItemChange(itemId, quantity);

    if (validationError !== undefined) {
      return validationError;
    }

    const inventory = this.gameState.inventory();
    const nextUsedCapacity = calculateUsedCapacity(inventory.items) + quantity;

    if (nextUsedCapacity > inventory.capacity) {
      return {
        success: false,
        code: 'inventory_capacity_exceeded',
        message: `Adding ${quantity} ${itemId} would exceed inventory capacity of ${inventory.capacity}.`,
      };
    }

    this.gameState.updateInventory((currentInventory) => ({
      ...currentInventory,
      items: {
        ...currentInventory.items,
        [itemId]: (currentInventory.items[itemId] ?? 0) + quantity,
      },
    }));

    return SUCCESS;
  }

  consumeItem(itemId: string, quantity: number): InventoryActionResult {
    const validationError = this.validateItemChange(itemId, quantity);

    if (validationError !== undefined) {
      return validationError;
    }

    const currentQuantity = this.getQuantity(itemId);

    if (currentQuantity < quantity) {
      return {
        success: false,
        code: 'insufficient_item',
        message: `Not enough ${itemId}: requires ${quantity}, available ${currentQuantity}.`,
      };
    }

    this.gameState.updateInventory((inventory) => {
      const nextItems = { ...inventory.items };
      const nextQuantity = currentQuantity - quantity;

      if (nextQuantity === 0) {
        delete nextItems[itemId];
      } else {
        nextItems[itemId] = nextQuantity;
      }

      return {
        ...inventory,
        items: nextItems,
      };
    });

    return SUCCESS;
  }

  private validateItemChange(itemId: string, quantity: number): InventoryActionResult | undefined {
    if (!this.isKnownItem(itemId)) {
      return unknownItemResult(itemId);
    }

    if (!this.isValidQuantity(quantity)) {
      return invalidQuantityResult();
    }

    return undefined;
  }

  private isKnownItem(itemId: string): boolean {
    return ITEM_DEFINITION_BY_ID.has(itemId);
  }

  private isValidQuantity(quantity: number): boolean {
    return Number.isFinite(quantity) && quantity > 0;
  }
}
