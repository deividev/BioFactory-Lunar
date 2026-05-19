import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertType } from '../enums';
import { GameStateService } from './game-state.service';
import { AlertService } from './alert.service';

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
});