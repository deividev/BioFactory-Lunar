import { beforeEach, describe, expect, it } from 'vitest';

import type { ResourceAmount } from '../models';
import { GameStateService } from './game-state.service';
import { ResourceService } from './resource.service';

describe('ResourceService', () => {
  let gameState: GameStateService;
  let service: ResourceService;

  beforeEach(() => {
    gameState = new GameStateService();
    service = new ResourceService(gameState);
  });

  function snapshotResources(): Record<string, number> {
    return gameState.getSnapshot().resources.values;
  }

  it('reads balances and checks affordability for known resources from game state', () => {
    expect(service.balances()).toEqual({
      credits: 200,
      energy: 100,
      water: 100,
      nutrients: 20,
      oxygen: 100,
    });
    expect(service.getAmount('credits')).toBe(200);
    expect(service.getAmount('water')).toBe(100);
    expect(service.has('nutrients', 20)).toBe(true);
    expect(service.has('nutrients', 21)).toBe(false);
    expect(service.canAfford([{ resourceId: 'water', quantity: 10 }])).toBe(true);
    expect(
      service.canAfford([
        { resourceId: 'water', quantity: 10 },
        { resourceId: 'nutrients', quantity: 21 },
      ]),
    ).toBe(false);
  });

  it('adds known resources without mutating unrelated balances', () => {
    expect(service.consume('water', 25)).toEqual({ success: true });

    const result = service.add('water', 10);

    expect(result).toEqual({ success: true });
    expect(snapshotResources()).toEqual({
      credits: 200,
      energy: 100,
      water: 85,
      nutrients: 20,
      oxygen: 100,
    });

    expect(service.add('credits', 50)).toEqual({ success: true });
    expect(snapshotResources()).toEqual({
      credits: 250,
      energy: 100,
      water: 85,
      nutrients: 20,
      oxygen: 100,
    });
  });

  it('consumes known resources while preserving non-negative balances', () => {
    const result = service.consume('credits', 75);

    expect(result).toEqual({ success: true });
    expect(service.getAmount('credits')).toBe(125);
    expect(service.has('credits', 126)).toBe(false);
    expect(service.canAfford([{ resourceId: 'credits', quantity: 125 }])).toBe(true);
  });

  it('rejects unknown resource IDs and invalid amounts without changing state', () => {
    const before = snapshotResources();
    const invalidCosts: ResourceAmount[] = [{ resourceId: 'credits', quantity: Number.NaN }];

    expect(service.add('helium', 1)).toEqual({
      success: false,
      code: 'unknown_resource',
      message: 'Unknown resource: helium',
    });
    expect(service.consume('helium', 1)).toEqual({
      success: false,
      code: 'unknown_resource',
      message: 'Unknown resource: helium',
    });
    expect(service.add('credits', 0)).toEqual({
      success: false,
      code: 'invalid_quantity',
      message: 'Quantity must be a positive finite number.',
    });
    expect(service.consume('credits', Number.POSITIVE_INFINITY)).toEqual({
      success: false,
      code: 'invalid_quantity',
      message: 'Quantity must be a positive finite number.',
    });
    expect(service.getAmount('helium')).toBe(0);
    expect(service.has('helium', 1)).toBe(false);
    expect(service.has('credits', -1)).toBe(false);
    expect(service.canAfford([{ resourceId: 'helium', quantity: 1 }])).toBe(false);
    expect(service.canAfford(invalidCosts)).toBe(false);
    expect(snapshotResources()).toEqual(before);
  });

  it('rejects cap overflow and insufficient balances without changing state', () => {
    const beforeCapOverflow = snapshotResources();

    expect(service.add('water', 1)).toEqual({
      success: false,
      code: 'resource_cap_exceeded',
      message: 'Adding 1 water would exceed the cap of 100.',
    });
    expect(service.add('oxygen', 1)).toEqual({
      success: false,
      code: 'resource_cap_exceeded',
      message: 'Adding 1 oxygen would exceed the cap of 100.',
    });
    expect(snapshotResources()).toEqual(beforeCapOverflow);

    const beforeInsufficient = snapshotResources();

    expect(service.consume('nutrients', 25)).toEqual({
      success: false,
      code: 'insufficient_resource',
      message: 'Not enough nutrients: requires 25, available 20.',
    });
    expect(snapshotResources()).toEqual(beforeInsufficient);
  });
});
