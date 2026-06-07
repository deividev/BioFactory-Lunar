import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_FINALE_CONTRACT_INSTANCE_ID } from '../data';
import { ContractState } from '../enums';
import type { DemoFlowState, SaveData } from '../models';
import { GameClockService } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { DemoFlowService } from './demo-flow.service';
import { SaveService, type RestoreLatestSaveResult } from './save.service';

function createDemoSaveData(phase: DemoFlowState['phase'] = 'guided_run'): SaveData {
  const state = new GameStateService();

  return {
    ...state.toSaveData('2026-05-24T12:00:00.000Z'),
    demo: {
      phase,
      objectiveContractInstanceId: DEMO_FINALE_CONTRACT_INSTANCE_ID,
      guidanceMode: 'tutorial',
      completedAt: phase === 'completed' ? '2026-05-24T12:15:00.000Z' : undefined,
      optionalScopes: { event: false, robot: false },
    },
  };
}

function createService(restoreResult: RestoreLatestSaveResult = { success: true, restored: false }) {
  const gameState = new GameStateService();
  const saveService = {
    restoreLatestGame: vi.fn<SaveService['restoreLatestGame']>().mockImplementation(async () => {
      if (restoreResult.success && 'data' in restoreResult) {
        gameState.loadFromSave(restoreResult.data);
      }

      return restoreResult;
    }),
    startAutosave: vi.fn<SaveService['startAutosave']>(),
    stopAutosave: vi.fn<SaveService['stopAutosave']>(),
  } as unknown as SaveService;
  const gameClock = {
    start: vi.fn<GameClockService['start']>(),
    stop: vi.fn<GameClockService['stop']>(),
  } as unknown as GameClockService;
  const service = new DemoFlowService(gameState, saveService, gameClock);

  return { gameClock, gameState, saveService, service };
}

describe('DemoFlowService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('boots to the menu without a continue action when no save exists', async () => {
    const { gameClock, saveService, service } = createService({ success: true, restored: false });

    await service.bootstrap();

    expect(saveService.restoreLatestGame).toHaveBeenCalledOnce();
    expect(service.viewPhase()).toBe('menu');
    expect(service.hasContinueOption()).toBe(false);
    expect(gameClock.stop).toHaveBeenCalledOnce();
    expect(saveService.stopAutosave).toHaveBeenCalledOnce();
  });

  it('boots back to the menu without continue when restore fails', async () => {
    const { gameClock, saveService, service } = createService({
      success: false,
      code: 'load_failed',
      message: 'Unable to load game.',
    });

    await service.bootstrap();

    expect(saveService.restoreLatestGame).toHaveBeenCalledOnce();
    expect(service.viewPhase()).toBe('menu');
    expect(service.hasContinueOption()).toBe(false);
    expect(gameClock.stop).toHaveBeenCalledOnce();
    expect(saveService.stopAutosave).toHaveBeenCalledOnce();
  });

  it('restores a guided-run save into the menu with continue available until the player resumes', async () => {
    const saveData = createDemoSaveData('guided_run');
    const { gameState, service } = createService({ success: true, data: saveData });

    await service.bootstrap();

    expect(service.viewPhase()).toBe('menu');
    expect(service.hasContinueOption()).toBe(true);
    expect(gameState.getSnapshot().demo.phase).toBe('guided_run');
  });

  it('adapts legacy saves without demo flow into a resumable guided run', async () => {
    const legacySave = createDemoSaveData('guided_run') as SaveData & Record<string, unknown>;
    delete legacySave['demo'];
    const { gameState, service } = createService({ success: true, data: legacySave });

    await service.bootstrap();

    expect(service.viewPhase()).toBe('menu');
    expect(service.hasContinueOption()).toBe(true);
    expect(gameState.getSnapshot().demo.phase).toBe('guided_run');
  });

  it('boots directly into the completion host when the restored save is already completed', async () => {
    const saveData = createDemoSaveData('completed');
    const { service } = createService({ success: true, data: saveData });

    await service.bootstrap();

    expect(service.viewPhase()).toBe('completed');
    expect(service.hasContinueOption()).toBe(true);
  });

  it('starts a fresh demo by resetting state, entering guided play, and starting runtime services', async () => {
    const { gameClock, gameState, saveService, service } = createService();

    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 999 },
    }));

    service.startNewDemo();

    expect(service.viewPhase()).toBe('guided_run');
    expect(gameState.getSnapshot().resources.values['credits']).toBe(150);
    expect(gameState.getSnapshot().demo).toEqual({
      phase: 'guided_run',
      objectiveContractInstanceId: DEMO_FINALE_CONTRACT_INSTANCE_ID,
      guidanceMode: 'tutorial',
      optionalScopes: { event: false, robot: false },
    });
    expect(gameClock.start).toHaveBeenCalledOnce();
    expect(saveService.startAutosave).toHaveBeenCalledOnce();
  });

  it('seeds the designated finale objective and reports it as blocked until the tutorial loop is complete', () => {
    const { service } = createService();

    service.startNewDemo();

    expect(service.objectiveSummary().objectiveName).toBe('Lunar Habitat Kit');
    expect(service.objectiveSummary().status).toBe('blocked');
    expect(service.objectiveSummary().hint).toContain('Accept a Contract');
  });

  it('switches into actionable and completable finale states after the tutorial is done', () => {
    const { gameState, service } = createService();

    service.startNewDemo();
    gameState.updateTutorial(() => ({
      completedStepIds: ['accept_first_contract', 'buy_seeds', 'receive_seeds', 'plant_crop', 'harvest_crop', 'deliver_contract', 'process_product'],
      activeStepId: undefined,
    }));
    service.syncProgressFromState();

    expect(gameState.getSnapshot().demo.guidanceMode).toBe('objective');
    expect(service.objectiveSummary().status).toBe('actionable');

    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === DEMO_FINALE_CONTRACT_INSTANCE_ID
          ? { ...contract, state: ContractState.Active }
          : contract,
      ),
    );
    gameState.updateInventory((inventory) => ({
      ...inventory,
      items: {
        ...inventory.items,
        biofood_pack: 1,
        nutrient_mix: 1,
        glow_pigment: 1,
      },
    }));

    expect(service.objectiveSummary().status).toBe('completable');
    expect(service.objectiveSummary().requirements.map((requirement) => requirement.complete)).toEqual([true, true, true]);
  });

  it('keeps an active finale objective actionable until all required cargo is ready', () => {
    const { gameState, service } = createService();

    service.startNewDemo();
    gameState.updateTutorial(() => ({
      completedStepIds: ['accept_first_contract', 'buy_seeds', 'receive_seeds', 'plant_crop', 'harvest_crop', 'deliver_contract', 'process_product'],
      activeStepId: undefined,
    }));
    service.syncProgressFromState();
    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === DEMO_FINALE_CONTRACT_INSTANCE_ID
          ? { ...contract, state: ContractState.Active }
          : contract,
      ),
    );
    gameState.updateInventory((inventory) => ({
      ...inventory,
      items: {
        ...inventory.items,
        biofood_pack: 1,
      },
    }));

    expect(service.objectiveSummary().status).toBe('actionable');
    expect(service.objectiveSummary().hint).toContain('Produce the remaining cargo');
    expect(service.objectiveSummary().requirements.map((requirement) => requirement.complete)).toEqual([true, false, false]);
  });

  it('falls back to generic objective and tutorial copy when saved ids are unknown', () => {
    const { gameState, service } = createService();

    service.startNewDemo();
    gameState.updateDemo((demo) => ({
      ...demo,
      objectiveContractInstanceId: 'contract_missing_01',
    }));
    gameState.updateTutorial(() => ({
      completedStepIds: [],
      activeStepId: 'unknown_step_id',
    }));

    expect(service.objectiveSummary().status).toBe('blocked');
    expect(service.objectiveSummary().objectiveName).toBe('Lunar Habitat Kit');
    expect(service.objectiveSummary().hint).toBe('Complete the current onboarding step.');
    expect(service.objectiveSummary().requirements).toEqual([]);
  });

  it('completes the demo when the designated finale contract is already completed in state', () => {
    const { gameState, service } = createService();

    service.startNewDemo();
    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === DEMO_FINALE_CONTRACT_INSTANCE_ID
          ? { ...contract, state: ContractState.Completed }
          : contract,
      ),
    );

    service.syncProgressFromState('2026-05-24T12:45:00.000Z');

    expect(service.viewPhase()).toBe('completed');
    expect(gameState.getSnapshot().demo.phase).toBe('completed');
    expect(gameState.getSnapshot().demo.completedAt).toBe('2026-05-24T12:45:00.000Z');
  });

  it('transitions to completion by persisting completed demo state and stopping runtime services', () => {
    const { gameClock, gameState, saveService, service } = createService();

    service.startNewDemo();
    service.completeDemo('2026-05-24T12:30:00.000Z');

    expect(service.viewPhase()).toBe('completed');
    expect(service.hasContinueOption()).toBe(true);
    expect(gameState.getSnapshot().demo).toEqual({
      phase: 'completed',
      objectiveContractInstanceId: DEMO_FINALE_CONTRACT_INSTANCE_ID,
      guidanceMode: 'tutorial',
      completedAt: '2026-05-24T12:30:00.000Z',
      optionalScopes: { event: false, robot: false },
    });
    expect(gameClock.stop).toHaveBeenCalled();
    expect(saveService.stopAutosave).toHaveBeenCalled();
  });

  it('returns to the menu while preserving continue availability for in-progress demos', () => {
    const { gameClock, saveService, service } = createService();

    service.startNewDemo();
    service.returnToMenu();

    expect(service.viewPhase()).toBe('menu');
    expect(service.hasContinueOption()).toBe(true);
    expect(gameClock.stop).toHaveBeenCalled();
    expect(saveService.stopAutosave).toHaveBeenCalled();
  });

  it('continues from a menu-phase state without exposing Continue Demo in the menu model', () => {
    const { gameClock, saveService, service } = createService();

    service.continueDemo();

    expect(service.viewPhase()).toBe('guided_run');
    expect(service.hasContinueOption()).toBe(false);
    expect(gameClock.start).toHaveBeenCalledOnce();
    expect(saveService.startAutosave).toHaveBeenCalledOnce();
  });

  it('cleanup stops runtime services without changing the host phase', () => {
    const { gameClock, saveService, service } = createService();

    service.startNewDemo();
    service.cleanup();

    expect(service.viewPhase()).toBe('guided_run');
    expect(gameClock.stop).toHaveBeenCalled();
    expect(saveService.stopAutosave).toHaveBeenCalled();
  });
});