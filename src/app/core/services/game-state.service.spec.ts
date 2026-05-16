import { describe, expect, it } from 'vitest';

import { createInitialGameState } from '../state';
import { GameStateService } from './game-state.service';

describe('GameStateService', () => {
  it('exposes a valid initial state snapshot with non-negative resource and inventory quantities', () => {
    const service = new GameStateService();

    const snapshot = service.getSnapshot();

    expect(snapshot.resources).toEqual({
      values: {
        credits: 200,
        energy: 100,
        water: 100,
        nutrients: 20,
      },
      maxValues: {
        energy: 100,
        water: 100,
        nutrients: 100,
      },
    });
    expect(snapshot.inventory).toEqual({
      items: {
        seed_protein_leaf: 2,
      },
      capacity: 100,
    });
    expect(Object.values(snapshot.resources.values).every((quantity) => quantity >= 0)).toBe(true);
    expect(Object.values(snapshot.inventory.items).every((quantity) => quantity >= 0)).toBe(true);
  });

  it('resets mutated resource and inventory branches back to the initial state', () => {
    const service = new GameStateService();

    service.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 50, water: 25 },
    }));
    service.updateInventory((inventory) => ({
      ...inventory,
      items: { ...inventory.items, seed_protein_leaf: 0, biofood_pack: 3 },
    }));

    expect(service.getSnapshot().resources.values['credits']).toBe(50);
    expect(service.getSnapshot().inventory.items['biofood_pack']).toBe(3);

    service.reset();

    expect(service.getSnapshot()).toEqual(createInitialGameState());
  });

  it('returns clone-safe snapshots and frozen branch selectors instead of raw nested signal values', () => {
    const service = new GameStateService();

    const snapshot = service.getSnapshot();
    snapshot.resources.values['credits'] = 999;
    snapshot.inventory.items['seed_protein_leaf'] = 99;
    snapshot.greenhouse.slots[0]!.id = 'mutated_slot';

    expect(service.getSnapshot().resources.values['credits']).toBe(200);
    expect(service.getSnapshot().inventory.items['seed_protein_leaf']).toBe(2);
    expect(service.getSnapshot().greenhouse.slots[0]!.id).toBe('crop_slot_01');

    const resourcesView = service.resources();
    const inventoryView = service.inventory();

    expect(Object.isFrozen(resourcesView)).toBe(true);
    expect(Object.isFrozen(resourcesView.values)).toBe(true);
    expect(Object.isFrozen(resourcesView.maxValues)).toBe(true);
    expect(Object.isFrozen(inventoryView)).toBe(true);
    expect(Object.isFrozen(inventoryView.items)).toBe(true);
    expect(() => {
      (resourcesView.values as Record<string, number>)['credits'] = 1;
    }).toThrow(TypeError);
    expect(() => {
      (inventoryView.items as Record<string, number>)['seed_protein_leaf'] = 1;
    }).toThrow(TypeError);
    expect(service.getSnapshot().resources.values['credits']).toBe(200);
    expect(service.getSnapshot().inventory.items['seed_protein_leaf']).toBe(2);
  });

  it('updates resource and inventory branches without mutating unrelated state or leaking updater drafts', () => {
    const service = new GameStateService();
    const initial = service.getSnapshot();
    let leakedResourcesDraft = initial.resources;
    let leakedInventoryDraft = initial.inventory;

    service.updateResources((resources) => {
      leakedResourcesDraft = resources;
      resources.values['credits'] = 275;
      return resources;
    });
    service.updateInventory((inventory) => {
      leakedInventoryDraft = inventory;
      inventory.items['biofood_pack'] = 2;
      return inventory;
    });

    leakedResourcesDraft.values['credits'] = 1;
    leakedInventoryDraft.items['biofood_pack'] = 99;

    const updated = service.getSnapshot();
    expect(updated.resources.values['credits']).toBe(275);
    expect(updated.inventory.items['biofood_pack']).toBe(2);
    expect(updated.clock).toEqual(initial.clock);
    expect(updated.greenhouse).toEqual(initial.greenhouse);
    expect(updated.meta).toEqual(initial.meta);
  });
});