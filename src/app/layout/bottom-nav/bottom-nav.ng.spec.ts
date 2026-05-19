import { TestBed } from '@angular/core/testing';

import { PanelType } from '../../core/enums';
import { GameStateService } from '../../core/services';
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
});
