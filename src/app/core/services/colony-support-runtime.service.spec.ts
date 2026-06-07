import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ColonySupportRuntimeService } from './colony-support-runtime.service';
import { GameStateService } from './game-state.service';
import type { GameClockTick } from './game-clock.service';

let lastEffectFn: (() => void) | undefined;
const { untrackedSpy } = vi.hoisted(() => ({
  untrackedSpy: vi.fn((fn: () => void) => fn()),
}));

vi.mock('@angular/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@angular/core')>();
  return {
    ...mod,
    effect: vi.fn((fn: () => void) => {
      lastEffectFn = fn;
    }),
    untracked: untrackedSpy,
  };
});

describe('ColonySupportRuntimeService', () => {
  let gameState: GameStateService;
  let lastTick: ReturnType<typeof signal<GameClockTick | undefined>>;
  let service: ColonySupportRuntimeService;

  beforeEach(() => {
    lastEffectFn = undefined;
    untrackedSpy.mockClear();
    gameState = new GameStateService();
    lastTick = signal<GameClockTick | undefined>(undefined);
    service = new ColonySupportRuntimeService({ lastTick: lastTick.asReadonly() } as never, gameState);
  });

  it('wires positive game clock ticks into passive support processing', () => {
    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: ['solar_array_i'],
    }));

    lastTick.set({
      previousClock: { elapsedSeconds: 0 },
      currentClock: { elapsedSeconds: 20 },
      deltaRealSeconds: 1,
      deltaGameSeconds: 20,
    } as GameClockTick);
    lastEffectFn!();

    expect(untrackedSpy).toHaveBeenCalledTimes(1);
    expect(gameState.getSnapshot().resources.values['energy']).toBe(57);
  });

  it('ignores undefined and non-positive game clock ticks', () => {
    const before = gameState.getSnapshot().resources;

    lastEffectFn!();
    lastTick.set({
      previousClock: { elapsedSeconds: 0 },
      currentClock: { elapsedSeconds: 20 },
      deltaRealSeconds: 1,
      deltaGameSeconds: 0,
    } as GameClockTick);
    lastEffectFn!();

    expect(untrackedSpy).not.toHaveBeenCalled();
    expect(gameState.getSnapshot().resources).toEqual(before);
  });

  it('returns early when no passive support upgrades are installed', () => {
    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: [],
    }));
    const before = gameState.getSnapshot().resources;

    service.applyTickWindow(0, 60);

    expect(gameState.getSnapshot().resources).toEqual(before);
  });

  it('uses the highest installed support tier per resource family', () => {
    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: ['water_recycler_i', 'water_recycler_ii'],
    }));
    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, water: 0 },
    }));

    service.applyTickWindow(0, 20);

    expect(gameState.getSnapshot().resources.values['water']).toBe(5);
    expect(gameState.getSnapshot().resources.values['energy']).toBe(53);
  });

  it('does not spend energy when target resource is already capped', () => {
    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: ['water_recycler_i'],
    }));
    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, water: resources.maxValues['water'] },
    }));
    const before = gameState.getSnapshot().resources;

    service.applyTickWindow(0, 20);

    expect(gameState.getSnapshot().resources).toEqual(before);
  });

  it('skips non-energy passive generation when energy is unavailable', () => {
    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: ['oxygen_recycler_i'],
    }));
    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, energy: 0, oxygen: 0 },
    }));

    service.applyTickWindow(0, 20);

    expect(gameState.getSnapshot().resources.values['oxygen']).toBe(0);
    expect(gameState.getSnapshot().resources.values['energy']).toBe(0);
  });

  it('treats missing target resource amounts as zero during passive generation', () => {
    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: ['oxygen_recycler_i'],
    }));
    gameState.updateResources((resources) => {
      const { oxygen, ...valuesWithoutOxygen } = resources.values;
      void oxygen;

      return {
        ...resources,
        values: valuesWithoutOxygen as typeof resources.values,
      };
    });

    service.applyTickWindow(0, 20);

    expect(gameState.getSnapshot().resources.values['oxygen']).toBe(2);
    expect(gameState.getSnapshot().resources.values['energy']).toBe(54);
  });

  it('uses an infinite cap fallback when a target resource cap is missing', () => {
    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: ['water_recycler_i'],
    }));
    gameState.updateResources((resources) => {
      const { water, ...maxValuesWithoutWater } = resources.maxValues;
      void water;

      return {
        ...resources,
        values: { ...resources.values, water: 124 },
        maxValues: maxValuesWithoutWater as typeof resources.maxValues,
      };
    });

    service.applyTickWindow(0, 20);

    expect(gameState.getSnapshot().resources.values['water']).toBe(127);
    expect(gameState.getSnapshot().resources.values['energy']).toBe(54);
  });

  it('does not apply passive cycles when the tick window does not cross an interval', () => {
    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: ['solar_array_i', 'unknown_upgrade'],
    }));
    const before = gameState.getSnapshot().resources;

    service.applyTickWindow(10, 19);
    service.applyTickWindow(20, 20);

    expect(gameState.getSnapshot().resources).toEqual(before);
  });
});
