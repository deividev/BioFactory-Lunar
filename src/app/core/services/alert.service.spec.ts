import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertType } from '../enums';
import { GameStateService } from './game-state.service';
import { ALERT_AUTO_DISMISS_DELAY_MS, AlertService, MAX_VISIBLE_ALERTS } from './alert.service';

describe('AlertService', () => {
  let gameState: GameStateService;
  let service: AlertService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T12:00:00.000Z'));
    gameState = new GameStateService();
    service = new AlertService(gameState);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds success alerts to game state with stable metadata', () => {
    const alert = service.addSuccess('Game saved.');

    expect(alert).toEqual({
      id: 'alert_1779192000000_0',
      type: AlertType.Success,
      message: 'Game saved.',
      createdAt: '2026-05-19T12:00:00.000Z',
      dismissed: false,
    });
    expect(gameState.getSnapshot().alerts).toEqual([alert]);
  });

  it('adds warning and critical alerts without replacing existing alerts', () => {
    service.addWarning('No saved game found.');
    service.addCritical('Save storage is unavailable.');

    expect(gameState.getSnapshot().alerts).toEqual([
      {
        id: 'alert_1779192000000_0',
        type: AlertType.Warning,
        message: 'No saved game found.',
        createdAt: '2026-05-19T12:00:00.000Z',
        dismissed: false,
      },
      {
        id: 'alert_1779192000000_1',
        type: AlertType.Critical,
        message: 'Save storage is unavailable.',
        createdAt: '2026-05-19T12:00:00.000Z',
        dismissed: false,
      },
    ]);
  });

  it('keeps alerts visible until the auto-dismiss delay expires', () => {
    const alert = service.addSuccess('Game saved.');

    vi.advanceTimersByTime(ALERT_AUTO_DISMISS_DELAY_MS - 1);

    expect(gameState.getSnapshot().alerts).toEqual([{ ...alert, dismissed: false }]);

    vi.advanceTimersByTime(1);

    expect(gameState.getSnapshot().alerts).toEqual([{ ...alert, dismissed: true }]);
  });

  it('auto-dismisses warning and critical alerts too', () => {
    const warning = service.addWarning('No saved game found.');
    const critical = service.addCritical('Save storage is unavailable.');

    vi.advanceTimersByTime(ALERT_AUTO_DISMISS_DELAY_MS);

    expect(gameState.getSnapshot().alerts).toEqual([
      { ...warning, dismissed: true },
      { ...critical, dismissed: true },
    ]);
  });

  it('keeps only the newest visible alerts when the visible limit is exceeded', () => {
    service.addSuccess('Alert 1');
    const second = service.addWarning('Alert 2');
    const third = service.addCritical('Alert 3');
    const fourth = service.addSuccess('Alert 4');

    expect(gameState.getSnapshot().alerts).toEqual([second, third, fourth]);
    expect(gameState.getSnapshot().alerts).toHaveLength(MAX_VISIBLE_ALERTS);
  });
});
