import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { TUTORIAL_STEPS } from '../../core/data';
import { DemoFlowService, SaveService, TutorialService, type SaveActionResult } from '../../core/services';

@Component({
  selector: 'app-command-center',
  templateUrl: './command-center.html',
  styleUrl: './command-center.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandCenter {
  private readonly demoFlow = inject(DemoFlowService);
  private readonly saveService = inject(SaveService);
  protected readonly tutorialService = inject(TutorialService);

  protected readonly saveStatus = signal<string>('');
  protected readonly hasSaveError = signal<boolean>(false);
  protected readonly demoObjective = this.demoFlow.objectiveSummary;

  protected readonly steps = computed(() => {
    const { completedStepIds, activeStepId } = this.tutorialService.tutorial();
    return TUTORIAL_STEPS.map((step) => ({
      ...step,
      done: completedStepIds.includes(step.id),
      active: step.id === activeStepId,
    }));
  });

  protected readonly completedCount = computed(
    () => this.tutorialService.tutorial().completedStepIds.length,
  );

  protected readonly totalSteps = TUTORIAL_STEPS.length;

  protected save(): void {
    void this.saveService.saveGame().then((result) => {
      this.applySaveResult(result);
    });
  }

  private applySaveResult(result: SaveActionResult): void {
    if (result.success) {
      this.hasSaveError.set(false);
      this.saveStatus.set('Game saved.');
    } else {
      this.hasSaveError.set(true);
      this.saveStatus.set(result.message);
    }
  }
}
