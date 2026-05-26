import { afterEach, describe, expect, it, vi } from 'vitest';

import { GameSpeed } from '../enums';
import { GameStateService } from './game-state.service';
import { GameClockService, SECONDS_PER_DAY } from './game-clock.service';

function createService(): { clock: GameClockService; state: GameStateService } {
  const state = new GameStateService();
  const clock = new GameClockService(state);

  return { clock, state };
}

describe('GameClockService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances elapsed time with x1, x2, and x4 speed multipliers', () => {
    const { clock, state } = createService();

    expect(clock.tick(1)?.deltaGameSeconds).toBe(1);
    expect(state.getSnapshot().clock.elapsedSeconds).toBe(1);

    clock.setSpeed(GameSpeed.X2);
    expect(clock.tick(3)?.deltaGameSeconds).toBe(6);
    expect(state.getSnapshot().clock.elapsedSeconds).toBe(7);

    clock.setSpeed(GameSpeed.X4);
    expect(clock.tick(2)?.deltaGameSeconds).toBe(8);
    expect(state.getSnapshot().clock.elapsedSeconds).toBe(15);
  });

  it('does not advance while paused and resumes to a playable fallback speed', () => {
    const { clock, state } = createService();

    clock.tick(10);
    clock.pause();
    const pausedTick = clock.tick(5);

    expect(pausedTick?.deltaGameSeconds).toBe(0);
    expect(state.getSnapshot().clock).toEqual({ elapsedSeconds: 10, day: 1, speed: GameSpeed.Paused });

    clock.resume();
    expect(state.getSnapshot().clock.speed).toBe(GameSpeed.X1);
    clock.tick(1);
    expect(state.getSnapshot().clock.elapsedSeconds).toBe(11);
  });

  it('ignores invalid deltas and unsupported runtime speed values', () => {
    const { clock, state } = createService();

    clock.setSpeed('turbo' as GameSpeed);
    expect(state.getSnapshot().clock.speed).toBe(GameSpeed.X1);

    expect(clock.tick(0)).toBeUndefined();
    expect(clock.tick(Number.NaN)).toBeUndefined();
    expect(state.getSnapshot().clock.elapsedSeconds).toBe(0);
    expect(clock.lastTick()).toBeUndefined();
  });

  it('updates day from elapsed seconds when a tick crosses the day boundary', () => {
    const { clock, state } = createService();

    clock.tick(SECONDS_PER_DAY - 1);
    expect(state.getSnapshot().clock).toEqual({
      elapsedSeconds: SECONDS_PER_DAY - 1,
      day: 1,
      speed: GameSpeed.X1,
    });

    clock.tick(1);
    expect(state.getSnapshot().clock).toEqual({
      elapsedSeconds: SECONDS_PER_DAY,
      day: 2,
      speed: GameSpeed.X1,
    });
  });

  it('cycles playable speeds and formats the current clock for HUD consumers', () => {
    const { clock } = createService();

    expect(clock.speedLabel(GameSpeed.X1)).toBe('x1');
    expect(clock.formatElapsedTime({ elapsedSeconds: 65, day: 1, speed: GameSpeed.X1 })).toBe('00:01:05');

    expect(clock.cycleSpeed()).toBe(GameSpeed.X2);
    expect(clock.cycleSpeed()).toBe(GameSpeed.X4);
    expect(clock.cycleSpeed()).toBe(GameSpeed.X1);

    clock.pause();
    expect(clock.cycleSpeed()).toBe(GameSpeed.X1);
  });

  it('publishes the latest deterministic tick for future systems without storing runtime handles in game state', () => {
    const { clock, state } = createService();

    clock.setSpeed(GameSpeed.X2);
    const tick = clock.tick(4);

    expect(clock.lastTick()).toEqual(tick);
    expect(tick).toEqual({
      previousClock: { elapsedSeconds: 0, day: 1, speed: GameSpeed.X2 },
      currentClock: { elapsedSeconds: 8, day: 1, speed: GameSpeed.X2 },
      deltaRealSeconds: 4,
      deltaGameSeconds: 8,
    });
    expect(Object.keys(state.getSnapshot().clock)).toEqual(['elapsedSeconds', 'day', 'speed']);
  });

  it('starts only one interval and stops runtime ticking', () => {
    vi.useFakeTimers();
    const { clock, state } = createService();

    clock.stop();
    clock.start();
    clock.start();
    vi.advanceTimersByTime(3_000);

    expect(state.getSnapshot().clock.elapsedSeconds).toBe(3);

    clock.stop();
    vi.advanceTimersByTime(3_000);

    expect(state.getSnapshot().clock.elapsedSeconds).toBe(3);
  });

  it('cleans up the active interval on destroy', () => {
    vi.useFakeTimers();
    const { clock, state } = createService();

    clock.start();
    vi.advanceTimersByTime(1_000);
    clock.ngOnDestroy();
    vi.advanceTimersByTime(2_000);

    expect(state.getSnapshot().clock.elapsedSeconds).toBe(1);
  });
});
