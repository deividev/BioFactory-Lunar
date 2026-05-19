import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ACTION_ICON_PATHS, STATE_ICON_PATHS } from '../../core/data';
import { PanelType } from '../../core/enums';
import type { UIState } from '../../core/models';
import { GameStateService } from '../../core/services';
import { PhaserBridgeService } from '../../game/bridge';

interface BottomNavItem {
  readonly panel: PanelType;
  readonly label: string;
  readonly iconSrc: string;
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
  private readonly gameState = inject(GameStateService);
  private readonly phaserBridge = inject(PhaserBridgeService);

  protected readonly navItems = BOTTOM_NAV_ITEMS;
  protected readonly activePanel = computed(() => this.gameState.ui().activePanel);

  protected isActive(panel: PanelType): boolean {
    return this.activePanel() === panel;
  }

  protected selectPanel(panel: PanelType): void {
    const nextPanel = this.isActive(panel) && panel !== PanelType.CommandCenter ? PanelType.CommandCenter : panel;

    this.gameState.updateUi((ui) => clearTransientSelection(ui, nextPanel));
    this.phaserBridge.clearHighlight();
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
