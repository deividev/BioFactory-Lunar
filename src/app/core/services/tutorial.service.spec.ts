import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TUTORIAL_STEPS } from '../data';
import { GameStateService } from './game-state.service';
import { TutorialService } from './tutorial.service';

describe('TutorialService', () => {
  let gameState: GameStateService;
  let service: TutorialService;

  beforeEach(() => {
    gameState = new GameStateService();
    service = new TutorialService(gameState);
  });

  // ── initial state ─────────────────────────────────────────────────────────

  it('exposes the initial tutorial state with the first step active', () => {
    const tutorial = service.tutorial();
    expect(tutorial.activeStepId).toBe('accept_first_contract');
    expect(tutorial.completedStepIds).toEqual([]);
  });

  it('isComplete is false when there are uncompleted steps', () => {
    expect(service.isComplete()).toBe(false);
  });

  // ── completeStep ──────────────────────────────────────────────────────────

  it('completeStep adds the step to completedStepIds', () => {
    expect(service.completeStep('accept_first_contract')).toBe(true);
    expect(service.tutorial().completedStepIds).toContain('accept_first_contract');
  });

  it('completeStep activates the next step in the ordered sequence', () => {
    service.completeStep('accept_first_contract');
    expect(service.tutorial().activeStepId).toBe('buy_seeds');
  });

  it('buy_seeds step follows accept_first_contract in the ordered sequence', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    const contractIdx = ids.indexOf('accept_first_contract');
    const buyIdx = ids.indexOf('buy_seeds');
    expect(buyIdx).toBe(contractIdx + 1);
  });

  it('receive_seeds step follows buy_seeds in the ordered sequence', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    const buyIdx = ids.indexOf('buy_seeds');
    const receiveIdx = ids.indexOf('receive_seeds');
    expect(receiveIdx).toBe(buyIdx + 1);
  });

  it('receive_seeds step precedes plant_crop in the ordered sequence', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    const receiveIdx = ids.indexOf('receive_seeds');
    const plantIdx = ids.indexOf('plant_crop');
    expect(plantIdx).toBe(receiveIdx + 1);
  });

  it('deliver_contract step precedes process_product in the ordered sequence', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    const deliverIdx = ids.indexOf('deliver_contract');
    const processIdx = ids.indexOf('process_product');
    expect(processIdx).toBe(deliverIdx + 1);
  });

  it('completeStep advances through each sequential step correctly', () => {
    const orderedIds = TUTORIAL_STEPS.map((s) => s.id);

    for (let i = 0; i < orderedIds.length - 1; i++) {
      service.completeStep(orderedIds[i]!);
      expect(service.tutorial().activeStepId).toBe(orderedIds[i + 1]);
      expect(service.tutorial().completedStepIds).toContain(orderedIds[i]);
    }
  });

  it('completeStep on the last step sets activeStepId to undefined', () => {
    const lastStepId = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1]!.id;
    gameState.updateTutorial((tutorial) => ({
      ...tutorial,
      completedStepIds: TUTORIAL_STEPS.slice(0, -1).map((s) => s.id),
      activeStepId: lastStepId,
    }));

    service.completeStep(lastStepId);

    expect(service.tutorial().activeStepId).toBeUndefined();
    expect(service.tutorial().completedStepIds).toContain(lastStepId);
  });

  it('isComplete is true after all steps are completed', () => {
    const orderedIds = TUTORIAL_STEPS.map((s) => s.id);
    for (const id of orderedIds) {
      service.completeStep(id);
    }
    expect(service.isComplete()).toBe(true);
  });

  it('completeStep ignores out-of-order steps and keeps the current active step', () => {
    expect(service.completeStep('buy_seeds')).toBe(false);

    expect(service.tutorial().completedStepIds).toEqual([]);
    expect(service.tutorial().activeStepId).toBe('accept_first_contract');
  });

  // ── idempotency ───────────────────────────────────────────────────────────

  it('completeStep is idempotent — calling it twice does not duplicate the step', () => {
    service.completeStep('accept_first_contract');
    service.completeStep('accept_first_contract');

    const completed = service.tutorial().completedStepIds;
    expect(completed.filter((id) => id === 'accept_first_contract')).toHaveLength(1);
  });

  it('completeStep is idempotent — activeStepId does not regress on repeated calls', () => {
    service.completeStep('accept_first_contract');
    const activeAfterFirst = service.tutorial().activeStepId;

    service.completeStep('accept_first_contract');
    expect(service.tutorial().activeStepId).toBe(activeAfterFirst);
  });

  // ── unknown step ──────────────────────────────────────────────────────────

  it('completeStep with an unknown step id is a no-op', () => {
    const activeBefore = service.tutorial().activeStepId;

    expect(service.completeStep('unknown_step_id')).toBe(false);

    expect(service.tutorial().completedStepIds).toEqual([]);
    expect(service.tutorial().activeStepId).toBe(activeBefore);
  });

  // ── isolation ─────────────────────────────────────────────────────────────

  it('tutorial signal is frozen and prevents external mutation', () => {
    service.completeStep('accept_first_contract');

    const tutorialView = service.tutorial();
    expect(Object.isFrozen(tutorialView)).toBe(true);
    expect(Object.isFrozen(tutorialView.completedStepIds)).toBe(true);
    expect(() => {
      (tutorialView as { activeStepId: string | undefined }).activeStepId = 'harvest_crop';
    }).toThrow(TypeError);
  });

  it('does not mutate unrelated game state branches when completing a step', () => {
    const resourcesBefore = gameState.getSnapshot().resources;
    const inventoryBefore = gameState.getSnapshot().inventory;

    service.completeStep('accept_first_contract');

    expect(gameState.resources()).toEqual(resourcesBefore);
    expect(gameState.inventory()).toEqual(inventoryBefore);
  });

  it('syncs demo flow progress after a successful tutorial step completion', () => {
    const demoFlow = { syncProgressFromState: vi.fn() } as const;
    const tutorialService = new TutorialService(gameState, demoFlow as never);

    expect(tutorialService.completeStep('accept_first_contract')).toBe(true);

    expect(demoFlow.syncProgressFromState).toHaveBeenCalledOnce();
  });

  it('does not sync demo flow progress when tutorial completion is ignored', () => {
    const demoFlow = { syncProgressFromState: vi.fn() } as const;
    const tutorialService = new TutorialService(gameState, demoFlow as never);

    expect(tutorialService.completeStep('buy_seeds')).toBe(false);

    expect(demoFlow.syncProgressFromState).not.toHaveBeenCalled();
  });

  it('completes an unknown active step by treating it as terminal progress', () => {
    gameState.updateTutorial(() => ({
      completedStepIds: [],
      activeStepId: 'custom_terminal_step',
    }));

    expect(service.completeStep('custom_terminal_step')).toBe(true);
    expect(service.tutorial().completedStepIds).toContain('custom_terminal_step');
    expect(service.tutorial().activeStepId).toBeUndefined();
  });
});
