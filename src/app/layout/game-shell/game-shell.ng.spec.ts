import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEMO_STEAM_WISHLIST_URL } from '../../core/config/demo-links.config';
import { DEMO_FINALE_CONTRACT_INSTANCE_ID, TUTORIAL_STEPS } from '../../core/data';
import { ContractState, PanelType } from '../../core/enums';
import { DEFAULT_SAVE_STORAGE_KEY, GameStateService, ResourceService } from '../../core/services';
import { PhaserBridgeService, type AngularToPhaserEvent } from '../../game/bridge';
import { PHASER_GAME_FACTORY, PhaserGame } from '../../game/phaser/phaser-game';
import { GameShell } from './game-shell';

@Component({
  selector: 'app-phaser-game',
  template: '<div aria-label="Stub Phaser visual layer">Stub Phaser layer</div>'
})
class StubPhaserGame {}

function createDemoSaveData(
  phase: 'guided_run' | 'completed',
  configure?: (state: GameStateService) => void,
): Record<string, unknown> {
  const state = new GameStateService();
  configure?.(state);

  return {
    ...state.toSaveData('2026-05-24T12:30:00.000Z'),
    demo: {
      phase,
      objectiveContractInstanceId: DEMO_FINALE_CONTRACT_INSTANCE_ID,
      guidanceMode: 'tutorial',
      completedAt: phase === 'completed' ? '2026-05-24T12:45:00.000Z' : undefined,
      optionalScopes: { event: false, robot: false },
    },
  };
}

async function flushShell(fixture: ReturnType<typeof TestBed.createComponent<GameShell>>): Promise<void> {
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function clickButton(fixture: ReturnType<typeof TestBed.createComponent<GameShell>>, label: string): void {
  const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((candidate) =>
    candidate.textContent?.includes(label),
  );

  expect(button).toBeTruthy();
  button?.click();
  fixture.detectChanges();
}

async function createShellWithStubbedPhaser(): Promise<{
  readonly bridge: PhaserBridgeService;
  readonly commands: AngularToPhaserEvent[];
  readonly fixture: ReturnType<typeof TestBed.createComponent<GameShell>>;
  readonly gameState: GameStateService;
}> {
  await TestBed.configureTestingModule({
    imports: [GameShell]
  })
    .overrideComponent(GameShell, {
      remove: { imports: [PhaserGame] },
      add: { imports: [StubPhaserGame] }
    })
    .compileComponents();

  const bridge = TestBed.inject(PhaserBridgeService);
  const commands: AngularToPhaserEvent[] = [];

  bridge.angularEvents$.subscribe((event) => commands.push(event));

  const fixture = TestBed.createComponent(GameShell);
  fixture.detectChanges();
  await flushShell(fixture);

  return {
    bridge,
    commands,
    fixture,
    gameState: TestBed.inject(GameStateService)
  };
}

async function startDemo(fixture: ReturnType<typeof TestBed.createComponent<GameShell>>): Promise<void> {
  clickButton(fixture, 'Start Demo');
  await flushShell(fixture);
}

async function continueDemo(fixture: ReturnType<typeof TestBed.createComponent<GameShell>>): Promise<void> {
  clickButton(fixture, 'Continue Demo');
  await flushShell(fixture);
}

afterEach(() => {
  localStorage.removeItem(DEFAULT_SAVE_STORAGE_KEY);
});

describe('GameShell Angular component', () => {
  it('shows the demo entry menu before gameplay when no save exists', async () => {
    const { commands, fixture } = await createShellWithStubbedPhaser();

    const menu = fixture.nativeElement.querySelector('[aria-label="Demo entry menu"]') as HTMLElement | null;
    const statusCard = fixture.nativeElement.querySelector('.demo-screen__status-card') as HTMLElement | null;
    const bottomNav = fixture.nativeElement.querySelector('[aria-label="Main panel navigation"]') as HTMLElement | null;

    expect(menu?.textContent).toContain('Start Demo');
    expect(menu?.textContent).not.toContain('Continue Demo');
    expect(statusCard?.getAttribute('data-state')).toBe('blocked');
    expect(statusCard?.textContent).toContain('Blocked');
    expect(statusCard?.textContent).toContain('Lunar Habitat Kit');
    expect(bottomNav).toBeNull();
    expect(commands.at(-1)).toEqual({ type: 'clearDemoPulse' });
  });

  it('keeps a restored guided run at the menu until Continue Demo is chosen', async () => {
    localStorage.setItem(
      DEFAULT_SAVE_STORAGE_KEY,
      JSON.stringify(
        createDemoSaveData('guided_run', (state) => {
          state.updateResources((resources) => ({
            ...resources,
            values: { ...resources.values, credits: 480, water: 75 },
          }));
        }),
      ),
    );

    const { fixture, gameState } = await createShellWithStubbedPhaser();

    const menu = fixture.nativeElement.querySelector('[aria-label="Demo entry menu"]') as HTMLElement | null;
    const bottomNav = fixture.nativeElement.querySelector('[aria-label="Main panel navigation"]') as HTMLElement | null;

    expect(menu?.textContent).toContain('Continue Demo');
    expect(bottomNav).toBeNull();
    expect(gameState.getSnapshot().resources.values['credits']).toBe(480);
  });

  it('shows the actionable objective state on the menu when onboarding is already complete', async () => {
    localStorage.setItem(
      DEFAULT_SAVE_STORAGE_KEY,
      JSON.stringify(
        createDemoSaveData('guided_run', (state) => {
          state.updateTutorial(() => ({
            completedStepIds: TUTORIAL_STEPS.map((step) => step.id),
            activeStepId: undefined,
          }));
        }),
      ),
    );

    const { fixture } = await createShellWithStubbedPhaser();
    const statusCard = fixture.nativeElement.querySelector('.demo-screen__status-card') as HTMLElement | null;

    expect(statusCard?.getAttribute('data-state')).toBe('actionable');
    expect(statusCard?.textContent).toContain('Actionable');
    expect(statusCard?.textContent).toContain('Lunar Habitat Kit');
  });

  it('shows the completable objective state on the menu when finale cargo is ready', async () => {
    localStorage.setItem(
      DEFAULT_SAVE_STORAGE_KEY,
      JSON.stringify(
        createDemoSaveData('guided_run', (state) => {
          state.updateTutorial(() => ({
            completedStepIds: TUTORIAL_STEPS.map((step) => step.id),
            activeStepId: undefined,
          }));
          state.updateContracts((contracts) =>
            contracts.map((contract) =>
              contract.id === DEMO_FINALE_CONTRACT_INSTANCE_ID
                ? { ...contract, state: ContractState.Active }
                : contract,
            ),
          );
          state.updateInventory((inventory) => ({
            ...inventory,
            items: {
              ...inventory.items,
              biofood_pack: 1,
              nutrient_mix: 1,
              glow_pigment: 1,
            },
          }));
        }),
      ),
    );

    const { fixture } = await createShellWithStubbedPhaser();
    const statusCard = fixture.nativeElement.querySelector('.demo-screen__status-card') as HTMLElement | null;

    expect(statusCard?.getAttribute('data-state')).toBe('completable');
    expect(statusCard?.textContent).toContain('Completable');
    expect(statusCard?.textContent).toContain('Lunar Habitat Kit');
  });

  it('shows the demo completion shell when the restored save is already completed', async () => {
    localStorage.setItem(DEFAULT_SAVE_STORAGE_KEY, JSON.stringify(createDemoSaveData('completed')));

    const { fixture } = await createShellWithStubbedPhaser();
    const completion = fixture.nativeElement.querySelector('[aria-label="Demo completion screen"]') as HTMLElement | null;
    const statusCard = fixture.nativeElement.querySelector('.demo-screen__status-card') as HTMLElement | null;

    expect(completion?.textContent).toContain('Wishlist');
    expect(completion?.textContent).toContain('Lunar Habitat Kit');
    expect(completion?.textContent).toContain('Wishlist');
    expect(completion?.textContent).toContain('Wishlist on Steam');
    expect(completion?.textContent).toContain('Continue Demo');
    expect(completion?.textContent).toContain('Return to Menu');
    expect(statusCard?.getAttribute('data-state')).toBe('wishlist');
  });

  it('opens the configured Steam wishlist URL from the completion screen in browser mode', async () => {
    localStorage.setItem(DEFAULT_SAVE_STORAGE_KEY, JSON.stringify(createDemoSaveData('completed')));
    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);

    const { fixture } = await createShellWithStubbedPhaser();

    clickButton(fixture, 'Wishlist on Steam');

    expect(openSpy).toHaveBeenCalledWith(DEMO_STEAM_WISHLIST_URL, '_blank', 'noopener,noreferrer');
  });

  it('starts the guided run from the menu and renders the gameplay shell', async () => {
    const { fixture } = await createShellWithStubbedPhaser();

    await startDemo(fixture);

    const operations = fixture.nativeElement.querySelector('[aria-label="State-backed operations"]') as HTMLElement | null;
    const resourceHud = fixture.nativeElement.querySelector('header[aria-label="Resource HUD"]') as HTMLElement | null;
    const activePanel = fixture.nativeElement.querySelector('[aria-label="Active module panel"]') as HTMLElement | null;
    const bottomNav = fixture.nativeElement.querySelector('[aria-label="Main panel navigation"]') as HTMLElement | null;
    const visualLayer = fixture.nativeElement.querySelector('[aria-label="Visual layer placeholder"]') as HTMLElement | null;

    expect(operations).toBeInstanceOf(HTMLElement);
    expect(resourceHud?.textContent).toContain('Credits');
    expect(activePanel?.textContent).toContain('Command Center');
    expect(bottomNav?.textContent).toContain('Contracts');
    expect(visualLayer?.textContent).toContain('Stub Phaser layer');
    expect(fixture.nativeElement.textContent).not.toContain('Start Demo');
  });

  it('shows a dev-tools toggle and lets the panel be hidden or shown during the guided run', async () => {
    const { fixture } = await createShellWithStubbedPhaser();

    await startDemo(fixture);

    const toggle = fixture.nativeElement.querySelector('[data-testid="dev-tools-toggle"]') as HTMLButtonElement | null;

    expect(toggle?.textContent).toContain('Hide Dev Tools');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('app-module-layout-dev-panel')).toBeTruthy();

    toggle?.click();
    fixture.detectChanges();

    expect(toggle?.textContent).toContain('Show Dev Tools');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('app-module-layout-dev-panel')).toBeNull();

    toggle?.click();
    fixture.detectChanges();

    expect(toggle?.textContent).toContain('Hide Dev Tools');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('app-module-layout-dev-panel')).toBeTruthy();
  });

  it('continues a restored guided run into gameplay with its saved state intact', async () => {
    localStorage.setItem(
      DEFAULT_SAVE_STORAGE_KEY,
      JSON.stringify(
        createDemoSaveData('guided_run', (state) => {
          state.updateResources((resources) => ({
            ...resources,
            values: { ...resources.values, credits: 480, water: 75 },
          }));
          state.updateInventory((inventory) => ({
            ...inventory,
            items: { ...inventory.items, biofood_pack: 4 },
          }));
        }),
      ),
    );

    const { commands, fixture, gameState } = await createShellWithStubbedPhaser();

    await continueDemo(fixture);

    expect(gameState.getSnapshot().resources.values).toEqual({ credits: 480, energy: 100, water: 75, nutrients: 20, oxygen: 100 });
    expect(gameState.getSnapshot().inventory.items).toEqual({ biofood_pack: 4 });
    expect(fixture.nativeElement.textContent).toContain('480');
    expect(fixture.nativeElement.textContent).toContain('75 / 100');
    expect(commands.at(-1)).toEqual({ type: 'playObjectivePulse' });
  });

  it('emits a completion pulse for completed saves and clears it when returning to the menu', async () => {
    localStorage.setItem(DEFAULT_SAVE_STORAGE_KEY, JSON.stringify(createDemoSaveData('completed')));

    const { commands, fixture } = await createShellWithStubbedPhaser();

    expect(commands.at(-1)).toEqual({ type: 'playCompletionPulse' });

    clickButton(fixture, 'Return to Menu');
    await flushShell(fixture);

    expect(commands.at(-1)).toEqual({ type: 'clearDemoPulse' });
    expect(fixture.nativeElement.querySelector('[aria-label="Demo entry menu"]')?.textContent).toContain('Continue Demo');
  });

  it('reflects resource state changes in the HUD during gameplay', async () => {
    const { fixture } = await createShellWithStubbedPhaser();
    const resourceService = TestBed.inject(ResourceService);

    await startDemo(fixture);

    resourceService.add('credits', 25);
    fixture.detectChanges();

    expect(resourceService.getAmount('credits')).toBe(225);
    expect(fixture.nativeElement.textContent).toContain('225');
  });

  it('shows manual save and load feedback through the alerts panel during gameplay', async () => {
    const { fixture } = await createShellWithStubbedPhaser();

    await startDemo(fixture);

    clickButton(fixture, 'Save');
    await flushShell(fixture);
    expect(fixture.nativeElement.querySelector('[aria-label="Alerts panel"]')?.textContent).toContain('Game saved.');

    clickButton(fixture, 'Load');
    await flushShell(fixture);
    expect(fixture.nativeElement.querySelector('[aria-label="Alerts panel"]')?.textContent).toContain('Game loaded.');
  });

  it('routes Phaser module selections to the mapped Angular panel proof during guided gameplay', async () => {
    const { bridge, fixture, gameState } = await createShellWithStubbedPhaser();
    await startDemo(fixture);

    const selections: ReadonlyArray<{
      readonly moduleId: string;
      readonly panel: PanelType;
      readonly label: string;
    }> = [
      { moduleId: 'module_greenhouse_basic_01', panel: PanelType.Greenhouse, label: 'Greenhouse' },
      { moduleId: 'module_processing_basic_01', panel: PanelType.Processing, label: 'Processing' },
      { moduleId: 'module_shipping_hangar_basic_01', panel: PanelType.Shipping, label: 'Shipments' },
      { moduleId: 'module_storage_basic_01', panel: PanelType.Storage, label: 'Storage' }
    ];

    for (const selection of selections) {
      bridge.emitFromPhaser({ type: 'moduleSelected', moduleId: selection.moduleId });
      fixture.detectChanges();

      const activePanel = fixture.nativeElement.querySelector('[aria-label="Active module panel"]') as HTMLElement | null;
      const activeStatePanel = fixture.nativeElement.querySelector('[aria-label="Active state panel"]') as HTMLElement | null;

      expect(activePanel?.textContent).toContain(selection.label);
      expect(activePanel?.textContent).toContain(selection.moduleId);
      expect(activeStatePanel?.textContent).toContain(selection.label);
      expect(gameState.getSnapshot().ui).toEqual({
        activePanel: selection.panel,
        selectedModuleId: selection.moduleId
      });
    }
  });

  it('opens placeholder panels from bottom navigation with one active panel in UI state during gameplay', async () => {
    const { fixture, gameState } = await createShellWithStubbedPhaser();
    await startDemo(fixture);

    clickButton(fixture, 'Contracts');
    await flushShell(fixture);

    const activePanel = fixture.nativeElement.querySelector('[aria-label="Active module panel"]') as HTMLElement | null;
    const activeStatePanel = fixture.nativeElement.querySelector('[aria-label="Active state panel"]') as HTMLElement | null;

    expect(gameState.getSnapshot().ui).toEqual({ activePanel: PanelType.Contracts });
    expect(activePanel?.textContent).toContain('Contracts');
    expect(activeStatePanel?.textContent).toContain('Starter Biofood Delivery');
  });

  it('keeps storage selection state-backed without mutating inventory during gameplay', async () => {
    const { bridge, fixture, gameState } = await createShellWithStubbedPhaser();
    await startDemo(fixture);
    const initialInventory = gameState.getSnapshot().inventory;

    bridge.emitFromPhaser({ type: 'moduleSelected', moduleId: 'module_storage_basic_01' });
    fixture.detectChanges();

    const activePanel = fixture.nativeElement.querySelector('[aria-label="Active module panel"]') as HTMLElement | null;
    const storage = fixture.nativeElement.querySelector('aside[aria-label="Storage inventory"]') as HTMLElement | null;

    expect(activePanel?.textContent).toContain('Storage');
    expect(activePanel?.textContent).toContain('module_storage_basic_01');
    expect(storage?.textContent).toContain('Protein Leaf Seed');
    expect(storage?.textContent).toContain('0');
    expect(gameState.getSnapshot().inventory).toEqual(initialInventory);
    expect(gameState.getSnapshot().ui).toEqual({
      activePanel: PanelType.Storage,
      selectedModuleId: 'module_storage_basic_01'
    });
  });

  it('returns a completed session to the menu while keeping Continue Demo available', async () => {
    localStorage.setItem(DEFAULT_SAVE_STORAGE_KEY, JSON.stringify(createDemoSaveData('completed')));

    const { fixture } = await createShellWithStubbedPhaser();

    clickButton(fixture, 'Return to Menu');
    await flushShell(fixture);

    const menu = fixture.nativeElement.querySelector('[aria-label="Demo entry menu"]') as HTMLElement | null;
    expect(menu?.textContent).toContain('Continue Demo');
  });

  it('keeps Phaser demo pulse commands visual-only by leaving Angular state untouched', async () => {
    const { bridge, fixture, gameState } = await createShellWithStubbedPhaser();
    await startDemo(fixture);

    const before = gameState.getSnapshot();

    bridge.playObjectivePulse();
    bridge.playCompletionPulse();
    bridge.clearDemoPulse();
    fixture.detectChanges();

    expect(gameState.getSnapshot()).toEqual(before);
  });

  it('renders the real Phaser host when a safe Phaser factory is provided and gameplay starts', async () => {
    await TestBed.configureTestingModule({
      imports: [GameShell],
      providers: [
        {
          provide: PHASER_GAME_FACTORY,
          useValue: () => ({ destroy: () => undefined })
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(GameShell);
    fixture.detectChanges();
    await flushShell(fixture);
    await startDemo(fixture);

    const phaserHost = fixture.nativeElement.querySelector('#phaser-container') as HTMLElement | null;
    expect(phaserHost?.getAttribute('aria-label')).toBe('Phaser visual layer placeholder');
  });
});
