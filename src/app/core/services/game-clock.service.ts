import { Injectable, OnDestroy, signal, type Signal } from '@angular/core';

import { GameSpeed } from '../enums';
import type { ClockState } from '../models';
import { GameStateService } from './game-state.service';

export const SECONDS_PER_DAY = 24 * 60 * 60;

export interface GameClockTick {
  readonly previousClock: ClockState;
  readonly currentClock: ClockState;
  readonly deltaRealSeconds: number;
  readonly deltaGameSeconds: number;
}

const SPEED_MULTIPLIER: Readonly<Record<GameSpeed, number>> = {
  [GameSpeed.Paused]: 0,
  [GameSpeed.X1]: 1,
  [GameSpeed.X2]: 2,
  [GameSpeed.X4]: 4,
};

const SPEED_SEQUENCE: readonly GameSpeed[] = [GameSpeed.X1, GameSpeed.X2, GameSpeed.X4];

function isSupportedGameSpeed(speed: GameSpeed): boolean {
  return Object.prototype.hasOwnProperty.call(SPEED_MULTIPLIER, speed);
}

function cloneClock(clock: ClockState): ClockState {
  return { ...clock };
}

function calculateDay(elapsedSeconds: number): number {
  return Math.floor(elapsedSeconds / SECONDS_PER_DAY) + 1;
}

@Injectable({ providedIn: 'root' })
export class GameClockService implements OnDestroy {
  readonly #lastTick = signal<GameClockTick | undefined>(undefined);
  #intervalId: ReturnType<typeof setInterval> | undefined;

  readonly clock: Signal<Readonly<ClockState>>;
  readonly lastTick = this.#lastTick.asReadonly();

  constructor(private readonly gameState: GameStateService) {
    this.clock = this.gameState.clock;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.#intervalId !== undefined) {
      return;
    }

    this.#intervalId = setInterval(() => {
      this.tick(1);
    }, 1_000);
  }

  stop(): void {
    if (this.#intervalId === undefined) {
      return;
    }

    clearInterval(this.#intervalId);
    this.#intervalId = undefined;
  }

  tick(deltaRealSeconds = 1): GameClockTick | undefined {
    if (!Number.isFinite(deltaRealSeconds) || deltaRealSeconds <= 0) {
      return undefined;
    }

    const previousClock = cloneClock(this.gameState.clock());
    const deltaGameSeconds = deltaRealSeconds * SPEED_MULTIPLIER[previousClock.speed];
    const nextElapsedSeconds = previousClock.elapsedSeconds + deltaGameSeconds;
    const nextClock: ClockState = {
      ...previousClock,
      elapsedSeconds: nextElapsedSeconds,
      day: calculateDay(nextElapsedSeconds),
    };

    this.gameState.updateClock(() => nextClock);

    const tick: GameClockTick = {
      previousClock,
      currentClock: cloneClock(this.gameState.clock()),
      deltaRealSeconds,
      deltaGameSeconds,
    };

    this.#lastTick.set(tick);

    return tick;
  }

  pause(): void {
    this.setSpeed(GameSpeed.Paused);
  }

  resume(): void {
    if (this.gameState.clock().speed === GameSpeed.Paused) {
      this.setSpeed(GameSpeed.X1);
    }
  }

  setSpeed(speed: GameSpeed): void {
    if (!isSupportedGameSpeed(speed)) {
      return;
    }

    this.gameState.updateClock((clock) => ({
      ...clock,
      speed,
    }));
  }

  cycleSpeed(): GameSpeed {
    const currentSpeed = this.gameState.clock().speed;
    const currentIndex = SPEED_SEQUENCE.indexOf(currentSpeed);
    const nextSpeed = currentIndex === -1 ? GameSpeed.X1 : SPEED_SEQUENCE[(currentIndex + 1) % SPEED_SEQUENCE.length]!;

    this.setSpeed(nextSpeed);

    return nextSpeed;
  }

  formatElapsedTime(clock = this.gameState.clock()): string {
    const secondsWithinDay = Math.floor(clock.elapsedSeconds % SECONDS_PER_DAY);
    const hours = Math.floor(secondsWithinDay / 3_600);
    const minutes = Math.floor((secondsWithinDay % 3_600) / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  speedLabel(speed = this.gameState.clock().speed): string {
    return speed;
  }
}
