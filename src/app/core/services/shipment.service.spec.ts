import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GameSpeed, ShipmentState } from '../enums';
import type { ShipmentCatalogItem, ShipmentInstance } from '../models';
import { AlertService } from './alert.service';
import { type GameClockTick } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { ShipmentService } from './shipment.service';

let lastEffectFn: (() => void) | undefined;

vi.mock('@angular/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@angular/core')>();
  return {
    ...mod,
    effect: vi.fn((fn: () => void) => {
      lastEffectFn = fn;
    }),
  };
});

vi.mock('../data/economy.data', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    SHIPMENT_CATALOG: [
      ...(mod['SHIPMENT_CATALOG'] as readonly ShipmentCatalogItem[]),
      {
        id: 'shipment_test_no_payload',
        name: 'No Payload Test',
        cost: { resourceId: 'credits', quantity: 5 },
        durationSeconds: 10,
      } satisfies ShipmentCatalogItem,
      {
        id: 'shipment_test_alt_cost',
        name: 'Alt Cost Test',
        cost: { resourceId: 'oxygen', quantity: 5 },
        durationSeconds: 10,
      } satisfies ShipmentCatalogItem,
      {
        id: 'shipment_test_free_oxygen',
        name: 'Free Oxygen Test',
        cost: { resourceId: 'oxygen', quantity: 0 },
        durationSeconds: 10,
      } satisfies ShipmentCatalogItem,
      {
        id: 'shipment_test_new_resource_payload',
        name: 'New Resource Payload Test',
        cost: { resourceId: 'credits', quantity: 5 },
        resource: { resourceId: 'oxygen', quantity: 10 },
        durationSeconds: 10,
      } satisfies ShipmentCatalogItem,
    ],
  };
});

describe('ShipmentService', () => {
  let service: ShipmentService;
  let gameState: GameStateService;
  let alerts: AlertService;
  let mockLastTick: ReturnType<typeof signal<GameClockTick | undefined>>;

  beforeEach(() => {
    lastEffectFn = undefined;
    gameState = new GameStateService();
    alerts = new AlertService(gameState);
    mockLastTick = signal<GameClockTick | undefined>(undefined);
    const mockGameClock = { lastTick: mockLastTick.asReadonly() };
    service = new ShipmentService(gameState, mockGameClock as never, alerts);
  });

  function makeTick(deltaGameSeconds: number): GameClockTick {
    const clock = { elapsedSeconds: 0, day: 1, speed: GameSpeed.X1 };
    return { previousClock: clock, currentClock: clock, deltaRealSeconds: 1, deltaGameSeconds };
  }

  // ── T-02: buyShipment tests ────────────────────────────────────────────────

  it('deducts credits and creates an InTransit shipment when credits >= cost', () => {
    service.buyShipment('shipment_seed_protein_leaf_pack');

    const snapshot = gameState.getSnapshot();
    expect(snapshot.resources.values['credits']).toBe(170); // 200 - 30
    expect(snapshot.shipments).toHaveLength(1);
    const shipment = snapshot.shipments[0]!;
    expect(shipment.catalogItemId).toBe('shipment_seed_protein_leaf_pack');
    expect(shipment.state).toBe(ShipmentState.InTransit);
    expect(shipment.remainingSeconds).toBe(45);
    expect(typeof shipment.id).toBe('string');
    expect(shipment.id).toHaveLength(36);
  });

  it('calls addWarning and does not mutate state when credits < cost', () => {
    gameState.updateResources((r) => ({ ...r, values: { ...r.values, credits: 10 } }));
    const warnSpy = vi.spyOn(alerts, 'addWarning');

    service.buyShipment('shipment_seed_protein_leaf_pack');

    expect(warnSpy).toHaveBeenCalledWith('Not enough credits to order this shipment.');
    expect(gameState.getSnapshot().shipments).toHaveLength(0);
    expect(gameState.getSnapshot().resources.values['credits']).toBe(10);
  });

  it('succeeds when credits exactly equal the cost (boundary inclusive)', () => {
    gameState.updateResources((r) => ({ ...r, values: { ...r.values, credits: 30 } }));

    service.buyShipment('shipment_seed_protein_leaf_pack');

    const snapshot = gameState.getSnapshot();
    expect(snapshot.resources.values['credits']).toBe(0);
    expect(snapshot.shipments).toHaveLength(1);
    expect(snapshot.shipments[0]!.state).toBe(ShipmentState.InTransit);
  });

  it('calls addWarning and does not mutate state for unknown catalogItemId', () => {
    const warnSpy = vi.spyOn(alerts, 'addWarning');

    service.buyShipment('shipment_does_not_exist');

    expect(warnSpy).toHaveBeenCalledWith('Shipment not found.');
    expect(gameState.getSnapshot().shipments).toHaveLength(0);
    expect(gameState.getSnapshot().resources.values['credits']).toBe(200);
  });

  // ── T-04: tick behavior tests ──────────────────────────────────────────────

  it('decrements remainingSeconds for InTransit shipments on positive delta', () => {
    gameState.updateShipments(() => [
      { id: 'ship_01', catalogItemId: 'shipment_seed_protein_leaf_pack', state: ShipmentState.InTransit, remainingSeconds: 30 },
    ]);

    service.processTick(10);

    const shipment = gameState.getSnapshot().shipments[0]!;
    expect(shipment.remainingSeconds).toBe(20);
    expect(shipment.state).toBe(ShipmentState.InTransit);
  });

  it('transitions shipment to Delivered and sets remainingSeconds to 0 when delta >= remaining', () => {
    gameState.updateShipments(() => [
      { id: 'ship_02', catalogItemId: 'shipment_seed_protein_leaf_pack', state: ShipmentState.InTransit, remainingSeconds: 10 },
    ]);

    service.processTick(15);

    const shipment = gameState.getSnapshot().shipments[0]!;
    expect(shipment.remainingSeconds).toBe(0);
    expect(shipment.state).toBe(ShipmentState.Delivered);
  });

  it('does not call updateShipments when deltaGameSeconds is zero or negative', () => {
    const spy = vi.spyOn(gameState, 'updateShipments');

    service.processTick(0);
    expect(spy).not.toHaveBeenCalled();

    service.processTick(-5);
    expect(spy).not.toHaveBeenCalled();
  });

  it('leaves Delivered shipments unchanged after tick', () => {
    gameState.updateShipments(() => [
      { id: 'ship_03', catalogItemId: 'shipment_seed_protein_leaf_pack', state: ShipmentState.Delivered, remainingSeconds: 0 },
    ]);

    service.processTick(10);

    const shipment = gameState.getSnapshot().shipments[0]!;
    expect(shipment.state).toBe(ShipmentState.Delivered);
    expect(shipment.remainingSeconds).toBe(0);
  });

  // ── T-06: receiveShipment tests ────────────────────────────────────────────

  it('adds item payload to inventory, removes shipment, and calls addSuccess on delivery', () => {
    const delivered: ShipmentInstance = {
      id: 'ship_item_01',
      catalogItemId: 'shipment_seed_protein_leaf_pack',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    const successSpy = vi.spyOn(alerts, 'addSuccess');

    service.receiveShipment('ship_item_01');

    expect(gameState.getSnapshot().inventory.items['seed_protein_leaf']).toBe(5); // 2 + 3
    expect(gameState.getSnapshot().shipments).toHaveLength(0);
    expect(successSpy).toHaveBeenCalledWith('Protein Leaf Seed Pack received!');
  });

  it('adds resource payload to resources, removes shipment, and calls addSuccess on delivery', () => {
    const delivered: ShipmentInstance = {
      id: 'ship_water_01',
      catalogItemId: 'shipment_water_supply',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    const successSpy = vi.spyOn(alerts, 'addSuccess');

    service.receiveShipment('ship_water_01');

    expect(gameState.getSnapshot().resources.values['water']).toBe(125); // 100 + 25
    expect(gameState.getSnapshot().shipments).toHaveLength(0);
    expect(successSpy).toHaveBeenCalledWith('Water Supply received!');
  });

  it('does not change state or fire alerts for an InTransit shipment', () => {
    const inTransit: ShipmentInstance = {
      id: 'ship_transit_01',
      catalogItemId: 'shipment_seed_protein_leaf_pack',
      state: ShipmentState.InTransit,
      remainingSeconds: 20,
    };
    gameState.updateShipments((list) => [...list, inTransit]);
    const successSpy = vi.spyOn(alerts, 'addSuccess');
    const warnSpy = vi.spyOn(alerts, 'addWarning');

    service.receiveShipment('ship_transit_01');

    expect(gameState.getSnapshot().shipments).toHaveLength(1);
    expect(successSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('is a no-op and does not throw for an unknown shipment id', () => {
    const initialSnapshot = gameState.getSnapshot();

    expect(() => service.receiveShipment('nonexistent_ship_id')).not.toThrow();

    expect(gameState.getSnapshot().shipments).toEqual(initialSnapshot.shipments);
    expect(gameState.getSnapshot().resources).toEqual(initialSnapshot.resources);
    expect(gameState.getSnapshot().inventory).toEqual(initialSnapshot.inventory);
  });

  it('removes shipment and calls addSuccess even when catalog item has no item or resource payload', () => {
    const noPayload: ShipmentInstance = {
      id: 'ship_no_payload_01',
      catalogItemId: 'shipment_test_no_payload',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, noPayload]);
    const successSpy = vi.spyOn(alerts, 'addSuccess');
    const initialInventory = gameState.getSnapshot().inventory;
    const initialResources = gameState.getSnapshot().resources;

    service.receiveShipment('ship_no_payload_01');

    expect(gameState.getSnapshot().shipments).toHaveLength(0);
    expect(successSpy).toHaveBeenCalledWith('No Payload Test received!');
    expect(gameState.getSnapshot().inventory).toEqual(initialInventory);
    expect(gameState.getSnapshot().resources).toEqual(initialResources);
  });

  // ── Effect callback routing ────────────────────────────────────────────────

  it('effect callback exits early without calling processTick when tick is undefined', () => {
    const spy = vi.spyOn(service, 'processTick');
    lastEffectFn!();
    expect(spy).not.toHaveBeenCalled();
  });

  it('effect callback delegates to processTick with the correct delta when tick is defined', () => {
    mockLastTick.set(makeTick(7));
    const spy = vi.spyOn(service, 'processTick');
    lastEffectFn!();
    expect(spy).toHaveBeenCalledWith(7);
  });

  // ── Null-coalescing and defensive-guard coverage ───────────────────────────

  it('treats undefined resource balance as zero when checking affordability', () => {
    // 'oxygen' is not in the initial resource state; balance check ?? fallback fires
    const warnSpy = vi.spyOn(alerts, 'addWarning');
    service.buyShipment('shipment_test_alt_cost'); // costs 5 oxygen; undefined ?? 0 = 0 < 5
    expect(warnSpy).toHaveBeenCalledWith('Not enough credits to order this shipment.');
  });

  it('treats undefined resource value as zero when deducting after a zero-cost purchase', () => {
    // 'oxygen' is not in the initial state; zero cost passes the check; deduction ?? 0 fires
    service.buyShipment('shipment_test_free_oxygen'); // costs 0 oxygen; 0 >= 0 → purchase OK
    expect(gameState.getSnapshot().resources.values['oxygen']).toBe(0); // (undefined ?? 0) - 0 = 0
    expect(gameState.getSnapshot().shipments).toHaveLength(1);
  });

  it('treats undefined inventory quantity as zero when receiving an item payload for a new item', () => {
    // seed_aqua_sprout is not in the initial inventory; inventory ?? 0 fires
    const delivered: ShipmentInstance = {
      id: 'ship_aqua_01',
      catalogItemId: 'shipment_seed_aqua_sprout_pack', // item: seed_aqua_sprout x3
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    service.receiveShipment('ship_aqua_01');
    expect(gameState.getSnapshot().inventory.items['seed_aqua_sprout']).toBe(3); // (undefined ?? 0) + 3
  });

  it('treats undefined resource quantity as zero when receiving a resource payload for a new resource', () => {
    // 'oxygen' is not in the initial resource state; resource ?? 0 fires
    const delivered: ShipmentInstance = {
      id: 'ship_ox_01',
      catalogItemId: 'shipment_test_new_resource_payload', // resource: oxygen x10
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    service.receiveShipment('ship_ox_01');
    expect(gameState.getSnapshot().resources.values['oxygen']).toBe(10); // (undefined ?? 0) + 10
  });

  it('exits receiveShipment early if catalog item is not found for a delivered shipment', () => {
    // Defensive guard: catalogItem not found after shipment lookup
    const orphan: ShipmentInstance = {
      id: 'ship_orphan_01',
      catalogItemId: 'shipment_nonexistent_catalog_item',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, orphan]);
    const successSpy = vi.spyOn(alerts, 'addSuccess');
    service.receiveShipment('ship_orphan_01');
    expect(gameState.getSnapshot().shipments).toHaveLength(1);
    expect(successSpy).not.toHaveBeenCalled();
  });
});
