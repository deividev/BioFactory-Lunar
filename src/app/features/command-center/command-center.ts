import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { TUTORIAL_STEPS } from '../../core/data';
import { SaveService, TutorialService, type SaveActionResult } from '../../core/services';

@Component({
  selector: 'app-command-center',
  templateUrl: './command-center.html',
  styleUrl: './command-center.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandCenter {
  private readonly saveService = inject(SaveService);
  protected readonly tutorialService = inject(TutorialService);

  protected readonly saveStatus = signal<string>('');
  protected readonly hasSaveError = signal<boolean>(false);

  protected readonly activeStep = computed(() => {
    const activeId = this.tutorialService.tutorial().activeStepId;
    if (!activeId) return undefined;
    return TUTORIAL_STEPS.find((s) => s.id === activeId);
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
