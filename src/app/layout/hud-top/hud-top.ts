import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';

import { RESOURCE_DEFINITIONS } from '../../core/data';
import { GameSpeed } from '../../core/enums';
import { GameClockService, ResourceService, type ResourceActionResult } from '../../core/services';

interface HudResourceRow {
  readonly id: string;
  readonly name: string;
  readonly displayValue: string;
}

interface HudClockView {
  readonly dayLabel: string;
  readonly timeLabel: string;
  readonly speedLabel: string;
}

@Component({
  selector: 'app-hud-top',
  templateUrl: './hud-top.html',
  styleUrl: './hud-top.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudTop implements OnInit, OnDestroy {
  protected readonly gameSpeed = GameSpeed;

  private readonly resourceService = inject(ResourceService);
  private readonly gameClock = inject(GameClockService);

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

  protected readonly clock = computed<HudClockView>(() => {
    const clock = this.gameClock.clock();

    return {
      dayLabel: `Day ${clock.day}`,
      timeLabel: this.gameClock.formatElapsedTime(clock),
      speedLabel: `Speed ${this.gameClock.speedLabel(clock.speed)}`,
    };
  });

  protected readonly feedbackMessage = signal('Resource controls ready.');
  protected readonly hasFeedbackError = signal(false);
  protected readonly feedbackRole = computed(() => (this.hasFeedbackError() ? 'alert' : 'status'));

  ngOnInit(): void {
    this.gameClock.start();
  }

  ngOnDestroy(): void {
    this.gameClock.stop();
  }

  protected pauseClock(): void {
    this.gameClock.pause();
  }

  protected resumeClock(): void {
    this.gameClock.resume();
  }

  protected setClockSpeed(speed: GameSpeed): void {
    this.gameClock.setSpeed(speed);
  }

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
