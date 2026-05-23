import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GameSpeed, MachineState } from '../enums';
import { AlertService } from './alert.service';
import { type GameClockTick } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { InventoryService } from './inventory.service';
import { ProductionService } from './production.service';
import { ResourceService } from './resource.service';
import { TutorialService } from './tutorial.service';

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

const MACHINE_PACKAGER_ID = 'machine_orbital_packager_01';
const MACHINE_EXTRACTOR_ID = 'machine_botanical_extractor_01';
// orbital_packager: inputs protein_leaf x2, duration 60s, costs water 1, energy 4, nutrients 1
const RECIPE_PROTEIN_LEAF = 'recipe_protein_leaf_to_biofood_pack';
// botanical_extractor: inputs aqua_sprout x2, duration 75s, costs water 2, energy 5, nutrients 1
const RECIPE_AQUA_SPROUT = 'recipe_aqua_sprout_to_nutrient_mix';

describe('ProductionService', () => {
  let service: ProductionService;
  let gameState: GameStateService;
  let inventory: InventoryService;
  let resources: ResourceService;
  let alerts: AlertService;
  let tutorial: TutorialService;
  let mockLastTick: ReturnType<typeof signal<GameClockTick | undefined>>;

  function makeTick(deltaGameSeconds: number): GameClockTick {
    const clock = { elapsedSeconds: 0, day: 1, speed: GameSpeed.X1 };
    return { previousClock: clock, currentClock: clock, deltaRealSeconds: 1, deltaGameSeconds };
  }

  function seedInputsForPackager(): void {
    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, protein_leaf: 2 } }));
  }

  function seedInputsForExtractor(): void {
    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, aqua_sprout: 2 } }));
  }

  beforeEach(() => {
    lastEffectFn = undefined;
    gameState = new GameStateService();
    inventory = new InventoryService(gameState);
    resources = new ResourceService(gameState);
    alerts = new AlertService(gameState);
    tutorial = new TutorialService(gameState);
    mockLastTick = signal<GameClockTick | undefined>(undefined);
    const mockGameClock = { lastTick: mockLastTick.asReadonly() };
    service = new ProductionService(gameState, mockGameClock as never, inventory, resources, alerts, tutorial);
  });

  // ── startRecipe ────────────────────────────────────────────────────────────

  describe('startRecipe', () => {
    it('succeeds: deducts inputs and resources, sets machine to Running with correct timers', () => {
      seedInputsForPackager();

      const result = service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);

      expect(result).toEqual({ success: true });
      const machine = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;
      expect(machine.state).toBe(MachineState.Running);
      expect(machine.currentRecipeId).toBe(RECIPE_PROTEIN_LEAF);
      expect(machine.remainingSeconds).toBe(60);
      expect(machine.durationSeconds).toBe(60);
      // Inputs deducted (key removed when quantity reaches 0)
      expect(gameState.getSnapshot().inventory.items['protein_leaf']).toBeUndefined();
      // Resources deducted: water -1, energy -4, nutrients -1
      expect(gameState.getSnapshot().resources.values['water']).toBe(99);
      expect(gameState.getSnapshot().resources.values['energy']).toBe(96);
      expect(gameState.getSnapshot().resources.values['nutrients']).toBe(19);
    });

    it('fails with machine_not_found when machineId does not exist', () => {
      const result = service.startRecipe('machine_nonexistent', RECIPE_PROTEIN_LEAF);

      expect(result).toEqual({ success: false, code: 'machine_not_found', message: expect.any(String) });
    });

    it('fails with machine_not_idle when machine is already Running', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);

      seedInputsForPackager();
      const result = service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);

      expect(result).toEqual({ success: false, code: 'machine_not_idle', message: expect.any(String) });
    });

    it('fails with machine_not_idle when machine is Completed', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      service.processTick(100);

      const result = service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);

      expect(result).toEqual({ success: false, code: 'machine_not_idle', message: expect.any(String) });
    });

    it('fails with recipe_not_found when recipeId does not exist', () => {
      const result = service.startRecipe(MACHINE_PACKAGER_ID, 'recipe_unknown');

      expect(result).toEqual({ success: false, code: 'recipe_not_found', message: expect.any(String) });
    });

    it('fails with recipe_not_compatible when recipe belongs to a different machine', () => {
      seedInputsForExtractor();
      // RECIPE_AQUA_SPROUT requires botanical_extractor, not orbital_packager
      const result = service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_AQUA_SPROUT);

      expect(result).toEqual({ success: false, code: 'recipe_not_compatible', message: expect.any(String) });
    });

    it('fails with insufficient_inputs when inventory lacks required items, does not consume resources', () => {
      // Initial inventory has no protein_leaf
      const result = service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);

      expect(result).toEqual({ success: false, code: 'insufficient_inputs', message: expect.any(String) });
      expect(gameState.getSnapshot().resources.values['energy']).toBe(100);
    });

    it('fails with insufficient_resources when resources cannot cover costs, does not consume inputs', () => {
      seedInputsForPackager();
      gameState.updateResources((r) => ({ ...r, values: { ...r.values, energy: 0 } }));

      const result = service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);

      expect(result).toEqual({ success: false, code: 'insufficient_resources', message: expect.any(String) });
      expect(gameState.getSnapshot().inventory.items['protein_leaf']).toBe(2);
    });
  });

  // ── processTick ────────────────────────────────────────────────────────────

  describe('processTick', () => {
    it('does nothing when deltaGameSeconds is zero', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      const before = gameState.getSnapshot().machines;

      service.processTick(0);

      expect(gameState.getSnapshot().machines).toEqual(before);
    });

    it('does nothing when deltaGameSeconds is negative', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      const before = gameState.getSnapshot().machines;

      service.processTick(-10);

      expect(gameState.getSnapshot().machines).toEqual(before);
    });

    it('does not call updateMachines when no machines are Running', () => {
      const updateSpy = vi.spyOn(gameState, 'updateMachines');

      service.processTick(30);

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('decrements remainingSeconds by deltaGameSeconds for Running machines', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF); // remainingSeconds = 60

      service.processTick(20);

      const machine = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;
      expect(machine.state).toBe(MachineState.Running);
      expect(machine.remainingSeconds).toBe(40);
    });

    it('transitions to Completed and sets outputPending when remainingSeconds reaches 0', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF); // durationSeconds = 60

      service.processTick(60);

      const machine = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;
      expect(machine.state).toBe(MachineState.Completed);
      expect(machine.remainingSeconds).toBe(0);
      expect(machine.outputPending).toEqual([{ itemId: 'biofood_pack', quantity: 1 }]);
    });

    it('transitions to Completed when delta exceeds remainingSeconds', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);

      service.processTick(200);

      const machine = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;
      expect(machine.state).toBe(MachineState.Completed);
      expect(machine.remainingSeconds).toBe(0);
    });

    it('processes multiple Running machines in a single tick independently', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF); // 60s
      seedInputsForExtractor();
      service.startRecipe(MACHINE_EXTRACTOR_ID, RECIPE_AQUA_SPROUT); // 75s

      service.processTick(60);

      const packager = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;
      const extractor = gameState.machines().find((m) => m.id === MACHINE_EXTRACTOR_ID)!;
      expect(packager.state).toBe(MachineState.Completed);
      expect(extractor.state).toBe(MachineState.Running);
      expect(extractor.remainingSeconds).toBe(15);
    });

    it('does not modify Completed machines during processTick', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      service.processTick(60); // packager → Completed

      const completedSnapshot = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;

      // Force a Running machine so processTick runs the update path
      seedInputsForExtractor();
      service.startRecipe(MACHINE_EXTRACTOR_ID, RECIPE_AQUA_SPROUT);
      service.processTick(10);

      const afterPackager = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;
      expect(afterPackager).toEqual(completedSnapshot);
    });

    it('emits a success alert when a machine transitions to Completed', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      const successSpy = vi.spyOn(alerts, 'addSuccess');

      service.processTick(60);

      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('complete'));
    });

    it('does not emit a completion alert on partial ticks that do not complete the recipe', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      const successSpy = vi.spyOn(alerts, 'addSuccess');

      service.processTick(30);

      expect(successSpy).not.toHaveBeenCalled();
    });

    it('emits a completion alert only once — not on subsequent ticks after the machine is already Completed', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      service.processTick(60); // packager → Completed

      const successSpy = vi.spyOn(alerts, 'addSuccess');
      // Run a second tick; needs at least one Running machine to enter the update path
      seedInputsForExtractor();
      service.startRecipe(MACHINE_EXTRACTOR_ID, RECIPE_AQUA_SPROUT);
      service.processTick(10);

      expect(successSpy).not.toHaveBeenCalled();
    });
  });

  // ── startRecipe tutorial hook ─────────────────────────────────────────────

  describe('startRecipe tutorial hook', () => {
    it('advances the tutorial to process_product on startRecipe success', () => {
      seedInputsForPackager();
      const stepSpy = vi.spyOn(tutorial, 'completeStep');

      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);

      expect(stepSpy).toHaveBeenCalledWith('process_product');
    });

    it('does not advance the tutorial when startRecipe fails', () => {
      const stepSpy = vi.spyOn(tutorial, 'completeStep');

      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF); // no inputs

      expect(stepSpy).not.toHaveBeenCalled();
    });
  });

  // ── collectOutput ──────────────────────────────────────────────────────────

  describe('collectOutput', () => {
    function runToCompletion(): void {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      service.processTick(60);
    }

    it('succeeds: adds output to inventory and resets machine to Idle', () => {
      runToCompletion();

      const result = service.collectOutput(MACHINE_PACKAGER_ID);

      expect(result).toEqual({ success: true });
      expect(gameState.getSnapshot().inventory.items['biofood_pack']).toBe(1);
      const machine = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;
      expect(machine.state).toBe(MachineState.Idle);
      expect(machine.currentRecipeId).toBeUndefined();
      expect(machine.remainingSeconds).toBeUndefined();
      expect(machine.durationSeconds).toBeUndefined();
      expect(machine.outputPending).toBeUndefined();
    });

    it('fails with machine_not_found when machineId does not exist', () => {
      const result = service.collectOutput('machine_nonexistent');

      expect(result).toEqual({ success: false, code: 'machine_not_found', message: expect.any(String) });
    });

    it('fails with machine_not_completed when machine is Idle', () => {
      const result = service.collectOutput(MACHINE_PACKAGER_ID);

      expect(result).toEqual({ success: false, code: 'machine_not_completed', message: expect.any(String) });
    });

    it('fails with machine_not_completed when machine is Running', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);

      const result = service.collectOutput(MACHINE_PACKAGER_ID);

      expect(result).toEqual({ success: false, code: 'machine_not_completed', message: expect.any(String) });
    });

    it('fails with no_output_pending when Completed machine has no outputPending', () => {
      gameState.updateMachines((machines) =>
        machines.map((m) =>
          m.id === MACHINE_PACKAGER_ID
            ? { ...m, state: MachineState.Completed, outputPending: undefined }
            : m,
        ),
      );

      const result = service.collectOutput(MACHINE_PACKAGER_ID);

      expect(result).toEqual({ success: false, code: 'no_output_pending', message: expect.any(String) });
    });

    it('fails with inventory_full and preserves Completed state with outputPending intact', () => {
      runToCompletion();
      // Fill inventory to capacity
      gameState.updateInventory((inv) => ({ ...inv, items: { biofood_pack: inv.capacity } }));

      const result = service.collectOutput(MACHINE_PACKAGER_ID);

      expect(result).toEqual({ success: false, code: 'inventory_full', message: expect.any(String) });
      const machine = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;
      expect(machine.state).toBe(MachineState.Completed);
      expect(machine.outputPending).toEqual([{ itemId: 'biofood_pack', quantity: 1 }]);
    });
  });

  // ── effect() integration ───────────────────────────────────────────────────

  describe('effect() integration', () => {
    it('registers an effect in the constructor', () => {
      expect(lastEffectFn).toBeDefined();
    });

    it('calls processTick with deltaGameSeconds when lastTick emits a tick', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      mockLastTick.set(makeTick(20));

      lastEffectFn!();

      const machine = gameState.machines().find((m) => m.id === MACHINE_PACKAGER_ID)!;
      expect(machine.remainingSeconds).toBe(40);
    });

    it('does nothing when lastTick is undefined', () => {
      seedInputsForPackager();
      service.startRecipe(MACHINE_PACKAGER_ID, RECIPE_PROTEIN_LEAF);
      const before = gameState.getSnapshot().machines;
      mockLastTick.set(undefined);

      lastEffectFn!();

      expect(gameState.getSnapshot().machines).toEqual(before);
    });
  });
});
