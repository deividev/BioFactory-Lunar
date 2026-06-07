import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractState, GameSpeed, ShipmentState } from '../enums';
import type { ShipmentCatalogItem, ShipmentInstance } from '../models';
import { AlertService } from './alert.service';
import { type GameClockTick } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { InventoryService } from './inventory.service';
import { ResourceService } from './resource.service';
import { ShipmentService } from './shipment.service';
import { TutorialService } from './tutorial.service';

let lastEffectFn: (() => void) | undefined;
const { untrackedSpy } = vi.hoisted(() => ({
  untrackedSpy: vi.fn((fn: () => void) => fn()),
}));

vi.mock('@angular/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@angular/core')>();
  return {
    ...mod,
    effect: vi.fn((fn: () => void) => {
      lastEffectFn = fn;
    }),
    untracked: untrackedSpy,
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
        cost: { resourceId: 'helium', quantity: 5 },
        durationSeconds: 10,
      } satisfies ShipmentCatalogItem,
      {
        id: 'shipment_test_free_oxygen',
        name: 'Free Oxygen Test',
        cost: { resourceId: 'helium', quantity: 0 },
        durationSeconds: 10,
      } satisfies ShipmentCatalogItem,
      {
        id: 'shipment_test_new_resource_payload',
        name: 'New Resource Payload Test',
        cost: { resourceId: 'credits', quantity: 5 },
        resource: { resourceId: 'helium', quantity: 10 },
        durationSeconds: 10,
      } satisfies ShipmentCatalogItem,
    ],
  };
});

describe('ShipmentService', () => {
  let service: ShipmentService;
  let gameState: GameStateService;
  let inventory: InventoryService;
  let resources: ResourceService;
  let alerts: AlertService;
  let tutorialService: TutorialService;
  let mockLastTick: ReturnType<typeof signal<GameClockTick | undefined>>;

  beforeEach(() => {
    lastEffectFn = undefined;
    untrackedSpy.mockClear();
    gameState = new GameStateService();
    inventory = new InventoryService(gameState);
    resources = new ResourceService(gameState);
    alerts = new AlertService(gameState);
    tutorialService = new TutorialService(gameState);
    mockLastTick = signal<GameClockTick | undefined>(undefined);
    const mockGameClock = { lastTick: mockLastTick.asReadonly() };
    service = new ShipmentService(gameState, mockGameClock as never, inventory, resources, alerts, tutorialService);
  });

  function makeTick(deltaGameSeconds: number): GameClockTick {
    const clock = { elapsedSeconds: 0, day: 1, speed: GameSpeed.X1 };
    return { previousClock: clock, currentClock: clock, deltaRealSeconds: 1, deltaGameSeconds };
  }

  // ── T-02: buyShipment tests ────────────────────────────────────────────────

  it('deducts credits and creates an InTransit shipment when credits >= cost', () => {
    service.buyShipment('shipment_seed_protein_leaf_pack');

    const snapshot = gameState.getSnapshot();
    expect(snapshot.resources.values['credits']).toBe(115); // 150 - 35
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
    gameState.updateResources((r) => ({ ...r, values: { ...r.values, credits: 35 } }));

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
    expect(gameState.getSnapshot().resources.values['credits']).toBe(150);
  });

  it('blocks locked seed shipments until their unlock requirement is met', () => {
    const warnSpy = vi.spyOn(alerts, 'addWarning');

    service.buyShipment('shipment_seed_aqua_sprout_pack');

    expect(warnSpy).toHaveBeenCalledWith('This shipment is not unlocked yet.');
    expect(gameState.getSnapshot().shipments).toHaveLength(0);
    expect(gameState.getSnapshot().resources.values['credits']).toBe(150);
  });

  it('unlocks the aqua sprout seed pack after the starter contract is completed', () => {
    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === 'contract_contract_starter_biofood_01'
          ? { ...contract, state: ContractState.Completed }
          : contract,
      ),
    );

    expect(service.isShipmentUnlocked('shipment_seed_aqua_sprout_pack')).toBe(true);

    service.buyShipment('shipment_seed_aqua_sprout_pack');

    expect(gameState.getSnapshot().resources.values['credits']).toBe(105);
    expect(gameState.getSnapshot().shipments).toHaveLength(1);
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

    expect(gameState.getSnapshot().inventory.items['seed_protein_leaf']).toBe(4);
    expect(gameState.getSnapshot().shipments).toHaveLength(0);
    expect(successSpy).toHaveBeenCalledWith('Protein Leaf Seed Pack received!');
  });

  it('adds resource payload to resources, removes shipment, and calls addSuccess on delivery', () => {
    gameState.updateResources((r) => ({ ...r, values: { ...r.values, water: 75 } }));
    const delivered: ShipmentInstance = {
      id: 'ship_water_01',
      catalogItemId: 'shipment_water_supply',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    const successSpy = vi.spyOn(alerts, 'addSuccess');

    service.receiveShipment('ship_water_01');

    expect(gameState.getSnapshot().resources.values['water']).toBe(100); // 75 + 25
    expect(gameState.getSnapshot().shipments).toHaveLength(0);
    expect(successSpy).toHaveBeenCalledWith('Water Supply received!');
  });

  it('adds nutrient resource payload to resources for the nutrient shipment', () => {
    const delivered: ShipmentInstance = {
      id: 'ship_nutrient_01',
      catalogItemId: 'shipment_nutrient_pack',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);

    service.receiveShipment('ship_nutrient_01');

    expect(gameState.getSnapshot().resources.values['nutrients']).toBe(55); // 35 + 20
    expect(gameState.getSnapshot().inventory.items['nutrient_mix']).toBeUndefined();
    expect(gameState.getSnapshot().shipments).toHaveLength(0);
  });

  it('keeps a delivered item shipment pending when inventory capacity would be exceeded', () => {
    gameState.updateInventory((inv) => ({
      ...inv,
      items: { ...inv.items, filler: inv.capacity - 1 },
    }));
    const delivered: ShipmentInstance = {
      id: 'ship_full_inventory_01',
      catalogItemId: 'shipment_seed_protein_leaf_pack',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    const warnSpy = vi.spyOn(alerts, 'addWarning');

    service.receiveShipment('ship_full_inventory_01');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('would exceed inventory capacity'));
    expect(gameState.getSnapshot().shipments).toHaveLength(1);
    expect(gameState.getSnapshot().inventory.items['seed_protein_leaf']).toBeUndefined();
  });

  it('keeps a delivered resource shipment pending when receiving it would exceed the resource cap', () => {
    gameState.updateResources((resourcesState) => ({
      ...resourcesState,
      values: { ...resourcesState.values, water: 110 },
    }));
    const delivered: ShipmentInstance = {
      id: 'ship_capped_water_01',
      catalogItemId: 'shipment_water_supply',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    const warnSpy = vi.spyOn(alerts, 'addWarning');

    service.receiveShipment('ship_capped_water_01');

    expect(warnSpy).toHaveBeenCalledWith('Adding 25 water would exceed the cap of 124.');
    expect(gameState.getSnapshot().shipments).toHaveLength(1);
    expect(gameState.getSnapshot().resources.values['water']).toBe(110);
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

  it('wraps tick processing in untracked so shipment state updates do not retrigger the same tick', () => {
    gameState.updateShipments(() => [
      { id: 'ship_untracked_01', catalogItemId: 'shipment_seed_protein_leaf_pack', state: ShipmentState.InTransit, remainingSeconds: 30 },
    ]);
    mockLastTick.set(makeTick(5));

    lastEffectFn!();

    expect(untrackedSpy).toHaveBeenCalledTimes(1);
    expect(gameState.getSnapshot().shipments[0]?.remainingSeconds).toBe(25);
  });

  // ── Null-coalescing and defensive-guard coverage ───────────────────────────

  it('treats undefined resource balance as zero when checking affordability', () => {
    // 'helium' is not in the initial resource state; balance check ?? fallback fires
    const warnSpy = vi.spyOn(alerts, 'addWarning');
    service.buyShipment('shipment_test_alt_cost'); // costs 5 helium; undefined ?? 0 = 0 < 5
    expect(warnSpy).toHaveBeenCalledWith('Not enough credits to order this shipment.');
  });

  it('treats undefined resource value as zero when deducting after a zero-cost purchase', () => {
    // 'helium' is not in the initial state; zero cost passes the check; deduction ?? 0 fires
    service.buyShipment('shipment_test_free_oxygen'); // costs 0 helium; 0 >= 0 → purchase OK
    expect(gameState.getSnapshot().resources.values['helium']).toBe(0); // (undefined ?? 0) - 0 = 0
    expect(gameState.getSnapshot().shipments).toHaveLength(1);
  });

  it('treats undefined inventory quantity as zero when receiving an item payload for a new item', () => {
    // seed_aqua_sprout is not in the initial inventory; inventory ?? 0 fires
    const delivered: ShipmentInstance = {
      id: 'ship_aqua_01',
      catalogItemId: 'shipment_seed_aqua_sprout_pack', // item: seed_aqua_sprout x4
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    service.receiveShipment('ship_aqua_01');
    expect(gameState.getSnapshot().inventory.items['seed_aqua_sprout']).toBe(4); // (undefined ?? 0) + 4
  });

  it('keeps a delivered shipment pending when its resource payload is unknown', () => {
    const delivered: ShipmentInstance = {
      id: 'ship_ox_01',
      catalogItemId: 'shipment_test_new_resource_payload', // resource: helium x10
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    const warnSpy = vi.spyOn(alerts, 'addWarning');

    service.receiveShipment('ship_ox_01');

    expect(warnSpy).toHaveBeenCalledWith('Unknown resource: helium');
    expect(gameState.getSnapshot().resources.values['helium']).toBeUndefined();
    expect(gameState.getSnapshot().shipments).toHaveLength(1);
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

  // ── Tutorial hook behavior ─────────────────────────────────────────────────

  it('advances the buy_seeds tutorial step on a successful buyShipment', () => {
    const spy = vi.spyOn(tutorialService, 'completeStep');

    service.buyShipment('shipment_seed_protein_leaf_pack');

    expect(spy).toHaveBeenCalledWith('buy_seeds');
  });

  it('does not advance tutorial when buying a non-starter shipment succeeds', () => {
    const spy = vi.spyOn(tutorialService, 'completeStep');

    service.buyShipment('shipment_oxygen_tank');

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not advance tutorial when a shipment buy fails because it is still locked', () => {
    const spy = vi.spyOn(tutorialService, 'completeStep');

    service.buyShipment('shipment_seed_aqua_sprout_pack');

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not advance tutorial on a failed buyShipment (insufficient credits)', () => {
    gameState.updateResources((r) => ({ ...r, values: { ...r.values, credits: 0 } }));
    const spy = vi.spyOn(tutorialService, 'completeStep');

    service.buyShipment('shipment_seed_protein_leaf_pack');

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not advance tutorial on a failed buyShipment (unknown catalog id)', () => {
    const spy = vi.spyOn(tutorialService, 'completeStep');

    service.buyShipment('shipment_does_not_exist');

    expect(spy).not.toHaveBeenCalled();
  });

  it('advances the receive_seeds tutorial step on a successful receiveShipment', () => {
    const delivered: ShipmentInstance = {
      id: 'ship_recv_01',
      catalogItemId: 'shipment_seed_protein_leaf_pack',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateShipments((list) => [...list, delivered]);
    const spy = vi.spyOn(tutorialService, 'completeStep');

    service.receiveShipment('ship_recv_01');

    expect(spy).toHaveBeenCalledWith('receive_seeds');
  });

  it('does not advance tutorial when receiving a non-starter shipment succeeds', () => {
    const delivered: ShipmentInstance = {
      id: 'ship_recv_oxygen_01',
      catalogItemId: 'shipment_oxygen_tank',
      state: ShipmentState.Delivered,
      remainingSeconds: 0,
    };
    gameState.updateResources((resourcesState) => ({
      ...resourcesState,
      values: { ...resourcesState.values, oxygen: 50 },
    }));
    gameState.updateShipments((list) => [...list, delivered]);
    const spy = vi.spyOn(tutorialService, 'completeStep');

    service.receiveShipment('ship_recv_oxygen_01');

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not advance tutorial when receiveShipment is called for an InTransit shipment', () => {
    const inTransit: ShipmentInstance = {
      id: 'ship_recv_transit_01',
      catalogItemId: 'shipment_seed_protein_leaf_pack',
      state: ShipmentState.InTransit,
      remainingSeconds: 20,
    };
    gameState.updateShipments((list) => [...list, inTransit]);
    const spy = vi.spyOn(tutorialService, 'completeStep');

    service.receiveShipment('ship_recv_transit_01');

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not advance tutorial when receiveShipment is called with an unknown id', () => {
    const spy = vi.spyOn(tutorialService, 'completeStep');

    service.receiveShipment('nonexistent_ship_id');

    expect(spy).not.toHaveBeenCalled();
  });
});
