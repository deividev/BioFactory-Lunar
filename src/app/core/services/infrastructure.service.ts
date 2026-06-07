import { Injectable } from '@angular/core';

import {
  COLONY_SUPPORT_EMERGENCY_ACTION,
  COLONY_SUPPORT_UPGRADES,
  STORAGE_UPGRADES,
} from '../data';
import type {
  ActionResult,
  ColonySupportEmergencyActionDefinition,
  ColonySupportUpgradeDefinition,
  StorageUpgradeDefinition,
} from '../models';
import { GameStateService } from './game-state.service';
import { ResourceService } from './resource.service';

export type InfrastructureActionFailureCode =
  | 'upgrade_not_found'
  | 'upgrade_already_purchased'
  | 'missing_upgrade_requirement'
  | 'insufficient_resources'
  | 'emergency_not_available';

export type InfrastructureActionResult = ActionResult<InfrastructureActionFailureCode>;

export interface ColonySupportUpgradeViewModel extends ColonySupportUpgradeDefinition {
  purchased: boolean;
  affordable: boolean;
  locked: boolean;
}

export interface StorageUpgradeViewModel extends StorageUpgradeDefinition {
  purchased: boolean;
  affordable: boolean;
  locked: boolean;
}

const COLONY_SUPPORT_UPGRADE_BY_ID = new Map(
  COLONY_SUPPORT_UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
);

const STORAGE_UPGRADE_BY_ID = new Map(STORAGE_UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
const VITAL_UTILITY_IDS = ['energy', 'water', 'oxygen'] as const;

@Injectable({ providedIn: 'root' })
export class InfrastructureService {
  readonly emergencyAction: ColonySupportEmergencyActionDefinition = COLONY_SUPPORT_EMERGENCY_ACTION;

  constructor(
    private readonly gameState: GameStateService,
    private readonly resourceService: ResourceService,
  ) {}

  isColonySupportUpgradePurchased(upgradeId: string): boolean {
    return this.gameState.infrastructure().colonySupportUpgradeIds.includes(upgradeId);
  }

  canBuyColonySupportUpgrade(upgradeId: string): boolean {
    const upgrade = COLONY_SUPPORT_UPGRADE_BY_ID.get(upgradeId);

    return upgrade !== undefined
      && !this.isColonySupportUpgradePurchased(upgradeId)
      && this.hasRequiredColonySupportUpgrades(upgrade)
      && this.resourceService.canAfford(upgrade.cost);
  }

  isColonySupportUpgradeLocked(upgradeId: string): boolean {
    const upgrade = COLONY_SUPPORT_UPGRADE_BY_ID.get(upgradeId);

    return upgrade !== undefined
      && !this.isColonySupportUpgradePurchased(upgradeId)
      && !this.hasRequiredColonySupportUpgrades(upgrade);
  }

  isStorageUpgradePurchased(upgradeId: string): boolean {
    return this.gameState.infrastructure().storageUpgradeIds.includes(upgradeId);
  }

  canBuyStorageUpgrade(upgradeId: string): boolean {
    const upgrade = STORAGE_UPGRADE_BY_ID.get(upgradeId);

    return upgrade !== undefined
      && !this.isStorageUpgradePurchased(upgradeId)
      && this.hasRequiredStorageUpgrades(upgrade)
      && this.resourceService.canAfford(upgrade.cost);
  }

  canRunEmergencyReserve(): boolean {
    return this.resourceService.canAfford(COLONY_SUPPORT_EMERGENCY_ACTION.cost)
      && VITAL_UTILITY_IDS.some((resourceId) => this.resourceService.getAmount(resourceId) === 0);
  }

  buyColonySupportUpgrade(upgradeId: string): InfrastructureActionResult {
    const upgrade = COLONY_SUPPORT_UPGRADE_BY_ID.get(upgradeId);

    if (upgrade === undefined) {
      return this.fail('upgrade_not_found', `Unknown colony support upgrade: ${upgradeId}.`);
    }

    if (this.isColonySupportUpgradePurchased(upgradeId)) {
      return this.fail('upgrade_already_purchased', `${upgrade.name} is already installed.`);
    }

    if (!this.hasRequiredColonySupportUpgrades(upgrade)) {
      return this.fail('missing_upgrade_requirement', `${upgrade.name} requires the previous support tier first.`);
    }

    if (!this.resourceService.canAfford(upgrade.cost)) {
      return this.fail('insufficient_resources', 'Not enough credits to install this colony support upgrade.');
    }

    this.gameState.updateResources((resources) => {
      const nextValues = { ...resources.values };
      const nextMaxValues = { ...resources.maxValues };

      for (const cost of upgrade.cost) {
        nextValues[cost.resourceId] = (nextValues[cost.resourceId] ?? 0) - cost.quantity;
      }

      for (const boost of upgrade.boosts) {
        const nextCap = (nextMaxValues[boost.resourceId] ?? nextValues[boost.resourceId] ?? 0) + boost.quantity;

        nextMaxValues[boost.resourceId] = nextCap;
        nextValues[boost.resourceId] = Math.min(nextCap, (nextValues[boost.resourceId] ?? 0) + boost.quantity);
      }

      return {
        ...resources,
        values: nextValues,
        maxValues: nextMaxValues,
      };
    });

    this.gameState.updateInfrastructure((state) => ({
      ...state,
      colonySupportUpgradeIds: [...state.colonySupportUpgradeIds, upgradeId],
    }));

    return { success: true };
  }

  buyStorageUpgrade(upgradeId: string): InfrastructureActionResult {
    const upgrade = STORAGE_UPGRADE_BY_ID.get(upgradeId);

    if (upgrade === undefined) {
      return this.fail('upgrade_not_found', `Unknown storage upgrade: ${upgradeId}.`);
    }

    if (this.isStorageUpgradePurchased(upgradeId)) {
      return this.fail('upgrade_already_purchased', `${upgrade.name} is already installed.`);
    }

    if (!this.hasRequiredStorageUpgrades(upgrade)) {
      return this.fail('missing_upgrade_requirement', `${upgrade.name} requires the previous storage tier first.`);
    }

    if (!this.resourceService.canAfford(upgrade.cost)) {
      return this.fail('insufficient_resources', 'Not enough credits to expand storage right now.');
    }

    this.gameState.updateResources((resources) => ({
      ...resources,
      values: upgrade.cost.reduce(
        (values, cost) => ({
          ...values,
          [cost.resourceId]: (values[cost.resourceId] ?? 0) - cost.quantity,
        }),
        { ...resources.values },
      ),
    }));

    this.gameState.updateInventory((inventory) => ({
      ...inventory,
      capacity: inventory.capacity + upgrade.capacityDelta,
    }));

    this.gameState.updateInfrastructure((state) => ({
      ...state,
      storageUpgradeIds: [...state.storageUpgradeIds, upgradeId],
    }));

    return { success: true };
  }

  runEmergencyReserve(): InfrastructureActionResult {
    if (!this.canRunEmergencyReserve()) {
      return this.fail(
        'emergency_not_available',
        'Emergency reserve is only available when energy, water, or oxygen has been depleted.',
      );
    }

    this.gameState.updateResources((resources) => {
      const nextValues = { ...resources.values };

      for (const cost of COLONY_SUPPORT_EMERGENCY_ACTION.cost) {
        nextValues[cost.resourceId] = (nextValues[cost.resourceId] ?? 0) - cost.quantity;
      }

      for (const restore of COLONY_SUPPORT_EMERGENCY_ACTION.restores) {
        const cap = resources.maxValues[restore.resourceId] ?? Number.POSITIVE_INFINITY;
        nextValues[restore.resourceId] = Math.min(cap, (nextValues[restore.resourceId] ?? 0) + restore.quantity);
      }

      return {
        ...resources,
        values: nextValues,
      };
    });

    return { success: true };
  }

  private hasRequiredStorageUpgrades(upgrade: StorageUpgradeDefinition): boolean {
    return (upgrade.requiresUpgradeIds ?? []).every((requiredId) => this.isStorageUpgradePurchased(requiredId));
  }

  private hasRequiredColonySupportUpgrades(upgrade: ColonySupportUpgradeDefinition): boolean {
    return (upgrade.requiresUpgradeIds ?? []).every((requiredId) => this.isColonySupportUpgradePurchased(requiredId));
  }

  private fail(code: InfrastructureActionFailureCode, message: string): InfrastructureActionResult {
    return { success: false, code, message };
  }
}