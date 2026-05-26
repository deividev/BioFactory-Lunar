import { TestBed } from '@angular/core/testing';

import { GameSpeed, PanelType } from '../../core/enums';
import { GameClockService, GameStateService, SaveService } from '../../core/services';
import { PhaserBridgeService, type AngularToPhaserEvent } from '../../game/bridge';
import { BottomNav } from './bottom-nav';

describe('BottomNav Angular component', () => {
  async function renderNav() {
    await TestBed.configureTestingModule({
      imports: [BottomNav],
    }).compileComponents();

    const fixture = TestBed.createComponent(BottomNav);
    const gameState = TestBed.inject(GameStateService);
    const phaserBridge = TestBed.inject(PhaserBridgeService);
    const commands: AngularToPhaserEvent[] = [];

    phaserBridge.angularEvents$.subscribe((event) => commands.push(event));
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    return { commands, fixture, gameState };
  }

  it('renders milestone 6 navigation entries and marks command as active by default', async () => {
    const { fixture } = await renderNav();
    const text = fixture.nativeElement.textContent;
    const active = fixture.nativeElement.querySelector('[aria-current="page"]') as HTMLElement | null;

    expect(text).toContain('Command');
    expect(text).toContain('Greenhouse');
    expect(text).toContain('Processing');
    expect(text).toContain('Contracts');
    expect(text).toContain('Shipments');
    expect(text).toContain('Storage');
    expect(active?.textContent).toContain('Command');
  });

  it('opens a single active panel and clears transient Phaser selection when navigating', async () => {
    const { commands, fixture, gameState } = await renderNav();
    gameState.updateUi((ui) => ({
      ...ui,
      activePanel: PanelType.Greenhouse,
      selectedModuleId: 'module_greenhouse_basic_01',
    }));
    fixture.detectChanges();

    const contractsButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((button) =>
      button.textContent?.includes('Contracts'),
    );

    contractsButton?.click();
    fixture.detectChanges();

    expect(gameState.getSnapshot().ui).toEqual({ activePanel: PanelType.Contracts });
    expect(commands).toContainEqual({ type: 'clearHighlight' });
    expect(fixture.nativeElement.querySelector('[aria-current="page"]')?.textContent).toContain('Contracts');
  });

  it('returns to command center when the active non-command panel is selected again', async () => {
    const { fixture, gameState } = await renderNav();

    const storageButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((button) =>
      button.textContent?.includes('Storage'),
    );

    storageButton?.click();
    storageButton?.click();
    fixture.detectChanges();

    expect(gameState.getSnapshot().ui).toEqual({ activePanel: PanelType.CommandCenter });
  });

  it('renders the simulation controls on the right side of the footer', async () => {
    const { fixture } = await renderNav();
    const text = fixture.nativeElement.textContent ?? '';

    expect(fixture.nativeElement.querySelector('.bottom-nav__sim-controls')).toBeInstanceOf(HTMLElement);
    expect(text).toContain('Day 1');
    expect(text).toContain('00:00:00');
    expect(text).toContain('Speed x1');
    expect(text).toContain('Pause');
    expect(text).toContain('Resume');
    expect(text).toContain('x1');
    expect(text).toContain('x2');
    expect(text).toContain('x4');
    expect(text).toContain('Save');
    expect(text).toContain('Load');
  });

  it('routes manual save and load controls through SaveService and alert state', async () => {
    const { fixture, gameState } = await renderNav();
    const saveService = TestBed.inject(SaveService);
    const saveSpy = vi.spyOn(saveService, 'saveGame');
    const loadSpy = vi.spyOn(saveService, 'loadGame');

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Save'))?.click();
    fixture.detectChanges();

    expect(saveSpy).toHaveBeenCalledOnce();
    expect(gameState.getSnapshot().alerts.at(-1)?.message).toBe('Game saved.');

    buttons.find((button) => button.textContent?.includes('Load'))?.click();
    fixture.detectChanges();

    expect(loadSpy).toHaveBeenCalledOnce();
    expect(gameState.getSnapshot().alerts.at(-1)?.message).toBe('Game loaded.');
  });

  it('routes clock controls through GameClockService and rerenders the active speed', async () => {
    const { fixture } = await renderNav();
    const gameClock = TestBed.inject(GameClockService);
    const setSpeedSpy = vi.spyOn(gameClock, 'setSpeed');
    const pauseSpy = vi.spyOn(gameClock, 'pause');
    const resumeSpy = vi.spyOn(gameClock, 'resume');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

    buttons.find((button) => button.textContent?.includes('x2'))?.click();
    fixture.detectChanges();
    expect(setSpeedSpy).toHaveBeenCalledWith(GameSpeed.X2);
    expect(fixture.nativeElement.textContent ?? '').toContain('Speed x2');

    buttons.find((button) => button.textContent?.includes('Pause'))?.click();
    fixture.detectChanges();
    expect(pauseSpy).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent ?? '').toContain('Speed paused');

    buttons.find((button) => button.textContent?.includes('Resume'))?.click();
    fixture.detectChanges();
    expect(resumeSpy).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent ?? '').toContain('Speed x1');
  });

  it('keeps runtime bootstrap ownership out of the footer lifecycle', async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNav],
    }).compileComponents();

    const gameClock = TestBed.inject(GameClockService);
    const saveService = TestBed.inject(SaveService);
    const startSpy = vi.spyOn(gameClock, 'start');
    const stopSpy = vi.spyOn(gameClock, 'stop');
    const restoreSpy = vi.spyOn(saveService, 'restoreLatestGame');
    const autosaveStartSpy = vi.spyOn(saveService, 'startAutosave');
    const autosaveStopSpy = vi.spyOn(saveService, 'stopAutosave');

    const fixture = TestBed.createComponent(BottomNav);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(restoreSpy).not.toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();
    expect(autosaveStartSpy).not.toHaveBeenCalled();

    fixture.destroy();

    expect(stopSpy).not.toHaveBeenCalled();
    expect(autosaveStopSpy).not.toHaveBeenCalled();
  });
});
