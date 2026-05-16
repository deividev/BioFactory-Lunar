import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { RESOURCE_DEFINITIONS } from '../../core/data';
import { ResourceService, type ResourceActionResult } from '../../core/services';

interface HudResourceRow {
  readonly id: string;
  readonly name: string;
  readonly displayValue: string;
}

@Component({
  selector: 'app-hud-top',
  templateUrl: './hud-top.html',
  styleUrl: './hud-top.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudTop {
  private readonly resourceService = inject(ResourceService);

  protected readonly resources = computed<readonly HudResourceRow[]>(() => {
    const balances = this.resourceService.balances();

    return RESOURCE_DEFINITIONS.map((definition) => {
      const amount = balances[definition.id] ?? 0;

      return {
        id: definition.id,
        name: definition.name,
        displayValue: definition.maxDefault === undefined ? `${amount}` : `${amount} / ${definition.maxDefault}`,
      };
    });
  });

  protected readonly feedbackMessage = signal('Resource controls ready.');
  protected readonly hasFeedbackError = signal(false);
  protected readonly feedbackRole = computed(() => (this.hasFeedbackError() ? 'alert' : 'status'));

  protected collectCredits(): void {
    this.applyResourceAction('Collect 25 credits', this.resourceService.add('credits', 25));
  }

  protected spendCredits(): void {
    this.applyResourceAction('Spend 50 credits', this.resourceService.consume('credits', 50));
  }

  protected overfillWater(): void {
    this.applyResourceAction('Overfill water', this.resourceService.add('water', 1));
  }

  private applyResourceAction(label: string, result: ResourceActionResult): void {
    if (result.success) {
      this.hasFeedbackError.set(false);
      this.feedbackMessage.set(`${label} applied.`);
      return;
    }

    this.hasFeedbackError.set(true);
    this.feedbackMessage.set(result.message);
  }
}
