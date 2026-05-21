import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ACTION_ICON_PATHS, CROP_DEFINITIONS, STATE_ICON_PATHS } from '../../core/data';
import { CropSlotState } from '../../core/enums';
import type { CropDefinition } from '../../core/models';
import { CropService, GameStateService } from '../../core/services';

interface CropSlotViewModel {
  readonly id: string;
  readonly state: CropSlotState;
  readonly cropName?: string;
  readonly remainingSeconds?: number;
  readonly progressPercent?: number;
}

const CROP_DEF_BY_ID = new Map<string, CropDefinition>(CROP_DEFINITIONS.map((d) => [d.id, d]));

@Component({
  selector: 'app-greenhouse',
  templateUrl: './greenhouse.html',
  styleUrl: './greenhouse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Greenhouse {
  private readonly gameState = inject(GameStateService);
  private readonly cropService = inject(CropService);

  protected readonly CropSlotState = CropSlotState;
  protected readonly cropCatalog = CROP_DEFINITIONS;
  protected readonly plantIconSrc = ACTION_ICON_PATHS.plant;
  protected readonly harvestIconSrc = ACTION_ICON_PATHS.harvest;
  protected readonly feedbackSuccessIconSrc = STATE_ICON_PATHS.success;
  protected readonly feedbackErrorIconSrc = STATE_ICON_PATHS.warning;

  protected readonly selectedCropBySlot = signal<Record<string, string>>({});
  protected readonly feedbackMessage = signal('');
  protected readonly hasFeedbackError = signal(false);
  protected readonly feedbackRole = computed(() => (this.hasFeedbackError() ? 'alert' : 'status'));
  protected readonly feedbackIconSrc = computed(() =>
    this.hasFeedbackError() ? this.feedbackErrorIconSrc : this.feedbackSuccessIconSrc,
  );

  protected readonly slotViewModels = computed<readonly CropSlotViewModel[]>(() =>
    this.gameState.greenhouse().slots.map((slot) => {
      const cropDef = slot.cropId !== undefined ? CROP_DEF_BY_ID.get(slot.cropId) : undefined;
      const progressPercent =
        cropDef !== undefined && slot.remainingSeconds !== undefined
          ? Math.round((1 - slot.remainingSeconds / cropDef.growthSeconds) * 100)
          : undefined;

      return {
        id: slot.id,
        state: slot.state,
        cropName: cropDef?.name,
        remainingSeconds: slot.remainingSeconds !== undefined ? Math.ceil(slot.remainingSeconds) : undefined,
        progressPercent,
      };
    }),
  );

  protected selectCrop(slotId: string, cropId: string): void {
    this.selectedCropBySlot.update((record) => ({ ...record, [slotId]: cropId }));
  }

  protected plantCrop(slotId: string): void {
    const cropId = this.selectedCropBySlot()[slotId];

    if (!cropId) {
      this.setFeedback('Select a crop first.', true);
      return;
    }

    const result = this.cropService.plantCrop(slotId, cropId);

    if (result.success) {
      this.setFeedback('Planted!', false);
    } else {
      this.setFeedback(result.message, true);
    }
  }

  protected harvestCrop(slotId: string): void {
    const result = this.cropService.harvestCrop(slotId);

    if (result.success) {
      this.setFeedback('Harvested!', false);
    } else {
      this.setFeedback(result.message, true);
    }
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedbackMessage.set(message);
    this.hasFeedbackError.set(isError);
  }
}
