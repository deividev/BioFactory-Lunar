import { computed, Injectable, type Signal } from '@angular/core';

import { TUTORIAL_STEPS } from '../data';
import type { TutorialState } from '../models';
import { DemoFlowService } from './demo-flow.service';
import { GameStateService } from './game-state.service';

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly<Item>>
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

const ORDERED_STEP_IDS = TUTORIAL_STEPS.map((step) => step.id);

@Injectable({ providedIn: 'root' })
export class TutorialService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly demoFlow: DemoFlowService = { syncProgressFromState: () => undefined } as DemoFlowService,
  ) {}

  readonly tutorial: Signal<DeepReadonly<TutorialState>> = computed(() => this.gameState.tutorial());

  readonly isComplete: Signal<boolean> = computed(
    () => this.gameState.tutorial().activeStepId === undefined,
  );

  completeStep(stepId: string): boolean {
    let didComplete = false;

    this.gameState.updateTutorial((tutorial) => {
      if (tutorial.completedStepIds.includes(stepId) || tutorial.activeStepId !== stepId) {
        return tutorial;
      }

      const completedStepIds = [...tutorial.completedStepIds, stepId];
      const currentIndex = ORDERED_STEP_IDS.indexOf(stepId);
      const nextStepId = currentIndex >= 0 ? ORDERED_STEP_IDS[currentIndex + 1] : undefined;
      didComplete = true;

      return {
        completedStepIds,
        activeStepId: nextStepId,
      };
    });

    if (didComplete) {
      this.demoFlow.syncProgressFromState();
    }

    return didComplete;
  }
}
