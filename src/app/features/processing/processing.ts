import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ITEM_DEFINITIONS, MACHINE_DEFINITIONS, RECIPE_DEFINITIONS } from '../../core/data';
import { MachineState } from '../../core/enums';
import { GameStateService, InventoryService, ProductionService, ResourceService } from '../../core/services';

const ITEM_NAME_BY_ID = new Map(ITEM_DEFINITIONS.map((d) => [d.id, d.name]));
const MACHINE_DEF_BY_ID = new Map(MACHINE_DEFINITIONS.map((d) => [d.id, d]));
const RECIPE_DEF_BY_ID = new Map(RECIPE_DEFINITIONS.map((d) => [d.id, d]));

interface RecipeViewModel {
  readonly id: string;
  readonly name: string;
}

interface MachineViewModel {
  readonly id: string;
  readonly name: string;
  readonly state: MachineState;
  readonly compatibleRecipes: readonly RecipeViewModel[];
  readonly selectedRecipeId: string | undefined;
  readonly canStart: boolean;
  readonly currentRecipeName: string | undefined;
  readonly remainingSeconds: number | undefined;
  readonly progressPercent: number | undefined;
  readonly outputPending: readonly string[];
}

@Component({
  selector: 'app-processing',
  templateUrl: './processing.html',
  styleUrl: './processing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Processing {
  private readonly gameState = inject(GameStateService);
  private readonly productionService = inject(ProductionService);
  private readonly inventoryService = inject(InventoryService);
  private readonly resourceService = inject(ResourceService);

  protected readonly MachineState = MachineState;

  protected readonly selectedRecipeByMachine = signal<Record<string, string>>({});
  protected readonly feedbackMessage = signal('');
  protected readonly hasFeedbackError = signal(false);

  protected readonly machineViewModels = computed<readonly MachineViewModel[]>(() => {
    const machines = this.gameState.machines();
    const selections = this.selectedRecipeByMachine();
    // Read these signals at the top so the computed re-runs when inventory or
    // resources change, regardless of short-circuit paths in the canStart check.
    this.inventoryService.items();
    this.resourceService.balances();

    return machines.map((machine) => {
      const machineDef = MACHINE_DEF_BY_ID.get(machine.definitionId);
      const name = machineDef?.name ?? machine.definitionId;

      const compatibleRecipes: RecipeViewModel[] = (machineDef?.acceptedRecipeIds ?? []).map((recipeId) => ({
        id: recipeId,
        name: RECIPE_DEF_BY_ID.get(recipeId)?.name ?? recipeId,
      }));

      const selectedRecipeId = selections[machine.id];
      const selectedRecipeDef = selectedRecipeId !== undefined ? RECIPE_DEF_BY_ID.get(selectedRecipeId) : undefined;

      const canStart =
        machine.state === MachineState.Idle &&
        selectedRecipeDef !== undefined &&
        this.inventoryService.hasItems(selectedRecipeDef.inputs) &&
        this.resourceService.canAfford(selectedRecipeDef.resourceCosts);

      const currentRecipeDef =
        machine.currentRecipeId !== undefined ? RECIPE_DEF_BY_ID.get(machine.currentRecipeId) : undefined;

      const remainingSeconds =
        machine.remainingSeconds !== undefined ? Math.ceil(machine.remainingSeconds) : undefined;

      const progressPercent =
        currentRecipeDef !== undefined &&
        machine.remainingSeconds !== undefined &&
        machine.durationSeconds !== undefined
          ? Math.round((1 - machine.remainingSeconds / machine.durationSeconds) * 100)
          : undefined;

      const outputPending: string[] = (machine.outputPending ?? []).map(
        (item) => ITEM_NAME_BY_ID.get(item.itemId) ?? item.itemId,
      );

      return {
        id: machine.id,
        name,
        state: machine.state,
        compatibleRecipes,
        selectedRecipeId,
        canStart,
        currentRecipeName: currentRecipeDef?.name,
        remainingSeconds,
        progressPercent,
        outputPending,
      };
    });
  });

  protected selectRecipe(machineId: string, recipeId: string): void {
    this.selectedRecipeByMachine.update((record) => ({ ...record, [machineId]: recipeId }));
  }

  protected startRecipe(machineId: string): void {
    const recipeId = this.selectedRecipeByMachine()[machineId];

    if (!recipeId) {
      this.setFeedback('Select a recipe first.', true);
      return;
    }

    const result = this.productionService.startRecipe(machineId, recipeId);

    if (result.success) {
      this.selectedRecipeByMachine.update((record) => {
        const next = { ...record };
        delete next[machineId];
        return next;
      });
      this.setFeedback('Started!', false);
    } else {
      this.setFeedback(result.message ?? 'Failed to start recipe.', true);
    }
  }

  protected collectOutput(machineId: string): void {
    const result = this.productionService.collectOutput(machineId);

    if (result.success) {
      this.setFeedback('Collected!', false);
    } else {
      this.setFeedback(result.message ?? 'Failed to collect output.', true);
    }
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedbackMessage.set(message);
    this.hasFeedbackError.set(isError);
  }
}
