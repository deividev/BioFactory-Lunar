import { Injectable } from '@angular/core';

import { MODULE_DEFINITIONS, MODULE_PANEL_BY_TYPE } from '../data';
import { PanelType } from '../enums';
import type { BaseModuleInstance } from '../models';
import { PhaserBridgeService } from '../../game/bridge';
import { GameStateService } from './game-state.service';

const MODULE_DEFINITION_BY_ID = new Map(MODULE_DEFINITIONS.map((definition) => [definition.id, definition]));

@Injectable({ providedIn: 'root' })
export class ModuleSelectionService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly phaserBridge: PhaserBridgeService,
  ) {}

  selectModule(moduleId: string): boolean {
    const panel = this.getPanelForModule(moduleId);

    if (panel === undefined) {
      return false;
    }

    this.gameState.updateUi((ui) => ({
      ...ui,
      activePanel: panel,
      selectedModuleId: moduleId,
    }));
    this.phaserBridge.highlightModule(moduleId);

    return true;
  }

  clearSelection(): void {
    this.gameState.updateUi((ui) => {
      const nextUi = { ...ui };
      delete nextUi.selectedModuleId;

      return nextUi;
    });
    this.phaserBridge.clearHighlight();
  }

  getPanelForModule(moduleId: string): PanelType | undefined {
    const module = this.gameState.getSnapshot().modules.find((candidate) => candidate.id === moduleId);

    if (module === undefined) {
      return undefined;
    }

    return panelForModule(module);
  }

  getModuleIdForPanel(panel: PanelType): string | undefined {
    return this.gameState.getSnapshot().modules.find((m) => panelForModule(m) === panel)?.id;
  }
}

function panelForModule(module: BaseModuleInstance): PanelType | undefined {
  const definition = MODULE_DEFINITION_BY_ID.get(module.definitionId);

  return definition === undefined ? undefined : MODULE_PANEL_BY_TYPE[definition.type];
}
