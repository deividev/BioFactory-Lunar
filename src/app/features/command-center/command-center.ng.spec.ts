import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TUTORIAL_STEPS } from '../../core/data';
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

  // ── complete state ─────────────────────────────────────────────────────────

  it('shows "MVP loop complete" message when all steps are done', () => {
    for (const step of TUTORIAL_STEPS) {
      tutorialService.completeStep(step.id);
    }
    fixture.detectChanges();
    const complete = el.querySelector('[data-testid="tutorial-complete"]');
    expect(complete).not.toBeNull();
    expect(complete!.textContent).toContain('MVP loop complete');
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

  it('shows "Game saved." status after a successful save', () => {
    vi.spyOn(saveService, 'saveGame').mockReturnValue({ success: true });
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="save-btn"]')!;
    btn.click();
    fixture.detectChanges();
    const status = el.querySelector('[data-testid="save-status"]');
    expect(status).not.toBeNull();
    expect(status!.textContent).toContain('Game saved.');
  });

  it('shows error message when save fails', () => {
    vi.spyOn(saveService, 'saveGame').mockReturnValue({
      success: false,
      code: 'save_failed',
      message: 'Save failed unexpectedly.',
    });
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="save-btn"]')!;
    btn.click();
    fixture.detectChanges();
    const status = el.querySelector('[data-testid="save-status"]');
    expect(status).not.toBeNull();
    expect(status!.textContent).toContain('Save failed unexpectedly.');
  });

  it('does not show save status before save is triggered', () => {
    expect(el.querySelector('[data-testid="save-status"]')).toBeNull();
  });
});
