import { effect, Injectable, untracked } from '@angular/core';

import { COLONY_SUPPORT_UPGRADES } from '../data';
import type { ColonySupportPassiveGenerationDefinition } from '../models';
import { GameClockService } from './game-clock.service';
import { GameStateService } from './game-state.service';

const COLONY_SUPPORT_UPGRADE_BY_ID = new Map(
  COLONY_SUPPORT_UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
);

function getColonySupportUpgradeLevel(upgradeId: string): number {
  return upgradeId.endsWith('_ii') ? 2 : 1;
}

function countPassiveCycles(previousElapsedSeconds: number, currentElapsedSeconds: number, intervalSeconds: number): number {
  if (intervalSeconds <= 0 || currentElapsedSeconds <= previousElapsedSeconds) {
    return 0;
  }

  return Math.floor(currentElapsedSeconds / intervalSeconds) - Math.floor(previousElapsedSeconds / intervalSeconds);
}

function applyPassiveCycle(
  values: Record<string, number>,
  caps: Record<string, number>,
  passiveGeneration: ColonySupportPassiveGenerationDefinition,
): boolean {
  const currentTargetAmount = values[passiveGeneration.resourceId] ?? 0;
  const targetCap = caps[passiveGeneration.resourceId] ?? Number.POSITIVE_INFINITY;

  if (currentTargetAmount >= targetCap) {
    return false;
  }

  if (passiveGeneration.resourceId === 'energy') {
    const netGain = passiveGeneration.quantity - passiveGeneration.energyCost;

    if (netGain <= 0) {
      return false;
    }

    values['energy'] = Math.min(targetCap, currentTargetAmount + netGain);
    return true;
  }

  const currentEnergy = values['energy'] ?? 0;

  if (currentEnergy < passiveGeneration.energyCost) {
    return false;
  }

  values['energy'] = currentEnergy - passiveGeneration.energyCost;
  values[passiveGeneration.resourceId] = Math.min(targetCap, currentTargetAmount + passiveGeneration.quantity);

  return true;
}

@Injectable({ providedIn: 'root' })
export class ColonySupportRuntimeService {
  constructor(
    private readonly gameClock: GameClockService,
    private readonly gameState: GameStateService,
  ) {
    effect(() => {
      const tick = this.gameClock.lastTick();

      if (tick === undefined || tick.deltaGameSeconds <= 0) {
        return;
      }

      untracked(() => this.applyTickWindow(tick.previousClock.elapsedSeconds, tick.currentClock.elapsedSeconds));
    });
  }

  applyTickWindow(previousElapsedSeconds: number, currentElapsedSeconds: number): void {
    const passiveUpgrades = [...this.gameState.infrastructure().colonySupportUpgradeIds
      .map((upgradeId) => COLONY_SUPPORT_UPGRADE_BY_ID.get(upgradeId))
      .filter((upgrade): upgrade is NonNullable<typeof upgrade> => upgrade !== undefined)
      .reduce((familyMap, upgrade) => {
        const resourceId = upgrade.passiveGeneration.resourceId;
        const existingUpgrade = familyMap.get(resourceId);

        if (
          existingUpgrade === undefined
          || getColonySupportUpgradeLevel(upgrade.id) > getColonySupportUpgradeLevel(existingUpgrade.id)
        ) {
          familyMap.set(resourceId, upgrade);
        }

        return familyMap;
      }, new Map<string, NonNullable<(typeof COLONY_SUPPORT_UPGRADES)[number]>>())
      .values()]
      .map((upgrade) => upgrade.passiveGeneration);

    if (passiveUpgrades.length === 0) {
      return;
    }

    this.gameState.updateResources((resources) => {
      const nextValues = { ...resources.values };
      let changed = false;

      for (const passiveGeneration of passiveUpgrades) {
        const cycleCount = countPassiveCycles(previousElapsedSeconds, currentElapsedSeconds, passiveGeneration.intervalSeconds);

        for (let cycle = 0; cycle < cycleCount; cycle += 1) {
          changed = applyPassiveCycle(nextValues, resources.maxValues, passiveGeneration) || changed;
        }
      }

      return changed
        ? {
            ...resources,
            values: nextValues,
          }
        : resources;
    });
  }
}