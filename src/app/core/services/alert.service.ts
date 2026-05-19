import { Injectable } from '@angular/core';

import { AlertType } from '../enums';
import type { Alert } from '../models';
import { GameStateService } from './game-state.service';

@Injectable({ providedIn: 'root' })
export class AlertService {
  #nextAlertId = 0;

  constructor(private readonly gameState: GameStateService) {}

  addSuccess(message: string): Alert {
    return this.addAlert(AlertType.Success, message);
  }

  addWarning(message: string): Alert {
    return this.addAlert(AlertType.Warning, message);
  }

  addCritical(message: string): Alert {
    return this.addAlert(AlertType.Critical, message);
  }

  private addAlert(type: AlertType, message: string): Alert {
    const now = new Date();
    const alert: Alert = {
      id: `alert_${now.getTime()}_${this.#nextAlertId}`,
      type,
      message,
      createdAt: now.toISOString(),
      dismissed: false,
    };

    this.#nextAlertId += 1;
    this.gameState.updateAlerts((alerts) => [...alerts, alert]);

    return alert;
  }
}