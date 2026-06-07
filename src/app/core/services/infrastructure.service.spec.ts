import { describe, expect, it } from 'vitest';

import { GameStateService } from './game-state.service';
import { InfrastructureService } from './infrastructure.service';
import { ResourceService } from './resource.service';

describe('InfrastructureService', () => {
  it('reports upgrade availability across unknown, locked, unaffordable, and purchased states', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    expect(service.canBuyColonySupportUpgrade('missing_upgrade')).toBe(false);
    expect(service.canBuyColonySupportUpgrade('solar_array_i')).toBe(false);
    expect(service.canBuyColonySupportUpgrade('solar_array_ii')).toBe(true);
    expect(service.isColonySupportUpgradeLocked('solar_array_ii')).toBe(false);
    expect(service.canBuyStorageUpgrade('missing_upgrade')).toBe(false);
    expect(service.canBuyStorageUpgrade('storage_bay_iii')).toBe(false);
    expect(service.canRunEmergencyReserve()).toBe(false);

    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 10, water: 0 },
    }));

    expect(service.canBuyStorageUpgrade('storage_bay_ii')).toBe(false);
    expect(service.canRunEmergencyReserve()).toBe(false);
  });

  it('buys a colony support upgrade, deducts credits, and boosts the matching utility buffer', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    const result = service.buyColonySupportUpgrade('water_recycler_ii');

    expect(result).toEqual({ success: true });
    expect(gameState.getSnapshot().resources.values['credits']).toBe(75);
    expect(gameState.getSnapshot().resources.values['water']).toBe(84);
    expect(gameState.getSnapshot().resources.maxValues['water']).toBe(148);
    expect(gameState.getSnapshot().infrastructure.colonySupportUpgradeIds).toEqual([
      'solar_array_i',
      'water_recycler_i',
      'oxygen_recycler_i',
      'water_recycler_ii',
    ]);
  });

  it('rejects buying the same colony support upgrade twice', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    service.buyColonySupportUpgrade('solar_array_i');

    expect(service.buyColonySupportUpgrade('solar_array_i')).toEqual({
      success: false,
      code: 'upgrade_already_purchased',
      message: 'Solar Array I is already installed.',
    });
  });

  it('blocks higher support tiers until their previous level is installed', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    gameState.updateInfrastructure((infrastructure) => ({
      ...infrastructure,
      colonySupportUpgradeIds: [],
    }));

    expect(service.buyColonySupportUpgrade('water_recycler_ii')).toEqual({
      success: false,
      code: 'missing_upgrade_requirement',
      message: 'Water Recycler II requires the previous support tier first.',
    });

    expect(service.buyColonySupportUpgrade('water_recycler_i')).toEqual({ success: true });
    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 100 },
    }));

    expect(service.buyColonySupportUpgrade('water_recycler_ii')).toEqual({ success: true });
  });

  it('rejects unknown or unaffordable colony support upgrades', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    expect(service.buyColonySupportUpgrade('unknown_upgrade')).toEqual({
      success: false,
      code: 'upgrade_not_found',
      message: 'Unknown colony support upgrade: unknown_upgrade.',
    });

    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 30 },
    }));

    expect(service.buyColonySupportUpgrade('water_recycler_ii')).toEqual({
      success: false,
      code: 'insufficient_resources',
      message: 'Not enough credits to install this colony support upgrade.',
    });
  });

  it('buys storage upgrades in sequence and expands inventory capacity persistently', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    expect(service.buyStorageUpgrade('storage_bay_ii')).toEqual({ success: true });
    expect(gameState.getSnapshot().inventory.capacity).toBe(20);
    expect(gameState.getSnapshot().resources.values['credits']).toBe(110);

    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 145 },
    }));

    expect(service.buyStorageUpgrade('storage_bay_iii')).toEqual({ success: true });
    expect(gameState.getSnapshot().inventory.capacity).toBe(28);
    expect(gameState.getSnapshot().infrastructure.storageUpgradeIds).toEqual(['storage_bay_ii', 'storage_bay_iii']);
  });

  it('reports storage upgrade availability once prerequisites and budget are satisfied', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    expect(service.canBuyStorageUpgrade('storage_bay_ii')).toBe(true);

    service.buyStorageUpgrade('storage_bay_ii');

    expect(service.canBuyStorageUpgrade('storage_bay_ii')).toBe(false);
    expect(service.canBuyStorageUpgrade('storage_bay_iii')).toBe(true);
  });

  it('blocks storage upgrades when the previous tier is missing', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    expect(service.buyStorageUpgrade('storage_bay_iii')).toEqual({
      success: false,
      code: 'missing_upgrade_requirement',
      message: 'Storage Bay III requires the previous storage tier first.',
    });
  });

  it('rejects unknown, duplicate, or unaffordable storage upgrades', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    expect(service.buyStorageUpgrade('unknown_upgrade')).toEqual({
      success: false,
      code: 'upgrade_not_found',
      message: 'Unknown storage upgrade: unknown_upgrade.',
    });

    expect(service.buyStorageUpgrade('storage_bay_ii')).toEqual({ success: true });
    expect(service.buyStorageUpgrade('storage_bay_ii')).toEqual({
      success: false,
      code: 'upgrade_already_purchased',
      message: 'Storage Bay II is already installed.',
    });

    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 20 },
    }));

    expect(service.buyStorageUpgrade('storage_bay_iii')).toEqual({
      success: false,
      code: 'insufficient_resources',
      message: 'Not enough credits to expand storage right now.',
    });
  });

  it('runs the emergency reserve only when a vital utility has been depleted', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    expect(service.runEmergencyReserve()).toEqual({
      success: false,
      code: 'emergency_not_available',
      message: 'Emergency reserve is only available when energy, water, or oxygen has been depleted.',
    });

    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, water: 0 },
    }));

    expect(service.runEmergencyReserve()).toEqual({ success: true });
    expect(gameState.getSnapshot().resources.values['credits']).toBe(135);
    expect(gameState.getSnapshot().resources.values['energy']).toBe(61);
    expect(gameState.getSnapshot().resources.values['water']).toBe(8);
    expect(gameState.getSnapshot().resources.values['oxygen']).toBe(51);
  });

  it('backfills missing utility values and caps when support boosts or reserve restores run on degraded state', () => {
    const gameState = new GameStateService();
    const service = new InfrastructureService(gameState, new ResourceService(gameState));

    gameState.updateResources((resources) => {
      const { energy, oxygen, ...remainingValues } = resources.values;
      const { energy: energyCap, oxygen: oxygenCap, ...remainingCaps } = resources.maxValues;

      void energy;
      void oxygen;
      void energyCap;
      void oxygenCap;

      return {
        ...resources,
        values: {
          ...(remainingValues as typeof resources.values),
          water: 0,
        },
        maxValues: remainingCaps as typeof resources.maxValues,
      };
    });

    expect(service.buyColonySupportUpgrade('solar_array_ii')).toEqual({ success: true });
    expect(gameState.getSnapshot().resources.values['energy']).toBe(20);
    expect(gameState.getSnapshot().resources.maxValues['energy']).toBe(20);

    expect(service.runEmergencyReserve()).toEqual({ success: true });
    expect(gameState.getSnapshot().resources.values['oxygen']).toBe(6);
    expect(gameState.getSnapshot().resources.values['water']).toBe(8);
  });
});
