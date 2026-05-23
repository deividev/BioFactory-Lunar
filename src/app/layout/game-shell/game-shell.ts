import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PanelType } from '../../core/enums';
import { GameStateService, ModuleSelectionService } from '../../core/services';
import { CommandCenter } from '../../features/command-center/command-center';
import { Contracts } from '../../features/contracts/contracts';
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

@Component({
  selector: 'app-game-shell',
  imports: [AlertsPanel, BottomNav, CommandCenter, Contracts, Greenhouse, HudTop, PhaserGame, Processing, Shipments, Storage],
  templateUrl: './game-shell.html',
  styleUrl: './game-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameShell {
  protected readonly panelType = PanelType;

  private readonly gameState = inject(GameStateService);
  private readonly moduleSelection = inject(ModuleSelectionService);
  private readonly phaserBridge = inject(PhaserBridgeService);

  protected readonly activePanel = computed(() => this.gameState.ui().activePanel);
  protected readonly activePanelLabel = computed(() => PANEL_LABELS[this.gameState.ui().activePanel]);
  protected readonly selectedModuleId = computed(() => this.gameState.ui().selectedModuleId ?? 'No module selected');

  constructor() {
    this.phaserBridge.phaserEvents$
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event.type === 'moduleSelected') {
          this.moduleSelection.selectModule(event.moduleId);
        }
      });
  }
}
