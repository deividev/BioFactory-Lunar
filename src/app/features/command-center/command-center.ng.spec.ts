import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_FINALE_CONTRACT_INSTANCE_ID, TUTORIAL_STEPS } from '../../core/data';
import { ContractState } from '../../core/enums';
import { ColonySupportRuntimeService, GameClockService, GameStateService, SaveService, TutorialService } from '../../core/services';
import { CommandCenter } from './command-center';

describe('CommandCenter panel', () => {
  let fixture: ComponentFixture<CommandCenter>;
  let el: HTMLElement;
  let gameClock: GameClockService;
  let gameState: GameStateService;
  let tutorialService: TutorialService;
  let saveService: SaveService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CommandCenter] }).compileComponents();
    fixture = TestBed.createComponent(CommandCenter);
    el = fixture.nativeElement;
    gameClock = TestBed.inject(GameClockService);
    gameState = TestBed.inject(GameStateService);
    TestBed.inject(ColonySupportRuntimeService);
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

  it('shows a recommended next unlock on a fresh guided run', () => {
    const recommended = el.querySelector('[data-testid="recommended-unlock"]')?.textContent ?? '';
    const unlocks = Array.from(el.querySelectorAll('[data-testid="unlock-preview"]')).map((node) => node.textContent ?? '');

    expect(recommended).toContain('Recommended next move');
    expect(recommended).toContain('Complete Starter Protein Delivery');
    expect(recommended).toContain('Aqua Sprout seeds');
    expect(recommended).toContain('Accept the starter contract in Contracts.');
    expect(unlocks).toHaveLength(2);
    expect(unlocks.join(' ')).toContain('Finish onboarding first');
  });

  it('shows the total step count', () => {
    expect(el.textContent).toContain(`/ ${TUTORIAL_STEPS.length} steps`);
  });

  it('renders colony support controls with the three core utility readouts', () => {
    const section = el.querySelector('[aria-label="Colony support controls"]');

    expect(section).not.toBeNull();
    expect(section?.textContent).toContain('Energy');
    expect(section?.textContent).toContain('Water');
    expect(section?.textContent).toContain('Oxygen');
    expect(section?.textContent).toContain('55 / 120');
    expect(section?.textContent).toContain('60 / 124');
    expect(section?.textContent).toContain('45 / 116');
    expect(section?.textContent).toContain('+3 energy / 20s · -1 energy');
    expect(section?.textContent).toContain('Upgrade adds +2 energy / 20s · +0 energy upkeep · +20 energy cap');
  });

  it('shows one upgrade button per utility track with current and next-level data', () => {
    const button = el.querySelector<HTMLButtonElement>('[data-testid="support-upgrade-energy"]');

    expect(button?.disabled).toBe(false);
    expect(button?.textContent).toContain('Upgrade');
    expect(el.querySelector('[aria-label="Colony support controls"]')?.textContent).toContain('Solar Array I active · Level I');
    expect(el.querySelector('[aria-label="Colony support controls"]')?.textContent).toContain('Next: Solar Array II · Level II · 70 credits');
  });

  it('upgrades a support track and then marks it as maxed', () => {
    const button = el.querySelector<HTMLButtonElement>('[data-testid="support-upgrade-energy"]');

    button?.click();
    fixture.detectChanges();

    const upgradedButton = el.querySelector<HTMLButtonElement>('[data-testid="support-upgrade-energy"]');

    expect(upgradedButton?.textContent).toContain('Maxed');
    expect(upgradedButton?.disabled).toBe(true);
    expect(el.querySelector('[aria-label="Colony support controls"]')?.textContent).toContain('Solar Array II active · Level II');
    expect(el.querySelector('[aria-label="Colony support controls"]')?.textContent).toContain('Max level reached.');
  });

  it('generates passive utilities from the preinstalled level i support after advancing the clock', () => {
    gameClock.tick(20);
    fixture.detectChanges();

    expect(gameState.getSnapshot().resources.values['water']).toBe(63);
    expect(gameState.getSnapshot().resources.values['oxygen']).toBe(47);
    expect(gameState.getSnapshot().resources.values['energy']).toBe(55);
    expect(el.querySelector('[aria-label="Colony support controls"]')?.textContent).toContain('63 / 124');
  });

  it('keeps the upgraded solar track net-positive even when energy starts empty', () => {
    const button = el.querySelector<HTMLButtonElement>('[data-testid="support-upgrade-energy"]');

    button?.click();
    gameState.updateResources((resources) => ({
      ...resources,
      values: {
        ...resources.values,
        energy: 0,
      },
    }));
    fixture.detectChanges();

    gameClock.tick(20);
    fixture.detectChanges();

    expect(gameState.getSnapshot().resources.values['energy']).toBe(2);
  });

  it('falls back colony support utility rows to zero when balances or caps are missing', () => {
    gameState.updateResources((resources) => {
      const { energy, water, oxygen, ...remainingValues } = resources.values;
      const { energy: energyCap, water: waterCap, oxygen: oxygenCap, ...remainingCaps } = resources.maxValues;

      void energy;
      void water;
      void oxygen;
      void energyCap;
      void waterCap;
      void oxygenCap;

      return {
        ...resources,
        values: remainingValues as typeof resources.values,
        maxValues: remainingCaps as typeof resources.maxValues,
      };
    });

    fixture.detectChanges();

    const utilityValues = Array.from(el.querySelectorAll('.command-center__support-utility strong')).map((node) => node.textContent?.trim());

    expect(utilityValues).toEqual(['0 / 0', '0 / 0', '0 / 0']);
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

  it('removes the starter progression card after the starter contract is completed', () => {
    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === 'contract_contract_starter_biofood_01'
          ? { ...contract, state: ContractState.Completed }
          : contract,
      ),
    );

    fixture.detectChanges();

    const unlockText = el.querySelector('[aria-label="Next unlocks"]')?.textContent ?? '';
    const recommended = el.querySelector('[data-testid="recommended-unlock"]')?.textContent ?? '';

    expect(unlockText).not.toContain('Complete Starter Protein Delivery');
    expect(recommended).toContain('Upgrade Water Recycler to Level II');
    expect(unlockText).toContain('Install Storage Bay II');
  });

  it('marks the starter progression as ready when the active contract cargo is available', () => {
    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === 'contract_contract_starter_biofood_01'
          ? { ...contract, state: ContractState.Active }
          : contract,
      ),
    );
    gameState.updateInventory((inventory) => ({
      ...inventory,
      items: {
        ...inventory.items,
        protein_leaf: 2,
      },
    }));

    fixture.detectChanges();

    const unlockText = el.querySelector('[data-testid="recommended-unlock"]')?.textContent ?? '';

    expect(unlockText).toContain('Ready now');
    expect(unlockText).toContain('Deliver the starter contract in Contracts.');
  });

  it('prioritizes the first infrastructure upgrade after onboarding is complete', () => {
    for (const step of TUTORIAL_STEPS) {
      tutorialService.completeStep(step.id);
    }
    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === 'contract_contract_starter_biofood_01'
          ? { ...contract, state: ContractState.Completed }
          : contract,
      ),
    );

    fixture.detectChanges();

    const recommended = el.querySelector('[data-testid="recommended-unlock"]')?.textContent ?? '';
    const secondaryUnlocks = Array.from(el.querySelectorAll('[data-testid="unlock-preview"]')).map((node) => node.textContent ?? '');

    expect(recommended).toContain('Upgrade Water Recycler to Level II');
    expect(recommended).toContain('Buy this upgrade in Colony Support.');
    expect(secondaryUnlocks.join(' ')).toContain('Install Storage Bay II');
    expect(secondaryUnlocks.join(' ')).toContain('Buy this upgrade in Storage.');
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

  it('installs a colony support upgrade and shows feedback', () => {
    const button = el.querySelector<HTMLButtonElement>('[data-testid="support-upgrade-energy"]');

    expect(button).not.toBeNull();

    button?.click();
    fixture.detectChanges();

    expect(gameState.getSnapshot().resources.values['credits']).toBe(80);
    expect(gameState.getSnapshot().resources.values['energy']).toBe(75);
    expect(gameState.getSnapshot().resources.maxValues['energy']).toBe(140);
    expect(el.querySelector('[data-testid="support-status"]')?.textContent).toContain('Solar Array II installed.');
  });

  it('shows an error message when trying to install an already purchased colony support upgrade', () => {
    const button = el.querySelector<HTMLButtonElement>('[data-testid="support-upgrade-energy"]');

    expect(button).not.toBeNull();

    button?.click();
    fixture.detectChanges();
    (fixture.componentInstance as unknown as {
      buyColonySupportUpgrade: (upgradeId: string, label: string) => void;
    }).buyColonySupportUpgrade('solar_array_ii', 'Solar Array II');
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="support-status"]')?.textContent).toContain('Solar Array II is already installed.');
  });

  it('triggers the emergency reserve once a vital utility has been depleted', () => {
    gameState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, water: 0 },
    }));
    fixture.detectChanges();

    const button = el.querySelector<HTMLButtonElement>('[data-testid="emergency-reserve-btn"]');

    expect(button?.disabled).toBe(false);

    button?.click();
    fixture.detectChanges();

    expect(gameState.getSnapshot().resources.values['credits']).toBe(135);
    expect(gameState.getSnapshot().resources.values['water']).toBe(8);
    expect(el.querySelector('[data-testid="support-status"]')?.textContent).toContain('Emergency Reserve dispatched.');
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
