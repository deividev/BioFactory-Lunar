import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PanelType } from '../../core/enums';
import { DEFAULT_SAVE_STORAGE_KEY, GameStateService, ResourceService } from '../../core/services';
import { PhaserBridgeService } from '../../game/bridge';
import { PHASER_GAME_FACTORY, PhaserGame } from '../../game/phaser/phaser-game';
import { GameShell } from './game-shell';

@Component({
  selector: 'app-phaser-game',
  template: '<div aria-label="Stub Phaser visual layer">Stub Phaser layer</div>'
})
class StubPhaserGame {}

async function createShellWithStubbedPhaser(): Promise<{
  readonly bridge: PhaserBridgeService;
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

  const fixture = TestBed.createComponent(GameShell);
  fixture.detectChanges();

  return {
    bridge: TestBed.inject(PhaserBridgeService),
    fixture,
    gameState: TestBed.inject(GameStateService)
  };
}

describe('GameShell Angular component', () => {
  it('composes the state-backed HUD and preserves the Phaser visual host', async () => {
    const { fixture } = await createShellWithStubbedPhaser();
    const text = fixture.nativeElement.textContent;
    const shell = fixture.nativeElement.querySelector('[aria-label="Biofactory Lunar game shell"]') as HTMLElement | null;
    const operations = fixture.nativeElement.querySelector('[aria-label="State-backed operations"]') as HTMLElement | null;
    const resourceHud = fixture.nativeElement.querySelector('header[aria-label="Resource HUD"]') as HTMLElement | null;
    const activePanel = fixture.nativeElement.querySelector('[aria-label="Active module panel"]') as HTMLElement | null;
    const activeStatePanel = fixture.nativeElement.querySelector('[aria-label="Active state panel"]') as HTMLElement | null;
    const alertsPanel = fixture.nativeElement.querySelector('[aria-label="Alerts panel"]') as HTMLElement | null;
    const bottomNav = fixture.nativeElement.querySelector('[aria-label="Main panel navigation"]') as HTMLElement | null;
    const visualLayer = fixture.nativeElement.querySelector('[aria-label="Visual layer placeholder"]') as HTMLElement | null;

    expect(shell).toBeInstanceOf(HTMLElement);
    expect(operations).toBeInstanceOf(HTMLElement);
    expect(resourceHud?.textContent).toContain('Credits');
    expect(resourceHud?.textContent).toContain('Day 1');
    expect(resourceHud?.textContent).toContain('Speed x1');
    expect(activePanel?.textContent).toContain('Command Center');
    expect(activeStatePanel?.textContent).toContain('Command center placeholder online');
    expect(alertsPanel?.textContent).toContain('No active alerts.');
    expect(bottomNav?.textContent).toContain('Contracts');
    expect(visualLayer?.textContent).toContain('Stub Phaser layer');
    expect(text).toMatch(/Biofactory\s+Lunar/);
    expect(text).not.toContain('HUD placeholder online');
    expect(text).not.toContain('Angular shell ready');
    expect(text).toContain('Credits');
    expect(text).toContain('200');
    expect(text).toContain('Game clock');
    expect(text).toContain('00:00');
    expect(text).toContain('Command center placeholder online');
    expect(text).toContain('Command');
    expect(text).toContain('Stub Phaser layer');
  });

  it('lets HUD actions update resource state through ResourceService inside the shell', async () => {
    const { fixture } = await createShellWithStubbedPhaser();
    const resourceService = TestBed.inject(ResourceService);
    const addSpy = vi.spyOn(resourceService, 'add');

    const collectCredits = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((button) =>
      button.textContent?.includes('Collect 25 credits'),
    );

    expect(collectCredits).toBeTruthy();

    collectCredits?.click();
    fixture.detectChanges();

    expect(addSpy).toHaveBeenCalledWith('credits', 25);
    expect(resourceService.getAmount('credits')).toBe(225);
    expect(fixture.nativeElement.textContent).toContain('225');
    expect(fixture.nativeElement.textContent).toContain('Stub Phaser layer');
  });

  it('shows manual save and load feedback through the alerts panel', async () => {
    localStorage.removeItem(DEFAULT_SAVE_STORAGE_KEY);
    const { fixture } = await createShellWithStubbedPhaser();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    const saveButton = buttons.find((button) => button.textContent?.trim() === 'Save');
    const loadButton = buttons.find((button) => button.textContent?.trim() === 'Load');

    expect(saveButton).toBeTruthy();
    expect(loadButton).toBeTruthy();

    saveButton?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Alerts panel"]')?.textContent).toContain('Game saved.');

    loadButton?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Alerts panel"]')?.textContent).toContain('Game loaded.');
  });

  it('restores the latest saved state automatically when the shell boots', async () => {
    const bootstrapState = new GameStateService();
    bootstrapState.updateResources((resources) => ({
      ...resources,
      values: { ...resources.values, credits: 480, water: 75 },
    }));
    bootstrapState.updateInventory((inventory) => ({
      ...inventory,
      items: { ...inventory.items, biofood_pack: 4 },
    }));
    localStorage.setItem(DEFAULT_SAVE_STORAGE_KEY, JSON.stringify(bootstrapState.toSaveData('2026-05-19T12:30:00.000Z')));

    const { fixture, gameState } = await createShellWithStubbedPhaser();

    expect(gameState.getSnapshot().resources.values).toEqual({ credits: 480, energy: 100, water: 75, nutrients: 20 });
    expect(gameState.getSnapshot().inventory.items).toEqual({ seed_protein_leaf: 2, biofood_pack: 4 });
    expect(fixture.nativeElement.textContent).toContain('480');
    expect(fixture.nativeElement.textContent).toContain('75 / 100');

    localStorage.removeItem(DEFAULT_SAVE_STORAGE_KEY);
  });

  it('routes Phaser module selections to the mapped Angular panel proof', async () => {
    const { bridge, fixture, gameState } = await createShellWithStubbedPhaser();
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

  it('opens placeholder panels from bottom navigation with one active panel in UI state', async () => {
    const { fixture, gameState } = await createShellWithStubbedPhaser();
    const contractsButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((button) =>
      button.textContent?.includes('Contracts'),
    );

    contractsButton?.click();
    fixture.detectChanges();

    const activePanel = fixture.nativeElement.querySelector('[aria-label="Active module panel"]') as HTMLElement | null;
    const activeStatePanel = fixture.nativeElement.querySelector('[aria-label="Active state panel"]') as HTMLElement | null;

    expect(gameState.getSnapshot().ui).toEqual({ activePanel: PanelType.Contracts });
    expect(activePanel?.textContent).toContain('Contracts');
    expect(activeStatePanel?.textContent).toContain('Starter Biofood Delivery');
    expect(activeStatePanel?.textContent).not.toContain('Storage placeholder online');
  });

  it('keeps storage selection state-backed without mutating inventory', async () => {
    const { bridge, fixture, gameState } = await createShellWithStubbedPhaser();
    const initialInventory = gameState.getSnapshot().inventory;

    bridge.emitFromPhaser({ type: 'moduleSelected', moduleId: 'module_storage_basic_01' });
    fixture.detectChanges();

    const activePanel = fixture.nativeElement.querySelector('[aria-label="Active module panel"]') as HTMLElement | null;
    const storage = fixture.nativeElement.querySelector('aside[aria-label="Storage inventory"]') as HTMLElement | null;

    expect(activePanel?.textContent).toContain('Storage');
    expect(activePanel?.textContent).toContain('module_storage_basic_01');
    expect(storage?.textContent).toContain('Protein Leaf Seed');
    expect(storage?.textContent).toContain('2');
    expect(gameState.getSnapshot().inventory).toEqual(initialInventory);
    expect(gameState.getSnapshot().ui).toEqual({
      activePanel: PanelType.Storage,
      selectedModuleId: 'module_storage_basic_01'
    });
  });

  it('renders the real Phaser host when a safe Phaser factory is provided', async () => {
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

    const phaserHost = fixture.nativeElement.querySelector('#phaser-container') as HTMLElement | null;
    expect(phaserHost?.getAttribute('aria-label')).toBe('Phaser visual layer placeholder');
  });
});
