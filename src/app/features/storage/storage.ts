import { ChangeDetectionStrategy, Component, computed, inject, isDevMode, signal } from '@angular/core';

import { ACTION_ICON_PATHS, ITEM_DEFINITIONS, ITEM_ICON_PATHS, STATE_ICON_PATHS } from '../../core/data';
import { InventoryService, type InventoryActionResult } from '../../core/services';

interface StorageItemRow {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly iconSrc: string;
}

type StorageActionId = 'addProteinSeeds' | 'consumeProteinSeed' | 'overfillStorage';

interface StorageActionButton {
  readonly id: StorageActionId;
  readonly label: string;
  readonly iconSrc: string;
}

interface StorageWorkflowStep {
  readonly label: string;
  readonly iconSrc: string;
}

@Component({
  selector: 'app-storage',
  templateUrl: './storage.html',
  styleUrl: './storage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Storage {
  private readonly inventoryService = inject(InventoryService);

  protected readonly devMode = isDevMode();

  protected readonly actionButtons: readonly StorageActionButton[] = [
    { id: 'addProteinSeeds', label: 'Add 3 protein seeds', iconSrc: ACTION_ICON_PATHS.buy },
    { id: 'consumeProteinSeed', label: 'Consume 1 protein seed', iconSrc: ACTION_ICON_PATHS.plant },
    { id: 'overfillStorage', label: 'Overfill storage', iconSrc: STATE_ICON_PATHS.blocked },
  ];

  protected readonly workflowSteps: readonly StorageWorkflowStep[] = [
    { label: 'Shipments', iconSrc: ACTION_ICON_PATHS.shipments },
    { label: 'Plant', iconSrc: ACTION_ICON_PATHS.plant },
    { label: 'Harvest', iconSrc: ACTION_ICON_PATHS.harvest },
    { label: 'Process', iconSrc: ACTION_ICON_PATHS.process },
  ];

  protected readonly items = computed<readonly StorageItemRow[]>(() => {
    const quantities = this.inventoryService.items();

    return ITEM_DEFINITIONS.map((definition) => ({
      id: definition.id,
      name: definition.name,
      quantity: quantities[definition.id] ?? 0,
      iconSrc: ITEM_ICON_PATHS[definition.id as keyof typeof ITEM_ICON_PATHS] ?? STATE_ICON_PATHS.blocked,
    }));
  });

  protected readonly usedCapacity = this.inventoryService.usedCapacity;
  protected readonly totalCapacity = computed(() => this.inventoryService.usedCapacity() + this.inventoryService.remainingCapacity());
  protected readonly feedbackMessage = signal('Storage controls ready.');
  protected readonly hasFeedbackError = signal(false);
  protected readonly feedbackRole = computed(() => (this.hasFeedbackError() ? 'alert' : 'status'));
  protected readonly feedbackIconSrc = computed(() => (this.hasFeedbackError() ? STATE_ICON_PATHS.warning : STATE_ICON_PATHS.success));

  protected runStorageAction(actionId: StorageActionId): void {
    if (actionId === 'addProteinSeeds') {
      this.applyInventoryAction('Add 3 protein seeds', this.inventoryService.addItem('seed_protein_leaf', 3));
      return;
    }

    if (actionId === 'consumeProteinSeed') {
      this.applyInventoryAction('Consume 1 protein seed', this.inventoryService.consumeItem('seed_protein_leaf', 1));
      return;
    }

    this.applyInventoryAction('Overfill storage', this.inventoryService.addItem('biofood_pack', 99));
  }

  private applyInventoryAction(label: string, result: InventoryActionResult): void {
    if (result.success) {
      this.hasFeedbackError.set(false);
      this.feedbackMessage.set(`${label} applied.`);
      return;
    }

    this.hasFeedbackError.set(true);
    this.feedbackMessage.set(result.message);
  }
}
