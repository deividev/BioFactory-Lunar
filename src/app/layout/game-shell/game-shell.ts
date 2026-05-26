import { ChangeDetectionStrategy, Component, computed, effect, inject, isDevMode, signal } from '@angular/core';
import { DEMO_STEAM_WISHLIST_LABEL, DEMO_STEAM_WISHLIST_URL } from '../../core/config/demo-links.config';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DEMO_COMPLETION_COPY, DEMO_MENU_COPY } from '../../core/data';
import { PanelType } from '../../core/enums';
import { DemoFlowService, ElectronBridgeService, GameStateService, ModuleSelectionService, type DemoObjectiveStatus, type DemoViewPhase } from '../../core/services';
import { CommandCenter } from '../../features/command-center/command-center';
import { Contracts } from '../../features/contracts/contracts';
import { ModuleLayoutDevPanel } from '../../features/dev/module-layout-dev-panel/module-layout-dev-panel';
import { Greenhouse } from '../../features/greenhouse/greenhouse';
import { Processing } from '../../features/processing/processing';
import { Shipments } from '../../features/shipments/shipments';
import { Storage } from '../../features/storage/storage';
import { PhaserBridgeService } from '../../game/bridge';
import { PhaserGame } from '../../game/phaser/phaser-game';
import { AlertsPanel } from '../alerts-panel/alerts-panel';
import { BottomNav } from '../bottom-nav/bottom-nav';
import { HudTop } from '../hud-top/hud-top';

const PANEL_LABELS: Readonly<Record<PanelType, string>> = {
  [PanelType.CommandCenter]: 'Command Center',
  [PanelType.Greenhouse]: 'Greenhouse',
  [PanelType.Processing]: 'Processing',
  [PanelType.Contracts]: 'Contracts',
  [PanelType.Shipping]: 'Shipments',
  [PanelType.Storage]: 'Storage',
  [PanelType.Research]: 'Research',
  [PanelType.Settings]: 'Settings',
};

type DemoPhaserCue = 'none' | 'objective' | 'completion';

function resolveDemoPhaserCue(viewPhase: DemoViewPhase, objectiveStatus: DemoObjectiveStatus): DemoPhaserCue {
  if (viewPhase === 'menu') {
    return 'none';
  }

  if (viewPhase === 'completed' || objectiveStatus === 'wishlist') {
    return 'completion';
  }

  return 'objective';
}

function dispatchDemoPhaserCue(phaserBridge: PhaserBridgeService, cue: DemoPhaserCue): void {
  if (cue === 'objective') {
    phaserBridge.playObjectivePulse();
    return;
  }

  if (cue === 'completion') {
    phaserBridge.playCompletionPulse();
    return;
  }

  phaserBridge.clearDemoPulse();
}

@Component({
  selector: 'app-game-shell',
  imports: [AlertsPanel, BottomNav, CommandCenter, Contracts, Greenhouse, HudTop, ModuleLayoutDevPanel, PhaserGame, Processing, Shipments, Storage],
  templateUrl: './game-shell.html',
  styleUrl: './game-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameShell {
  protected readonly panelType = PanelType;
  protected readonly demoMenuCopy = DEMO_MENU_COPY;
  protected readonly demoCompletionCopy = DEMO_COMPLETION_COPY;
  protected readonly devMode = isDevMode();
  protected readonly devToolsVisible = signal(true);

  private readonly gameState = inject(GameStateService);
  private readonly demoFlow = inject(DemoFlowService);
  private readonly electronBridge = inject(ElectronBridgeService);
  private readonly moduleSelection = inject(ModuleSelectionService);
  private readonly phaserBridge = inject(PhaserBridgeService);
  private readonly demoPulseSyncReady = signal(false);
  private lastDemoPhaserCue?: DemoPhaserCue;

  protected readonly activePanel = computed(() => this.gameState.ui().activePanel);
  protected readonly activePanelLabel = computed(() => PANEL_LABELS[this.gameState.ui().activePanel]);
  protected readonly selectedModuleId = computed(() => this.gameState.ui().selectedModuleId);
  protected readonly viewPhase = this.demoFlow.viewPhase;
  protected readonly hasContinueOption = this.demoFlow.hasContinueOption;
  protected readonly demoObjective = this.demoFlow.objectiveSummary;
  protected readonly steamWishlistLabel = DEMO_STEAM_WISHLIST_LABEL;
  protected readonly steamWishlistUrl = DEMO_STEAM_WISHLIST_URL;

  constructor() {
    this.phaserBridge.phaserEvents$
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event.type === 'moduleSelected') {
          this.moduleSelection.selectModule(event.moduleId);
        }
      });

    effect(() => {
      if (!this.demoPulseSyncReady()) {
        return;
      }

      const nextCue = resolveDemoPhaserCue(this.viewPhase(), this.demoObjective().status);

      if (nextCue === this.lastDemoPhaserCue) {
        return;
      }

      this.lastDemoPhaserCue = nextCue;
      dispatchDemoPhaserCue(this.phaserBridge, nextCue);
    });
  }

  ngOnInit(): void {
    void this.demoFlow.bootstrap().finally(() => {
      this.demoPulseSyncReady.set(true);
    });
  }

  ngOnDestroy(): void {
    this.demoFlow.cleanup();
  }

  protected startDemo(): void {
    this.demoFlow.startNewDemo();
  }

  protected continueDemo(): void {
    this.demoFlow.continueDemo();
  }

  protected returnToMenu(): void {
    this.demoFlow.returnToMenu();
  }

  protected openSteamWishlist(): void {
    if (this.electronBridge.isElectron()) {
      void this.electronBridge.openExternalUrl(this.steamWishlistUrl);
      return;
    }

    globalThis.open?.(this.steamWishlistUrl, '_blank', 'noopener,noreferrer');
  }

  protected toggleDevTools(): void {
    this.devToolsVisible.update((visible) => !visible);
  }
}
