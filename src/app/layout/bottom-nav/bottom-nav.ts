import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit } from '@angular/core';

import { ACTION_ICON_PATHS, STATE_ICON_PATHS } from '../../core/data';
import { GameSpeed, PanelType } from '../../core/enums';
import type { UIState } from '../../core/models';
import { GameClockService, GameStateService, SaveService } from '../../core/services';
import { PhaserBridgeService } from '../../game/bridge';

interface BottomNavItem {
  readonly panel: PanelType;
  readonly label: string;
  readonly iconSrc: string;
}

interface BottomNavClockView {
  readonly dayLabel: string;
  readonly timeLabel: string;
  readonly speedLabel: string;
}

const BOTTOM_NAV_ITEMS: readonly BottomNavItem[] = [
  { panel: PanelType.CommandCenter, label: 'Command', iconSrc: STATE_ICON_PATHS.success },
  { panel: PanelType.Greenhouse, label: 'Greenhouse', iconSrc: ACTION_ICON_PATHS.plant },
  { panel: PanelType.Processing, label: 'Processing', iconSrc: ACTION_ICON_PATHS.process },
  { panel: PanelType.Contracts, label: 'Contracts', iconSrc: ACTION_ICON_PATHS.contracts },
  { panel: PanelType.Shipping, label: 'Shipments', iconSrc: ACTION_ICON_PATHS.shipments },
  { panel: PanelType.Storage, label: 'Storage', iconSrc: ACTION_ICON_PATHS.storage },
] as const;

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  protected readonly gameSpeed = GameSpeed;

  private readonly gameState = inject(GameStateService);
  private readonly phaserBridge = inject(PhaserBridgeService);
  private readonly gameClock = inject(GameClockService);
  private readonly saveService = inject(SaveService);

  protected readonly navItems = BOTTOM_NAV_ITEMS;
  protected readonly activePanel = computed(() => this.gameState.ui().activePanel);
  protected readonly clock = computed<BottomNavClockView>(() => {
    const clock = this.gameClock.clock();

    return {
      dayLabel: `Day ${clock.day}`,
      timeLabel: this.gameClock.formatElapsedTime(clock),
      speedLabel: `Speed ${this.gameClock.speedLabel(clock.speed)}`,
    };
  });

  ngOnInit(): void {
    void this.restoreAndStart();
  }

  private async restoreAndStart(): Promise<void> {
    await this.saveService.restoreLatestGame();
    this.gameClock.start();
    this.saveService.startAutosave();
  }

  ngOnDestroy(): void {
    this.gameClock.stop();
    this.saveService.stopAutosave();
  }

  protected isActive(panel: PanelType): boolean {
    return this.activePanel() === panel;
  }

  protected selectPanel(panel: PanelType): void {
    const nextPanel = this.isActive(panel) && panel !== PanelType.CommandCenter ? PanelType.CommandCenter : panel;

    this.gameState.updateUi((ui) => clearTransientSelection(ui, nextPanel));
    this.phaserBridge.clearHighlight();
  }

  protected pauseClock(): void {
    this.gameClock.pause();
  }

  protected resumeClock(): void {
    this.gameClock.resume();
  }

  protected setClockSpeed(speed: GameSpeed): void {
    this.gameClock.setSpeed(speed);
  }

  protected saveGame(): void {
    void this.saveService.saveGame();
  }

  protected loadGame(): void {
    void this.saveService.loadGame();
  }
}

function clearTransientSelection(ui: UIState, activePanel: PanelType): UIState {
  const nextUi: UIState = {
    ...ui,
    activePanel,
  };

  delete nextUi.selectedModuleId;
  delete nextUi.selectedEntityId;

  return nextUi;
}
