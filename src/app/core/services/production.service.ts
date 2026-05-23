import { effect, Injectable } from '@angular/core';

import { MACHINE_DEFINITIONS, RECIPE_DEFINITIONS } from '../data';
import { MachineState } from '../enums';
import type { ActionResult, ItemAmount } from '../models';
import { GameClockService } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { InventoryService } from './inventory.service';
import { ResourceService } from './resource.service';

export type ProductionActionFailureCode =
  | 'machine_not_found'
  | 'recipe_not_found'
  | 'recipe_not_compatible'
  | 'machine_not_idle'
  | 'machine_not_completed'
  | 'insufficient_inputs'
  | 'insufficient_resources'
  | 'no_output_pending'
  | 'inventory_full';

export type ProductionActionResult = ActionResult<ProductionActionFailureCode>;

const MACHINE_DEFINITION_BY_ID = new Map(MACHINE_DEFINITIONS.map((def) => [def.id, def]));
const RECIPE_DEFINITION_BY_ID = new Map(RECIPE_DEFINITIONS.map((def) => [def.id, def]));

const SUCCESS: ProductionActionResult = { success: true };

@Injectable({ providedIn: 'root' })
export class ProductionService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly gameClock: GameClockService,
    private readonly inventory: InventoryService,
    private readonly resources: ResourceService,
  ) {
    effect(() => {
      const tick = this.gameClock.lastTick();
      if (tick === undefined) return;
      this.processTick(tick.deltaGameSeconds);
    });
  }

  startRecipe(machineId: string, recipeId: string): ProductionActionResult {
    const machine = this.gameState.machines().find((m) => m.id === machineId);

    if (machine === undefined) {
      return { success: false, code: 'machine_not_found', message: `Machine not found: ${machineId}` };
    }

    if (machine.state !== MachineState.Idle) {
      return { success: false, code: 'machine_not_idle', message: `Machine ${machineId} is not idle.` };
    }

    const recipe = RECIPE_DEFINITION_BY_ID.get(recipeId);

    if (recipe === undefined) {
      return { success: false, code: 'recipe_not_found', message: `Recipe not found: ${recipeId}` };
    }

    const machineDef = MACHINE_DEFINITION_BY_ID.get(machine.definitionId);

    if (machineDef === undefined || !machineDef.acceptedRecipeIds.includes(recipeId)) {
      return {
        success: false,
        code: 'recipe_not_compatible',
        message: `Machine ${machineId} does not accept recipe ${recipeId}.`,
      };
    }

    if (!this.inventory.hasItems(recipe.inputs)) {
      return {
        success: false,
        code: 'insufficient_inputs',
        message: `Insufficient input items for recipe ${recipeId}.`,
      };
    }

    if (!this.resources.canAfford(recipe.resourceCosts)) {
      return {
        success: false,
        code: 'insufficient_resources',
        message: `Insufficient resources for recipe ${recipeId}.`,
      };
    }

    // All checks passed — commit mutations
    for (const input of recipe.inputs) {
      this.inventory.consumeItem(input.itemId, input.quantity);
    }
    for (const cost of recipe.resourceCosts) {
      this.resources.consume(cost.resourceId, cost.quantity);
    }

    this.gameState.updateMachines((machines) =>
      machines.map((m) =>
        m.id === machineId
          ? {
              ...m,
              state: MachineState.Running,
              currentRecipeId: recipeId,
              remainingSeconds: recipe.durationSeconds,
              durationSeconds: recipe.durationSeconds,
            }
          : m,
      ),
    );

    return SUCCESS;
  }

  processTick(deltaGameSeconds: number): void {
    if (deltaGameSeconds <= 0) return;

    const machines = this.gameState.machines();
    const hasRunning = machines.some((m) => m.state === MachineState.Running);

    if (!hasRunning) return;

    this.gameState.updateMachines((current) =>
      current.map((machine) => {
        if (machine.state !== MachineState.Running || machine.remainingSeconds === undefined) {
          return machine;
        }

        const next = Math.max(0, machine.remainingSeconds - deltaGameSeconds);

        if (next <= 0) {
          const recipe =
            machine.currentRecipeId !== undefined
              ? RECIPE_DEFINITION_BY_ID.get(machine.currentRecipeId)
              : undefined;
          const outputPending: ItemAmount[] | undefined =
            recipe !== undefined ? [{ ...recipe.output }] : undefined;

          return {
            ...machine,
            state: MachineState.Completed,
            remainingSeconds: 0,
            outputPending,
          };
        }

        return { ...machine, remainingSeconds: next };
      }),
    );
  }

  collectOutput(machineId: string): ProductionActionResult {
    const machine = this.gameState.machines().find((m) => m.id === machineId);

    if (machine === undefined) {
      return { success: false, code: 'machine_not_found', message: `Machine not found: ${machineId}` };
    }

    if (machine.state !== MachineState.Completed) {
      return {
        success: false,
        code: 'machine_not_completed',
        message: `Machine ${machineId} is not in Completed state.`,
      };
    }

    const output = machine.outputPending;

    if (output === undefined || output.length === 0) {
      return {
        success: false,
        code: 'no_output_pending',
        message: `No output pending for machine ${machineId}.`,
      };
    }

    // Pre-check capacity to avoid partial mutations
    const totalRequired = output.reduce((sum, item) => sum + item.quantity, 0);

    if (this.inventory.remainingCapacity() < totalRequired) {
      return {
        success: false,
        code: 'inventory_full',
        message: `Cannot collect output: inventory full.`,
      };
    }

    // Commit mutations — add all output items
    for (const item of output) {
      this.inventory.addItem(item.itemId, item.quantity);
    }

    // Reset machine to Idle
    this.gameState.updateMachines((machines) =>
      machines.map((m) =>
        m.id === machineId
          ? {
              ...m,
              state: MachineState.Idle,
              currentRecipeId: undefined,
              remainingSeconds: undefined,
              durationSeconds: undefined,
              outputPending: undefined,
            }
          : m,
      ),
    );

    return SUCCESS;
  }
}
