import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { STATE_ICON_PATHS } from '../../core/data';
import { AlertType } from '../../core/enums';
import { GameStateService } from '../../core/services';

interface AlertRow {
  readonly id: string;
  readonly message: string;
  readonly tone: AlertType;
  readonly iconSrc: string;
}

const ALERT_ICON_BY_TYPE: Readonly<Record<AlertType, string>> = {
  [AlertType.Info]: STATE_ICON_PATHS.success,
  [AlertType.Warning]: STATE_ICON_PATHS.warning,
  [AlertType.Critical]: STATE_ICON_PATHS.warning,
  [AlertType.Success]: STATE_ICON_PATHS.success,
};

@Component({
  selector: 'app-alerts-panel',
  templateUrl: './alerts-panel.html',
  styleUrl: './alerts-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsPanel {
  private readonly gameState = inject(GameStateService);

  protected readonly alerts = computed<readonly AlertRow[]>(() =>
    this.gameState
      .alerts()
      .filter((alert) => !alert.dismissed)
      .map((alert) => ({
        id: alert.id,
        message: alert.message,
        tone: alert.type,
        iconSrc: ALERT_ICON_BY_TYPE[alert.type],
      })),
  );
}
