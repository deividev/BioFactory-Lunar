import { Injectable, computed, signal, type Signal } from '@angular/core';

import {
  CONTRACT_DEFINITIONS,
  DEMO_FINALE_CONTRACT_INSTANCE_ID,
  DEMO_OBJECTIVE_STATUS_COPY,
  ITEM_DEFINITIONS,
  TUTORIAL_STEPS,
} from '../data';
import { ContractState } from '../enums';
import type { SaveData } from '../models';
import { GameClockService } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { SaveService } from './save.service';

export type DemoViewPhase = 'menu' | 'guided_run' | 'completed';
export type DemoObjectiveStatus = 'blocked' | 'actionable' | 'completable' | 'wishlist';

export interface DemoObjectiveRequirement {
  readonly itemId: string;
  readonly label: string;
  readonly available: number;
  readonly required: number;
  readonly complete: boolean;
}

export interface DemoObjectiveSummary {
  readonly status: DemoObjectiveStatus;
  readonly badge: string;
  readonly description: string;
  readonly hint: string;
  readonly objectiveName: string;
  readonly requirements: readonly DemoObjectiveRequirement[];
}

const CONTRACT_DEFINITION_BY_ID = new Map(
  CONTRACT_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const ITEM_NAME_BY_ID = new Map(
  ITEM_DEFINITIONS.map((item) => [item.id, item.name]),
);

const TUTORIAL_STEP_BY_ID = new Map(
  TUTORIAL_STEPS.map((step) => [step.id, step]),
);

@Injectable({ providedIn: 'root' })
export class DemoFlowService {
  readonly #viewPhase = signal<DemoViewPhase>('menu');
  readonly #hasContinueOption = signal(false);

  readonly viewPhase: Signal<DemoViewPhase> = this.#viewPhase.asReadonly();
  readonly hasContinueOption: Signal<boolean> = this.#hasContinueOption.asReadonly();
  readonly objectiveSummary: Signal<DemoObjectiveSummary> = computed(() => {
    const demo = this.gameState.demo();
    const tutorial = this.gameState.tutorial();
    const contracts = this.gameState.contracts();
    const inventoryItems = this.gameState.inventory().items;
    const objectiveInstanceId = demo.objectiveContractInstanceId ?? DEMO_FINALE_CONTRACT_INSTANCE_ID;
    const objectiveInstance = contracts.find((contract) => contract.id === objectiveInstanceId);
    const objectiveDefinition = CONTRACT_DEFINITION_BY_ID.get(objectiveInstance?.definitionId ?? '');
    const requirements = (objectiveDefinition?.requiredItems ?? []).map(({ itemId, quantity }) => {
      const available = inventoryItems[itemId] ?? 0;

      return {
        itemId,
        label: ITEM_NAME_BY_ID.get(itemId) ?? itemId,
        available,
        required: quantity,
        complete: available >= quantity,
      };
    });

    let status: DemoObjectiveStatus = 'actionable';
    let hint = 'Open Contracts and accept the finale contract when you are ready.';

    if (demo.phase === 'completed' || objectiveInstance?.state === ContractState.Completed) {
      status = 'wishlist';
      hint = 'Return to Menu for a fresh run or Continue Demo to keep the current save open.';
    } else if (tutorial.activeStepId !== undefined) {
      status = 'blocked';
      hint = TUTORIAL_STEP_BY_ID.get(tutorial.activeStepId)?.label ?? 'Complete the current onboarding step.';
    } else if (objectiveInstance?.state === ContractState.Active && requirements.every((requirement) => requirement.complete)) {
      status = 'completable';
      hint = 'Open Contracts and deliver the finale contract.';
    } else if (objectiveInstance?.state === ContractState.Active) {
      status = 'actionable';
      hint = 'Produce the remaining cargo, then return to Contracts to finish the finale order.';
    }

    return {
      status,
      badge: DEMO_OBJECTIVE_STATUS_COPY[status].badge,
      description: DEMO_OBJECTIVE_STATUS_COPY[status].description,
      hint,
      objectiveName: objectiveDefinition?.name ?? 'Lunar Habitat Kit',
      requirements,
    };
  });

  constructor(
    private readonly gameState: GameStateService,
    private readonly saveService: SaveService,
    private readonly gameClock: GameClockService,
  ) {}

  async bootstrap(): Promise<void> {
    this.stopRuntime();

    const result = await this.saveService.restoreLatestGame();

    if (!result.success) {
      this.#viewPhase.set('menu');
      this.#hasContinueOption.set(false);
      return;
    }

    if ('restored' in result) {
      this.#viewPhase.set('menu');
      this.#hasContinueOption.set(false);
      return;
    }

    this.adaptLegacySave(result.data);
    this.syncProgressFromState();

    this.#hasContinueOption.set(true);
    this.#viewPhase.set(this.gameState.getSnapshot().demo.phase === 'completed' ? 'completed' : 'menu');
  }

  startNewDemo(): void {
    this.stopRuntime();
    this.gameState.reset();
    this.gameState.updateDemo((demo) => ({
      ...demo,
      phase: 'guided_run',
      objectiveContractInstanceId: DEMO_FINALE_CONTRACT_INSTANCE_ID,
      completedAt: undefined,
    }));
    this.#hasContinueOption.set(true);
    this.#viewPhase.set('guided_run');
    this.startRuntime();
  }

  continueDemo(): void {
    this.stopRuntime();
    this.#hasContinueOption.set(this.gameState.getSnapshot().demo.phase !== 'menu');
    this.#viewPhase.set('guided_run');
    this.startRuntime();
  }

  returnToMenu(): void {
    this.stopRuntime();
    this.#hasContinueOption.set(this.gameState.getSnapshot().demo.phase !== 'menu');
    this.#viewPhase.set('menu');
  }

  completeDemo(completedAt = new Date().toISOString()): void {
    this.gameState.updateDemo((demo) => ({
      ...demo,
      phase: 'completed',
      objectiveContractInstanceId: demo.objectiveContractInstanceId ?? DEMO_FINALE_CONTRACT_INSTANCE_ID,
      completedAt,
    }));
    this.#hasContinueOption.set(true);
    this.#viewPhase.set('completed');
    this.stopRuntime();
  }

  cleanup(): void {
    this.stopRuntime();
  }

  syncProgressFromState(completedAt?: string): void {
    const snapshot = this.gameState.getSnapshot();
    const objectiveContractInstanceId = snapshot.demo.objectiveContractInstanceId ?? DEMO_FINALE_CONTRACT_INSTANCE_ID;
    const guidanceMode = snapshot.tutorial.activeStepId === undefined ? 'objective' : 'tutorial';

    if (
      snapshot.demo.objectiveContractInstanceId !== objectiveContractInstanceId
      || snapshot.demo.guidanceMode !== guidanceMode
    ) {
      this.gameState.updateDemo((demo) => ({
        ...demo,
        objectiveContractInstanceId,
        guidanceMode,
      }));
    }

    const isObjectiveCompleted = snapshot.contracts.some((contract) => (
      contract.id === objectiveContractInstanceId && contract.state === ContractState.Completed
    ));

    if (isObjectiveCompleted && snapshot.demo.phase !== 'completed') {
      this.completeDemo(completedAt);
    }
  }

  private adaptLegacySave(saveData: SaveData): void {
    if (saveData.demo !== undefined) {
      return;
    }

    this.gameState.updateDemo((demo) => ({
      ...demo,
      phase: 'guided_run',
    }));
  }

  private startRuntime(): void {
    this.gameClock.start();
    this.saveService.startAutosave();
  }

  private stopRuntime(): void {
    this.gameClock.stop();
    this.saveService.stopAutosave();
  }
}