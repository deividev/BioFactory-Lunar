import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ITEM_DEFINITIONS } from '../../core/data';
import { InventoryService, type InventoryActionResult } from '../../core/services';

interface StorageItemRow {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
}

@Component({
  selector: 'app-storage',
  templateUrl: './storage.html',
  styleUrl: './storage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Storage {
  private readonly inventoryService = inject(InventoryService);

  protected readonly items = computed<readonly StorageItemRow[]>(() => {
    const quantities = this.inventoryService.items();

    return ITEM_DEFINITIONS.map((definition) => ({
      id: definition.id,
      name: definition.name,
      quantity: quantities[definition.id] ?? 0,
    }));
  });

  protected readonly usedCapacity = this.inventoryService.usedCapacity;
  protected readonly totalCapacity = computed(() => this.inventoryService.usedCapacity() + this.inventoryService.remainingCapacity());
  protected readonly feedbackMessage = signal('Storage controls ready.');
  protected readonly hasFeedbackError = signal(false);
  protected readonly feedbackRole = computed(() => (this.hasFeedbackError() ? 'alert' : 'status'));

  protected addProteinSeeds(): void {
    this.applyInventoryAction('Add 3 protein seeds', this.inventoryService.addItem('seed_protein_leaf', 3));
  }

  protected consumeProteinSeed(): void {
    this.applyInventoryAction('Consume 1 protein seed', this.inventoryService.consumeItem('seed_protein_leaf', 1));
  }

  protected overfillStorage(): void {
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
