import { beforeEach, describe, expect, it } from 'vitest';

import type { ItemAmount } from '../models';
import { GameStateService } from './game-state.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let gameState: GameStateService;
  let service: InventoryService;

  beforeEach(() => {
    gameState = new GameStateService();
    service = new InventoryService(gameState);
  });

  function snapshotItems(): Record<string, number> {
    return gameState.getSnapshot().inventory.items;
  }

  it('reads item quantities, capacity, and requirements from game state with mutation-safe item views', () => {
    expect(service.items()).toEqual({
      seed_protein_leaf: 2,
    });
    expect(service.getQuantity('seed_protein_leaf')).toBe(2);
    expect(service.getQuantity('biofood_pack')).toBe(0);
    expect(service.getQuantity('unknown_item')).toBe(0);
    expect(service.usedCapacity()).toBe(2);
    expect(service.remainingCapacity()).toBe(98);
    expect(service.hasItems([{ itemId: 'seed_protein_leaf', quantity: 2 }])).toBe(true);
    expect(service.hasItems([{ itemId: 'seed_protein_leaf', quantity: 3 }])).toBe(false);
    expect(
      service.hasItems([
        { itemId: 'seed_protein_leaf', quantity: 1 },
        { itemId: 'biofood_pack', quantity: 1 },
      ]),
    ).toBe(false);

    const itemsView = service.items();

    expect(Object.isFrozen(itemsView)).toBe(true);
    expect(() => {
      (itemsView as Record<string, number>)['seed_protein_leaf'] = 99;
    }).toThrow(TypeError);
    expect(service.getQuantity('seed_protein_leaf')).toBe(2);
  });

  it('adds known items within total-quantity capacity without mutating unrelated quantities', () => {
    const result = service.addItem('biofood_pack', 3);

    expect(result).toEqual({ success: true });
    expect(snapshotItems()).toEqual({
      seed_protein_leaf: 2,
      biofood_pack: 3,
    });
    expect(service.usedCapacity()).toBe(5);
    expect(service.remainingCapacity()).toBe(95);

    expect(service.addItem('seed_protein_leaf', 4)).toEqual({ success: true });
    expect(snapshotItems()).toEqual({
      seed_protein_leaf: 6,
      biofood_pack: 3,
    });
    expect(service.usedCapacity()).toBe(9);
  });

  it('consumes known items and removes the stored key when quantity reaches zero', () => {
    expect(service.consumeItem('seed_protein_leaf', 1)).toEqual({ success: true });

    expect(snapshotItems()).toEqual({
      seed_protein_leaf: 1,
    });
    expect(service.usedCapacity()).toBe(1);
    expect(service.hasItems([{ itemId: 'seed_protein_leaf', quantity: 1 }])).toBe(true);

    expect(service.consumeItem('seed_protein_leaf', 1)).toEqual({ success: true });
    expect(snapshotItems()).toEqual({});
    expect(service.getQuantity('seed_protein_leaf')).toBe(0);
    expect(service.usedCapacity()).toBe(0);
    expect(service.remainingCapacity()).toBe(100);
  });

  it('rejects unknown item IDs and invalid quantities without changing state', () => {
    const before = snapshotItems();
    const invalidRequirements: ItemAmount[] = [{ itemId: 'seed_protein_leaf', quantity: Number.NaN }];

    expect(service.addItem('moon_cheese', 1)).toEqual({
      success: false,
      code: 'unknown_item',
      message: 'Unknown item: moon_cheese',
    });
    expect(service.consumeItem('moon_cheese', 1)).toEqual({
      success: false,
      code: 'unknown_item',
      message: 'Unknown item: moon_cheese',
    });
    expect(service.addItem('seed_protein_leaf', 0)).toEqual({
      success: false,
      code: 'invalid_quantity',
      message: 'Quantity must be a positive finite number.',
    });
    expect(service.consumeItem('seed_protein_leaf', Number.NEGATIVE_INFINITY)).toEqual({
      success: false,
      code: 'invalid_quantity',
      message: 'Quantity must be a positive finite number.',
    });
    expect(service.hasItems([{ itemId: 'moon_cheese', quantity: 1 }])).toBe(false);
    expect(service.hasItems(invalidRequirements)).toBe(false);
    expect(snapshotItems()).toEqual(before);
  });

  it('rejects capacity overflow and insufficient quantities without changing state', () => {
    const beforeCapacityOverflow = snapshotItems();

    expect(service.addItem('biofood_pack', 99)).toEqual({
      success: false,
      code: 'inventory_capacity_exceeded',
      message: 'Adding 99 biofood_pack would exceed inventory capacity of 100.',
    });
    expect(snapshotItems()).toEqual(beforeCapacityOverflow);
    expect(service.usedCapacity()).toBe(2);

    const beforeInsufficient = snapshotItems();

    expect(service.consumeItem('seed_protein_leaf', 3)).toEqual({
      success: false,
      code: 'insufficient_item',
      message: 'Not enough seed_protein_leaf: requires 3, available 2.',
    });
    expect(service.consumeItem('biofood_pack', 1)).toEqual({
      success: false,
      code: 'insufficient_item',
      message: 'Not enough biofood_pack: requires 1, available 0.',
    });
    expect(snapshotItems()).toEqual(beforeInsufficient);
  });
});
