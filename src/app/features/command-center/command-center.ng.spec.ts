import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_FINALE_CONTRACT_INSTANCE_ID, TUTORIAL_STEPS } from '../../core/data';
import { ContractState } from '../../core/enums';
import { GameStateService, SaveService, TutorialService } from '../../core/services';
import { CommandCenter } from './command-center';

describe('CommandCenter panel', () => {
  let fixture: ComponentFixture<CommandCenter>;
  let el: HTMLElement;
  let gameState: GameStateService;
  let tutorialService: TutorialService;
  let saveService: SaveService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CommandCenter] }).compileComponents();
    fixture = TestBed.createComponent(CommandCenter);
    el = fixture.nativeElement;
    gameState = TestBed.inject(GameStateService);
    tutorialService = TestBed.inject(TutorialService);
    saveService = TestBed.inject(SaveService);
    fixture.detectChanges();
  });

  // ── renders ────────────────────────────────────────────────────────────────

  it('renders the Command Center panel heading', () => {
    expect(el.textContent).toContain('Command Center');
  });

  it('does not render "placeholder online" text', () => {
    expect(el.textContent).not.toContain('placeholder online');
  });

  it('shows tutorial progress section', () => {
    const section = el.querySelector('[aria-label="Tutorial progress"]');
    expect(section).not.toBeNull();
  });

  it('shows the blocked demo objective state on a fresh guided run', () => {
    const objectiveStatus = el.querySelector('[data-testid="objective-status"]');
    expect(objectiveStatus?.textContent).toContain('Blocked');
    expect(el.querySelector('[aria-label="Demo objective"]')?.textContent).toContain('Lunar Habitat Kit');
  });

  it('shows the total step count', () => {
    expect(el.textContent).toContain(`/ ${TUTORIAL_STEPS.length} steps`);
  });

  // ── active step ────────────────────────────────────────────────────────────

  it('shows the active step label when tutorial is in progress', () => {
    const activeStep = el.querySelector('[data-testid="active-step"]');
    expect(activeStep).not.toBeNull();
    expect(activeStep!.textContent).toContain('Accept a Contract');
  });

  it('shows the active step description when tutorial is in progress', () => {
    const activeStep = el.querySelector('[data-testid="active-step"]');
    expect(activeStep!.textContent).toContain('Contracts panel');
  });

  it('advances to next step label when a step is completed', () => {
    tutorialService.completeStep('accept_first_contract');
    fixture.detectChanges();
    const activeStep = el.querySelector('[data-testid="active-step"]');
    expect(activeStep!.textContent).toContain('Buy Seeds');
  });

  it('switches the objective to actionable after the onboarding loop is complete', () => {
    for (const step of TUTORIAL_STEPS) {
      tutorialService.completeStep(step.id);
    }

    fixture.detectChanges();

    const objectiveStatus = el.querySelector('[data-testid="objective-status"]');
    expect(objectiveStatus?.textContent).toContain('Actionable');
    expect(el.textContent).toContain('accept the finale contract');
  });

  it('shows the objective as completable when the finale delivery cargo is ready', () => {
    for (const step of TUTORIAL_STEPS) {
      tutorialService.completeStep(step.id);
    }
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

    fixture.detectChanges();

    const objectiveStatus = el.querySelector('[data-testid="objective-status"]');
    expect(objectiveStatus?.textContent).toContain('Completable');
    expect(el.querySelectorAll('[data-testid="objective-requirement"]')).toHaveLength(3);
    expect(el.textContent).toContain('1/1');
  });

  // ── complete state ─────────────────────────────────────────────────────────

  it('shows "MVP loop complete" message when all steps are done', () => {
    for (const step of TUTORIAL_STEPS) {
      tutorialService.completeStep(step.id);
    }
    fixture.detectChanges();
    const complete = el.querySelector('[data-testid="tutorial-complete"]');
    expect(complete).not.toBeNull();
    expect(complete!.textContent).toContain('Onboarding complete');
    expect(complete!.textContent).toContain('Finale contract unlocked');
  });

  it('does not show active-step when tutorial is complete', () => {
    for (const step of TUTORIAL_STEPS) {
      tutorialService.completeStep(step.id);
    }
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="active-step"]')).toBeNull();
  });

  // ── save action ────────────────────────────────────────────────────────────

  it('renders a Save button', () => {
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="save-btn"]');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('Save');
  });

  it('Save button calls saveService.saveGame()', () => {
    const spy = vi.spyOn(saveService, 'saveGame');
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="save-btn"]')!;
    btn.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('shows "Game saved." status after a successful save', async () => {
    vi.spyOn(saveService, 'saveGame').mockResolvedValue({ success: true });
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="save-btn"]')!;
    btn.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const status = el.querySelector('[data-testid="save-status"]');
    expect(status).not.toBeNull();
    expect(status!.textContent).toContain('Game saved.');
  });

  it('shows error message when save fails', async () => {
    vi.spyOn(saveService, 'saveGame').mockResolvedValue({
      success: false,
      code: 'save_failed',
      message: 'Save failed unexpectedly.',
    });
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="save-btn"]')!;
    btn.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const status = el.querySelector('[data-testid="save-status"]');
    expect(status).not.toBeNull();
    expect(status!.textContent).toContain('Save failed unexpectedly.');
  });

  it('does not show save status before save is triggered', () => {
    expect(el.querySelector('[data-testid="save-status"]')).toBeNull();
  });
});
