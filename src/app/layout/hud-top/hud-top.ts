import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';

import {
  ACTION_ICON_PATHS,
  CONTRACT_DEFINITIONS,
  RESOURCE_DEFINITIONS,
  RESOURCE_ICON_PATHS,
  SHIPMENT_CATALOG,
} from '../../core/data';
import { GameSpeed } from '../../core/enums';
import { GameClockService, InventoryService, ResourceService, type ResourceActionResult } from '../../core/services';

interface HudResourceRow {
  readonly id: string;
  readonly name: string;
  readonly valueLabel: string;
  readonly metaLabel: string;
  readonly iconSrc: string;
  readonly tone: HudCardTone;
}

interface HudClockView {
  readonly dayLabel: string;
  readonly timeLabel: string;
  readonly speedLabel: string;
}

interface HudSystemCard {
  readonly id: string;
  readonly label: string;
  readonly valueLabel: string;
  readonly metaLabel: string;
  readonly iconSrc: string;
  readonly tone: HudCardTone;
}

type HudCardTone =
  | 'credits'
  | 'energy'
  | 'water'
  | 'nutrients'
  | 'oxygen'
  | 'robots'
  | 'storage'
  | 'research'
  | 'contracts'
  | 'shipments';

interface ResourceHudDetails {
  readonly iconSrc: string;
  readonly tone: HudCardTone;
}

const RESOURCE_HUD_DETAILS: Readonly<Record<string, ResourceHudDetails>> = {
  credits: { iconSrc: RESOURCE_ICON_PATHS.credits, tone: 'credits' },
  energy: { iconSrc: RESOURCE_ICON_PATHS.energy, tone: 'energy' },
  water: { iconSrc: RESOURCE_ICON_PATHS.water, tone: 'water' },
  nutrients: { iconSrc: RESOURCE_ICON_PATHS.nutrients, tone: 'nutrients' },
};

function formatPercent(value: number, total: number): string {
  if (total <= 0) {
    return '0%';
  }

  return `${Math.round((value / total) * 100)}%`;
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
  private readonly inventoryService = inject(InventoryService);
  private readonly gameClock = inject(GameClockService);

  protected readonly resources = computed<readonly HudResourceRow[]>(() => {
    const balances = this.resourceService.balances();

    return RESOURCE_DEFINITIONS.map((definition) => {
      const amount = balances[definition.id] ?? 0;
      const details = RESOURCE_HUD_DETAILS[definition.id];
      const maxDefault = definition.maxDefault;
      const hasCap = maxDefault !== undefined;

      return {
        id: definition.id,
        name: definition.name,
        valueLabel: hasCap ? formatPercent(amount, maxDefault) : `${amount}`,
        metaLabel: hasCap ? `${amount} / ${maxDefault}` : 'Balance',
        iconSrc: details.iconSrc,
        tone: details.tone,
      };
    });
  });

  protected readonly systemCards = computed<readonly HudSystemCard[]>(() => {
    const usedCapacity = this.inventoryService.usedCapacity();
    const totalCapacity = usedCapacity + this.inventoryService.remainingCapacity();

    return [
      {
        id: 'oxygen',
        label: 'Oxygen',
        valueLabel: '92%',
        metaLabel: 'Stable',
        iconSrc: RESOURCE_ICON_PATHS.oxygen,
        tone: 'oxygen',
      },
      {
        id: 'robots',
        label: 'Robots',
        valueLabel: '0 / 0',
        metaLabel: 'Waiting',
        iconSrc: ACTION_ICON_PATHS.robots,
        tone: 'robots',
      },
      {
        id: 'storage',
        label: 'Storage',
        valueLabel: formatPercent(usedCapacity, totalCapacity),
        metaLabel: `${usedCapacity} / ${totalCapacity}`,
        iconSrc: ACTION_ICON_PATHS.storage,
        tone: 'storage',
      },
      {
        id: 'research',
        label: 'Research',
        valueLabel: '0',
        metaLabel: 'Queued',
        iconSrc: ACTION_ICON_PATHS.investigation,
        tone: 'research',
      },
      {
        id: 'contracts',
        label: 'Contracts',
        valueLabel: `${CONTRACT_DEFINITIONS.length}`,
        metaLabel: 'Available',
        iconSrc: ACTION_ICON_PATHS.contracts,
        tone: 'contracts',
      },
      {
        id: 'shipments',
        label: 'Shipments',
        valueLabel: `${SHIPMENT_CATALOG.length}`,
        metaLabel: 'Catalog',
        iconSrc: ACTION_ICON_PATHS.shipments,
        tone: 'shipments',
      },
    ];
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
