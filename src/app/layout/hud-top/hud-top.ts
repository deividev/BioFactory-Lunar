import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContractState, ShipmentState } from '../../core/enums';

import {
  ACTION_ICON_PATHS,
  RESOURCE_DEFINITIONS,
  RESOURCE_ICON_PATHS,
  isDemoContractVisible,
} from '../../core/data';
import {
  GameStateService,
  InventoryService,
  ResourceService,
  TutorialService,
} from '../../core/services';

interface HudResourceRow {
  readonly id: string;
  readonly name: string;
  readonly valueLabel: string;
  readonly metaLabel: string;
  readonly iconSrc: string;
  readonly tone: HudCardTone;
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
  | 'storage'
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
  oxygen: { iconSrc: RESOURCE_ICON_PATHS.oxygen, tone: 'oxygen' },
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
export class HudTop {
  private readonly resourceService = inject(ResourceService);
  private readonly inventoryService = inject(InventoryService);
  private readonly gameState = inject(GameStateService);
  private readonly tutorialService = inject(TutorialService);

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
    const contracts = this.gameState.contracts();
    const shipments = this.gameState.shipments();
    const tutorialComplete = this.tutorialService.isComplete();
    const activeContracts = contracts.filter((contract) => contract.state === ContractState.Active).length;
    const availableContracts = contracts.filter(
      (contract) => contract.state === ContractState.Available && isDemoContractVisible(contract.id, tutorialComplete),
    ).length;
    const pendingShipments = shipments.filter((shipment) => shipment.state === ShipmentState.InTransit).length;
    const deliveredShipments = shipments.filter((shipment) => shipment.state === ShipmentState.Delivered).length;

    return [
      {
        id: 'storage',
        label: 'Storage',
        valueLabel: formatPercent(usedCapacity, totalCapacity),
        metaLabel: `${usedCapacity} / ${totalCapacity}`,
        iconSrc: ACTION_ICON_PATHS.storage,
        tone: 'storage',
      },
      {
        id: 'contracts',
        label: 'Contracts',
        valueLabel: `${activeContracts}`,
        metaLabel: `${availableContracts} available`,
        iconSrc: ACTION_ICON_PATHS.contracts,
        tone: 'contracts',
      },
      {
        id: 'shipments',
        label: 'Shipments',
        valueLabel: `${pendingShipments}`,
        metaLabel: deliveredShipments > 0 ? `${deliveredShipments} delivered` : 'In transit',
        iconSrc: ACTION_ICON_PATHS.shipments,
        tone: 'shipments',
      },
    ];
  });
}
