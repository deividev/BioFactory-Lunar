import { computed, Injectable, type Signal } from '@angular/core';

import { RESOURCE_DEFINITIONS } from '../data';
import type { ActionResult, ResourceAmount, ResourceDefinition } from '../models';
import { GameStateService } from './game-state.service';

export type ResourceActionFailureCode =
  | 'unknown_resource'
  | 'invalid_quantity'
  | 'resource_cap_exceeded'
  | 'insufficient_resource';

export type ResourceActionResult = ActionResult<ResourceActionFailureCode>;

const RESOURCE_DEFINITION_BY_ID = new Map<string, ResourceDefinition>(
  RESOURCE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const SUCCESS: ResourceActionResult = { success: true };

function cloneAndFreezeBalances(values: Record<string, number>): Readonly<Record<string, number>> {
  return Object.freeze({ ...values });
}

function invalidQuantityResult(): ResourceActionResult {
  return {
    success: false,
    code: 'invalid_quantity',
    message: 'Quantity must be a positive finite number.',
  };
}

function unknownResourceResult(resourceId: string): ResourceActionResult {
  return {
    success: false,
    code: 'unknown_resource',
    message: `Unknown resource: ${resourceId}`,
  };
}

@Injectable({ providedIn: 'root' })
export class ResourceService {
  readonly balances: Signal<Readonly<Record<string, number>>> = computed(() =>
    cloneAndFreezeBalances(this.gameState.resources().values),
  );

  constructor(private readonly gameState: GameStateService) {}

  getAmount(resourceId: string): number {
    if (!this.isKnownResource(resourceId)) {
      return 0;
    }

    return this.gameState.resources().values[resourceId] ?? 0;
  }

  has(resourceId: string, quantity: number): boolean {
    return this.isKnownResource(resourceId) && this.isValidQuantity(quantity) && this.getAmount(resourceId) >= quantity;
  }

  add(resourceId: string, quantity: number): ResourceActionResult {
    const validationError = this.validateResourceChange(resourceId, quantity);

    if (validationError !== undefined) {
      return validationError;
    }

    const currentAmount = this.getAmount(resourceId);
    const nextAmount = currentAmount + quantity;
    const cap = this.getCap(resourceId);

    if (cap !== undefined && nextAmount > cap) {
      return {
        success: false,
        code: 'resource_cap_exceeded',
        message: `Adding ${quantity} ${resourceId} would exceed the cap of ${cap}.`,
      };
    }

    this.gameState.updateResources((resources) => ({
      ...resources,
      values: {
        ...resources.values,
        [resourceId]: nextAmount,
      },
    }));

    return SUCCESS;
  }

  consume(resourceId: string, quantity: number): ResourceActionResult {
    const validationError = this.validateResourceChange(resourceId, quantity);

    if (validationError !== undefined) {
      return validationError;
    }

    const currentAmount = this.getAmount(resourceId);

    if (currentAmount < quantity) {
      return {
        success: false,
        code: 'insufficient_resource',
        message: `Not enough ${resourceId}: requires ${quantity}, available ${currentAmount}.`,
      };
    }

    this.gameState.updateResources((resources) => ({
      ...resources,
      values: {
        ...resources.values,
        [resourceId]: currentAmount - quantity,
      },
    }));

    return SUCCESS;
  }

  canAfford(costs: readonly ResourceAmount[]): boolean {
    return costs.every((cost) => this.has(cost.resourceId, cost.quantity));
  }

  private validateResourceChange(resourceId: string, quantity: number): ResourceActionResult | undefined {
    if (!this.isKnownResource(resourceId)) {
      return unknownResourceResult(resourceId);
    }

    if (!this.isValidQuantity(quantity)) {
      return invalidQuantityResult();
    }

    return undefined;
  }

  private getCap(resourceId: string): number | undefined {
    const stateCap = this.gameState.resources().maxValues[resourceId];

    return stateCap ?? RESOURCE_DEFINITION_BY_ID.get(resourceId)?.maxDefault;
  }

  private isKnownResource(resourceId: string): boolean {
    return RESOURCE_DEFINITION_BY_ID.has(resourceId);
  }

  private isValidQuantity(quantity: number): boolean {
    return Number.isFinite(quantity) && quantity > 0;
  }
}