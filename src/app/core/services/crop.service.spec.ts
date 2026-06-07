import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractState, CropSlotState, GameSpeed } from '../enums';
import { AlertService } from './alert.service';
import { CropService } from './crop.service';
import { type GameClockTick } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { InventoryService } from './inventory.service';
import { ResourceService } from './resource.service';
import { TutorialService } from './tutorial.service';
import { PhaserBridgeService, type AngularToPhaserEvent } from '../../game/bridge/phaser-bridge.service';

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

const GREENHOUSE_MODULE_ID = 'module_greenhouse_basic_01';

describe('CropService', () => {
  let service: CropService;
  let gameState: GameStateService;
  let inventory: InventoryService;
  let resources: ResourceService;
  let alerts: AlertService;
  let tutorial: TutorialService;
  let bridge: PhaserBridgeService;
  let mockLastTick: ReturnType<typeof signal<GameClockTick | undefined>>;

  function makeTick(deltaGameSeconds: number): GameClockTick {
    const clock = { elapsedSeconds: 0, day: 1, speed: GameSpeed.X1 };
    return { previousClock: clock, currentClock: clock, deltaRealSeconds: 1, deltaGameSeconds };
  }

  beforeEach(() => {
    lastEffectFn = undefined;
    untrackedSpy.mockClear();
    gameState = new GameStateService();
    gameState.updateInventory((inventoryState) => ({
      ...inventoryState,
      items: { seed_protein_leaf: 2 },
    }));
    inventory = new InventoryService(gameState);
    resources = new ResourceService(gameState);
    alerts = new AlertService(gameState);
    tutorial = new TutorialService(gameState);
    bridge = new PhaserBridgeService();
    mockLastTick = signal<GameClockTick | undefined>(undefined);
    const mockGameClock = { lastTick: mockLastTick.asReadonly() };
    service = new CropService(gameState, mockGameClock as never, inventory, resources, alerts, bridge, tutorial);
  });

  function unlockAquaSprout(): void {
    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === 'contract_contract_starter_biofood_01'
          ? { ...contract, state: ContractState.Completed }
          : contract,
      ),
    );
  }

  // ── plantCrop ──────────────────────────────────────────────────────────────

  it('plants a crop: deducts seed and resources, sets slot to Planted with remainingSeconds', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');

    const snapshot = gameState.getSnapshot();
    const slot = snapshot.greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;

    expect(slot.state).toBe(CropSlotState.Planted);
    expect(slot.cropId).toBe('protein_leaf');
    expect(slot.plantedAt).toBe(0);
    expect(slot.remainingSeconds).toBe(90);

    expect(snapshot.inventory.items['seed_protein_leaf']).toBe(1);
    expect(snapshot.resources.values['water']).toBe(55);
    expect(snapshot.resources.values['energy']).toBe(54);
    expect(snapshot.resources.values['nutrients']).toBe(34);
    expect(snapshot.resources.values['oxygen']).toBe(44);
  });

  it('returns failure and does not mutate state when slot is not Empty', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');

    const result = service.plantCrop('crop_slot_01', 'protein_leaf');

    expect(result).toEqual({ success: false, code: 'slot_not_empty', message: expect.any(String) });
    // Second call must not consume more seeds
    expect(gameState.getSnapshot().inventory.items['seed_protein_leaf']).toBe(1);
  });

  it('returns failure when slotId does not exist', () => {
    const result = service.plantCrop('crop_slot_99', 'protein_leaf');

    expect(result).toEqual({ success: false, code: 'slot_not_found', message: expect.any(String) });
  });

  it('returns failure when cropId does not match any definition', () => {
    const result = service.plantCrop('crop_slot_01', 'unknown_crop');

    expect(result).toEqual({ success: false, code: 'crop_not_found', message: expect.any(String) });
  });

  it('returns failure when the crop is still locked', () => {
    gameState.updateInventory((inv) => ({
      ...inv,
      items: { ...inv.items, seed_aqua_sprout: 2 },
    }));

    const result = service.plantCrop('crop_slot_01', 'aqua_sprout');

    expect(result).toEqual({ success: false, code: 'locked_crop', message: 'Aqua Sprout is not unlocked yet.' });
  });

  it('reports unlock state for gated crops from completed contracts and infrastructure', () => {
    expect(service.isCropUnlocked('protein_leaf')).toBe(true);
    expect(service.isCropUnlocked('aqua_sprout')).toBe(false);
    expect(service.isCropUnlocked('luma_moss')).toBe(false);

    unlockAquaSprout();
    expect(service.isCropUnlocked('aqua_sprout')).toBe(true);

    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: ['water_recycler_i', 'water_recycler_ii'],
    }));
    expect(service.isCropUnlocked('luma_moss')).toBe(true);
  });

  it('returns failure when seed is not available in inventory', () => {
    // Consume both existing seeds
    gameState.updateInventory((inv) => ({ ...inv, items: {} }));

    const result = service.plantCrop('crop_slot_01', 'protein_leaf');

    expect(result).toEqual({ success: false, code: 'insufficient_seed', message: expect.any(String) });
    expect(gameState.getSnapshot().greenhouse.slots[0]!.state).toBe(CropSlotState.Empty);
  });

  it('returns failure when resources are insufficient', () => {
    gameState.updateResources((r) => ({ ...r, values: { ...r.values, water: 0 } }));

    const result = service.plantCrop('crop_slot_01', 'protein_leaf');

    expect(result).toEqual({ success: false, code: 'insufficient_resources', message: expect.any(String) });
    // Seed must NOT have been consumed
    expect(gameState.getSnapshot().inventory.items['seed_protein_leaf']).toBe(2);
  });

  // ── processTick ───────────────────────────────────────────────────────────

  it('decrements remainingSeconds by deltaGameSeconds for Planted slots', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf'); // growthSeconds = 90

    service.processTick(30);

    const slot = gameState.getSnapshot().greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;
    expect(slot.state).toBe(CropSlotState.Planted);
    expect(slot.remainingSeconds).toBe(60);
  });

  it('stores the current elapsed game time when planting starts', () => {
    gameState.updateClock((clock) => ({ ...clock, elapsedSeconds: 42 }));

    service.plantCrop('crop_slot_01', 'protein_leaf');

    const slot = gameState.getSnapshot().greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;
    expect(slot.plantedAt).toBe(42);
    expect(slot.remainingSeconds).toBe(90);
  });

  it('clamps remainingSeconds at 0 and transitions to Ready when tick exceeds remaining', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf'); // remainingSeconds = 90

    service.processTick(200);

    const slot = gameState.getSnapshot().greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;
    expect(slot.state).toBe(CropSlotState.Ready);
    expect(slot.remainingSeconds).toBe(0);
  });

  it('emits addSuccess alert and notifyCropReady bridge event when slot transitions to Ready', () => {
    const bridgeEvents: AngularToPhaserEvent[] = [];
    bridge.angularEvents$.subscribe((e) => bridgeEvents.push(e));
    const successSpy = vi.spyOn(alerts, 'addSuccess');

    service.plantCrop('crop_slot_01', 'protein_leaf');
    service.processTick(90);

    expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('ready'));
    expect(bridgeEvents).toContainEqual({ type: 'cropReady', moduleId: GREENHOUSE_MODULE_ID });
  });

  it('does not emit alert or bridge event when slot is still growing', () => {
    const bridgeEvents: AngularToPhaserEvent[] = [];
    bridge.angularEvents$.subscribe((e) => bridgeEvents.push(e));
    const successSpy = vi.spyOn(alerts, 'addSuccess');

    service.plantCrop('crop_slot_01', 'protein_leaf');
    service.processTick(10);

    expect(successSpy).not.toHaveBeenCalled();
    expect(bridgeEvents).toHaveLength(0);
  });

  it('does nothing when deltaGameSeconds is zero or negative', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');
    const before = gameState.getSnapshot().greenhouse;

    service.processTick(0);
    service.processTick(-5);

    expect(gameState.getSnapshot().greenhouse).toEqual(before);
  });

  it('does not update greenhouse when there are no Planted slots', () => {
    const updateGreenhouseSpy = vi.spyOn(gameState, 'updateGreenhouse');
    const before = gameState.getSnapshot().greenhouse;

    service.processTick(30);

    expect(updateGreenhouseSpy).not.toHaveBeenCalled();
    expect(gameState.getSnapshot().greenhouse).toEqual(before);
  });

  it('processes multiple Planted slots in a single tick', () => {
    // Plant two slots
    service.plantCrop('crop_slot_01', 'protein_leaf');
    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, seed_protein_leaf: 1 } }));
    service.plantCrop('crop_slot_02', 'protein_leaf');

    service.processTick(90);

    const slots = gameState.getSnapshot().greenhouse.slots;
    expect(slots.find((s) => s.id === 'crop_slot_01')!.state).toBe(CropSlotState.Ready);
    expect(slots.find((s) => s.id === 'crop_slot_02')!.state).toBe(CropSlotState.Ready);
  });

  it('ignores Empty and Ready slots during processTick', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');
    service.processTick(90); // slot_01 → Ready

    const before = gameState.getSnapshot().greenhouse;
    service.processTick(30);

    expect(gameState.getSnapshot().greenhouse).toEqual(before);
  });

  // ── harvestCrop ───────────────────────────────────────────────────────────

  it('adds harvested items to inventory and sets slot to Empty', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');
    service.processTick(90); // → Ready

    const result = service.harvestCrop('crop_slot_01');

    expect(result.success).toBe(true);
    const snapshot = gameState.getSnapshot();
    expect(snapshot.inventory.items['protein_leaf']).toBe(2); // baseYield = 2
    const slot = snapshot.greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;
    expect(slot.state).toBe(CropSlotState.Empty);
    expect(slot.cropId).toBeUndefined();
    expect(slot.remainingSeconds).toBeUndefined();
  });

  it('returns failure and keeps slot Ready when inventory would be exceeded', () => {
    // Fill inventory to capacity - 1 so adding 2 protein_leaf would overflow
    gameState.updateInventory((inv) => ({
      ...inv,
      items: { ...inv.items, seed_protein_leaf: inv.capacity - 1 },
    }));
    service.plantCrop('crop_slot_01', 'protein_leaf');
    service.processTick(90); // → Ready
    // Reset seed count to free space but keep capacity nearly full
    // capacity=100, used=100-1=99 after planting (seed consumed: was 2, but...let's set up carefully)
    // Actually: after planting, seed_protein_leaf is reduced from 2→1 but we set it to capacity-1 first
    // Let's set directly after Ready:
    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, filler: inv.capacity - 1 } }));

    const warnSpy = vi.spyOn(alerts, 'addWarning');
    const result = service.harvestCrop('crop_slot_01');

    expect(result).toEqual({ success: false, code: 'inventory_full', message: expect.any(String) });
    expect(warnSpy).toHaveBeenCalled();
    const slot = gameState.getSnapshot().greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;
    expect(slot.state).toBe(CropSlotState.Ready);
  });

  it('returns failure when slot is not Ready', () => {
    const result = service.harvestCrop('crop_slot_01');

    expect(result).toEqual({ success: false, code: 'slot_not_ready', message: expect.any(String) });
  });

  it('returns failure when slotId does not exist', () => {
    const result = service.harvestCrop('crop_slot_99');

    expect(result).toEqual({ success: false, code: 'slot_not_found', message: expect.any(String) });
  });

  it('returns failure when a Ready slot has no valid crop definition', () => {
    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((s) =>
        s.id === 'crop_slot_01'
          ? { ...s, state: CropSlotState.Ready, cropId: 'ghost_crop' }
          : s,
      ),
    }));

    const result = service.harvestCrop('crop_slot_01');

    expect(result).toEqual({ success: false, code: 'crop_not_found', message: expect.any(String) });
  });

  // ── tutorial hooks ────────────────────────────────────────────────────────

  it('advances tutorial to plant_crop on successful plantCrop', () => {
    const stepSpy = vi.spyOn(tutorial, 'completeStep');

    service.plantCrop('crop_slot_01', 'protein_leaf');

    expect(stepSpy).toHaveBeenCalledWith('plant_crop');
  });

  it('does not advance tutorial when planting a non-starter crop succeeds', () => {
    unlockAquaSprout();
    gameState.updateInventory((inventoryState) => ({
      ...inventoryState,
      items: { ...inventoryState.items, seed_aqua_sprout: 2 },
    }));
    const stepSpy = vi.spyOn(tutorial, 'completeStep');

    service.plantCrop('crop_slot_01', 'aqua_sprout');

    expect(stepSpy).not.toHaveBeenCalled();
  });

  it('does not advance tutorial when plantCrop fails', () => {
    const stepSpy = vi.spyOn(tutorial, 'completeStep');

    service.plantCrop('crop_slot_01', 'unknown_crop');

    expect(stepSpy).not.toHaveBeenCalled();
  });

  it('advances tutorial to harvest_crop on successful harvestCrop', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');
    service.processTick(90); // → Ready
    const stepSpy = vi.spyOn(tutorial, 'completeStep');

    service.harvestCrop('crop_slot_01');

    expect(stepSpy).toHaveBeenCalledWith('harvest_crop');
  });

  it('does not advance tutorial when harvesting a non-starter crop succeeds', () => {
    unlockAquaSprout();
    gameState.updateInventory((inventoryState) => ({
      ...inventoryState,
      items: { ...inventoryState.items, seed_aqua_sprout: 2 },
    }));
    service.plantCrop('crop_slot_01', 'aqua_sprout');
    service.processTick(120); // → Ready
    const stepSpy = vi.spyOn(tutorial, 'completeStep');

    service.harvestCrop('crop_slot_01');

    expect(stepSpy).not.toHaveBeenCalled();
  });

  it('does not advance tutorial when harvestCrop fails', () => {
    const stepSpy = vi.spyOn(tutorial, 'completeStep');

    service.harvestCrop('crop_slot_01'); // slot not Ready

    expect(stepSpy).not.toHaveBeenCalled();
  });

  // ── effect() wiring ───────────────────────────────────────────────────────

  it('wires effect() to call processTick with deltaGameSeconds from the clock tick', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');

    expect(lastEffectFn).toBeDefined();

    gameState.updateClock((clock) => ({ ...clock, elapsedSeconds: 45 }));
    mockLastTick.set(makeTick(45));
    lastEffectFn!();

    const slot = gameState.getSnapshot().greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;
    expect(slot.remainingSeconds).toBe(45);
  });

  it('wraps tick processing in untracked so greenhouse updates do not retrigger the effect', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');

    expect(lastEffectFn).toBeDefined();

    mockLastTick.set(makeTick(10));
    lastEffectFn!();

    expect(untrackedSpy).toHaveBeenCalledTimes(1);
  });

  it('uses the plantedAt anchor so a fresh crop does not become ready before its growth time passes', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');

    expect(lastEffectFn).toBeDefined();

    gameState.updateClock((clock) => ({ ...clock, elapsedSeconds: 1 }));
    mockLastTick.set(makeTick(1));
    lastEffectFn!();

    const slot = gameState.getSnapshot().greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;
    expect(slot.state).toBe(CropSlotState.Planted);
    expect(slot.remainingSeconds).toBe(89);
  });

  it('falls back to remainingSeconds countdown when a planted slot has no plantedAt anchor at elapsed time zero', () => {
    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((slot) =>
        slot.id === 'crop_slot_01'
          ? {
              ...slot,
              state: CropSlotState.Planted,
              cropId: 'protein_leaf',
              plantedAt: undefined,
              remainingSeconds: 40,
            }
          : slot,
      ),
    }));

    gameState.updateClock((clock) => ({ ...clock, elapsedSeconds: 0 }));

    service.processTick(10);

    const slot = gameState.getSnapshot().greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;
    expect(slot.plantedAt).toBeUndefined();
    expect(slot.remainingSeconds).toBe(30);
    expect(slot.state).toBe(CropSlotState.Planted);
  });

  it('leaves a planted slot unchanged when it has no crop id during tick processing', () => {
    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((slot) =>
        slot.id === 'crop_slot_01'
          ? {
              ...slot,
              state: CropSlotState.Planted,
              cropId: undefined,
              plantedAt: 0,
              remainingSeconds: 40,
            }
          : slot,
      ),
    }));

    service.processTick(10);

    const slot = gameState.getSnapshot().greenhouse.slots.find((s) => s.id === 'crop_slot_01')!;
    expect(slot.cropId).toBeUndefined();
    expect(slot.remainingSeconds).toBe(40);
    expect(slot.state).toBe(CropSlotState.Planted);
  });

  it('does not call processTick when lastTick is undefined', () => {
    service.plantCrop('crop_slot_01', 'protein_leaf');
    const before = gameState.getSnapshot().greenhouse;

    expect(lastEffectFn).toBeDefined();
    mockLastTick.set(undefined);
    lastEffectFn!();

    expect(gameState.getSnapshot().greenhouse).toEqual(before);
  });
});
