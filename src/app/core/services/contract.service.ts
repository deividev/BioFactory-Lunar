import { Injectable } from '@angular/core';

import { CONTRACT_DEFINITIONS, TUTORIAL_STARTER_CONTRACT_INSTANCE_ID } from '../data';
import { ContractState } from '../enums';
import type { ActionResult, ContractInstance } from '../models';
import { AlertService } from './alert.service';
import { GameStateService } from './game-state.service';
import { InventoryService } from './inventory.service';
import { ResourceService } from './resource.service';
import { TutorialService } from './tutorial.service';

export type ContractActionFailureCode = 'unknown_contract' | 'invalid_state' | 'insufficient_items';

export type ContractActionResult = ActionResult<ContractActionFailureCode>;

export interface ContractItemProgress {
  itemId: string;
  required: number;
  available: number;
}

export interface ContractProgress {
  instanceId: string;
  definitionId: string;
  state: ContractState;
  items: ContractItemProgress[];
}

const CONTRACT_DEFINITION_BY_ID = new Map(
  CONTRACT_DEFINITIONS.map((def) => [def.id, def]),
);

@Injectable({ providedIn: 'root' })
export class ContractService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly inventory: InventoryService,
    private readonly resources: ResourceService,
    private readonly alerts: AlertService,
    private readonly tutorial: TutorialService,
  ) {}

  acceptContract(instanceId: string): ContractActionResult {
    const instance = this.findInstance(instanceId);
    if (!instance) {
      return { success: false, code: 'unknown_contract', message: `Contract not found: ${instanceId}` };
    }
    if (instance.state !== ContractState.Available) {
      return {
        success: false,
        code: 'invalid_state',
        message: `Contract ${instanceId} is not available (current state: ${instance.state}).`,
      };
    }

    this.gameState.updateContracts((contracts) =>
      contracts.map((c) => (c.id === instanceId ? { ...c, state: ContractState.Active } : c)),
    );

    this.alerts.addSuccess('Contract accepted.');
    if (instanceId === TUTORIAL_STARTER_CONTRACT_INSTANCE_ID) {
      this.tutorial.completeStep('accept_first_contract');
    }

    return { success: true };
  }

  deliverContract(instanceId: string): ContractActionResult {
    const instance = this.findInstance(instanceId);
    if (!instance) {
      return { success: false, code: 'unknown_contract', message: `Contract not found: ${instanceId}` };
    }
    if (instance.state !== ContractState.Active) {
      return {
        success: false,
        code: 'invalid_state',
        message: `Contract ${instanceId} is not active (current state: ${instance.state}).`,
      };
    }

    const definition = CONTRACT_DEFINITION_BY_ID.get(instance.definitionId);
    if (!definition) {
      return { success: false, code: 'unknown_contract', message: `Contract definition not found: ${instance.definitionId}` };
    }

    if (!this.inventory.hasItems(definition.requiredItems)) {
      this.alerts.addWarning('Not enough items to deliver this contract.');
      return {
        success: false,
        code: 'insufficient_items',
        message: `Not enough items to deliver contract ${instanceId}.`,
      };
    }

    for (const { itemId, quantity } of definition.requiredItems) {
      this.inventory.consumeItem(itemId, quantity);
    }

    for (const { resourceId, quantity } of definition.rewards) {
      this.resources.add(resourceId, quantity);
    }

    this.gameState.updateContracts((contracts) =>
      contracts.map((c) => (c.id === instanceId ? { ...c, state: ContractState.Completed } : c)),
    );

    this.alerts.addSuccess('Contract delivered!');
    if (instanceId === TUTORIAL_STARTER_CONTRACT_INSTANCE_ID) {
      this.tutorial.completeStep('deliver_contract');
    }

    return { success: true };
  }

  getProgress(instanceId: string): ContractProgress | null {
    const instance = this.findInstance(instanceId);
    if (!instance) return null;

    const definition = CONTRACT_DEFINITION_BY_ID.get(instance.definitionId);
    if (!definition) return null;

    const items: ContractItemProgress[] = definition.requiredItems.map(({ itemId, quantity }) => ({
      itemId,
      required: quantity,
      available: this.inventory.getQuantity(itemId),
    }));

    return {
      instanceId: instance.id,
      definitionId: instance.definitionId,
      state: instance.state,
      items,
    };
  }

  isCompletable(instanceId: string): boolean {
    const instance = this.findInstance(instanceId);
    if (!instance || instance.state !== ContractState.Active) return false;

    const definition = CONTRACT_DEFINITION_BY_ID.get(instance.definitionId);
    if (!definition) return false;

    return this.inventory.hasItems(definition.requiredItems);
  }

  private findInstance(instanceId: string): ContractInstance | undefined {
    return this.gameState.contracts().find((c) => c.id === instanceId);
  }
}
