import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PanelType } from '../../core/enums';
import { GameStateService, ModuleSelectionService } from '../../core/services';
import { Storage } from '../../features/storage/storage';
import { PhaserBridgeService } from '../../game/bridge';
import { PhaserGame } from '../../game/phaser/phaser-game';
import { HudTop } from '../hud-top/hud-top';

const PANEL_LABELS: Readonly<Record<PanelType, string>> = {
  [PanelType.CommandCenter]: 'Command Center',
  [PanelType.Greenhouse]: 'Greenhouse',
  [PanelType.Processing]: 'Processing',
  [PanelType.Shipping]: 'Shipping',
  [PanelType.Storage]: 'Storage',
  [PanelType.Research]: 'Research',
  [PanelType.Settings]: 'Settings',
};

@Component({
  selector: 'app-game-shell',
  imports: [HudTop, Storage, PhaserGame],
  templateUrl: './game-shell.html',
  styleUrl: './game-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameShell {
  private readonly gameState = inject(GameStateService);
  private readonly moduleSelection = inject(ModuleSelectionService);
  private readonly phaserBridge = inject(PhaserBridgeService);

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
