import { Injectable } from '@angular/core';

import { AlertType } from '../enums';
import type { Alert } from '../models';
import { GameStateService } from './game-state.service';

export const ALERT_AUTO_DISMISS_DELAY_MS = 5_000;
export const MAX_VISIBLE_ALERTS = 3;

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
    this.gameState.updateAlerts((alerts) => this.limitVisibleAlerts([...alerts, alert]));
    this.scheduleAutoDismiss(alert.id);

    return alert;
  }

  private limitVisibleAlerts(alerts: Alert[]): Alert[] {
    return alerts.filter((alert) => !alert.dismissed).slice(-MAX_VISIBLE_ALERTS);
  }

  private scheduleAutoDismiss(alertId: string): void {
    setTimeout(() => this.dismissAlert(alertId), ALERT_AUTO_DISMISS_DELAY_MS);
  }

  private dismissAlert(alertId: string): void {
    this.gameState.updateAlerts((alerts) =>
      alerts.map((alert) => (alert.id === alertId ? { ...alert, dismissed: true } : alert)),
    );
  }
}
