import { computed, Injectable, type Signal } from '@angular/core';

import { TUTORIAL_STEPS } from '../data';
import type { TutorialState } from '../models';
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
  constructor(private readonly gameState: GameStateService) {}

  readonly tutorial: Signal<DeepReadonly<TutorialState>> = computed(() => this.gameState.tutorial());

  readonly isComplete: Signal<boolean> = computed(
    () => this.gameState.tutorial().activeStepId === undefined,
  );

  completeStep(stepId: string): void {
    this.gameState.updateTutorial((tutorial) => {
      if (tutorial.completedStepIds.includes(stepId)) {
        return tutorial;
      }

      const completedStepIds = [...tutorial.completedStepIds, stepId];
      const currentIndex = ORDERED_STEP_IDS.indexOf(stepId);
      const nextStepId = currentIndex >= 0 ? ORDERED_STEP_IDS[currentIndex + 1] : undefined;

      return {
        completedStepIds,
        activeStepId: nextStepId,
      };
    });
  }
}
