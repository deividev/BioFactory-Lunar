import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ACTION_ICON_PATHS, CROP_DEFINITIONS, ITEM_DEFINITIONS, RESOURCE_DEFINITIONS, STATE_ICON_PATHS } from '../../core/data';
import { CropSlotState } from '../../core/enums';
import type { CropDefinition } from '../../core/models';
import { CropService, GameStateService, InventoryService, ResourceService } from '../../core/services';

interface CropRequirementViewModel {
  readonly name: string;
  readonly required: number;
  readonly available: number;
  readonly missing: number;
  readonly isMet: boolean;
}

interface CropOptionViewModel {
  readonly id: string;
  readonly name: string;
  readonly seedItemName: string;
  readonly seedStock: number;
  readonly growthSeconds: number;
  readonly growthLabel: string;
  readonly seedMissing: number;
  readonly isSeedAvailable: boolean;
  readonly requirements: readonly CropRequirementViewModel[];
  readonly canPlant: boolean;
}

interface CropSlotViewModel {
  readonly id: string;
  readonly state: CropSlotState;
  readonly cropName?: string;
  readonly remainingSeconds?: number;
  readonly progressPercent?: number;
  readonly selectedCropId?: string;
  readonly selectedCrop?: CropOptionViewModel;
}

const CROP_DEF_BY_ID = new Map<string, CropDefinition>(CROP_DEFINITIONS.map((d) => [d.id, d]));
const ITEM_NAME_BY_ID = new Map<string, string>(ITEM_DEFINITIONS.map((definition) => [definition.id, definition.name]));
const RESOURCE_NAME_BY_ID = new Map<string, string>(
  RESOURCE_DEFINITIONS.map((definition) => [definition.id, definition.name]),
);

function formatGrowthTime(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

@Component({
  selector: 'app-greenhouse',
  templateUrl: './greenhouse.html',
  styleUrl: './greenhouse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Greenhouse {
  private readonly gameState = inject(GameStateService);
  private readonly cropService = inject(CropService);
  private readonly inventory = inject(InventoryService);
  private readonly resources = inject(ResourceService);

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
  protected readonly availableCropCatalog = computed(() =>
    CROP_DEFINITIONS.filter((crop) => this.cropService.isCropUnlocked(crop.id)),
  );
  protected readonly cropOptions = computed<readonly CropOptionViewModel[]>(() => {
    const items = this.inventory.items();
    const balances = this.resources.balances();

    return this.availableCropCatalog().map((crop) => {
      const seedStock = items[crop.seedItemId] ?? 0;
      const requirements = crop.resourceCosts.map((cost) => {
        const available = balances[cost.resourceId] ?? 0;
        const missing = Math.max(0, cost.quantity - available);

        return {
          name: RESOURCE_NAME_BY_ID.get(cost.resourceId) ?? cost.resourceId,
          required: cost.quantity,
          available,
          missing,
          isMet: missing === 0,
        };
      });
      const seedMissing = Math.max(0, 1 - seedStock);

      return {
        id: crop.id,
        name: crop.name,
        seedItemName: ITEM_NAME_BY_ID.get(crop.seedItemId) ?? crop.seedItemId,
        seedStock,
        growthSeconds: crop.growthSeconds,
        growthLabel: formatGrowthTime(crop.growthSeconds),
        seedMissing,
        isSeedAvailable: seedStock >= 1,
        requirements,
        canPlant: seedStock >= 1 && requirements.every((requirement) => requirement.isMet),
      };
    });
  });

  protected readonly slotViewModels = computed<readonly CropSlotViewModel[]>(() =>
    this.gameState.greenhouse().slots.map((slot) => {
      const cropDef = slot.cropId !== undefined ? CROP_DEF_BY_ID.get(slot.cropId) : undefined;
      const selectedCropId = this.selectedCropBySlot()[slot.id];
      const selectedCrop = selectedCropId !== undefined ? this.cropOptions().find((crop) => crop.id === selectedCropId) : undefined;
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
        selectedCropId,
        selectedCrop,
      };
    }),
  );

  protected selectCrop(slotId: string, cropId: string): void {
    this.selectedCropBySlot.update((record) => {
      const next = { ...record };

      if (cropId === '') {
        delete next[slotId];
      } else {
        next[slotId] = cropId;
      }

      return next;
    });
  }

  protected plantCrop(slotId: string): void {
    const cropId = this.selectedCropBySlot()[slotId];

    if (!cropId) {
      this.setFeedback('Select a crop first.', true);
      return;
    }

    const result = this.cropService.plantCrop(slotId, cropId);

    if (result.success) {
      this.selectCrop(slotId, '');
      this.setFeedback(`Planted ${CROP_DEF_BY_ID.get(cropId)?.name ?? cropId}.`, false);
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
