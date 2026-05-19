import type { PhaserSceneBridge } from './scenes/main-base.scene';

export interface DestroyableGame {
  destroy(removeCanvas?: boolean): void;
}

export type PhaserGameFactory = (parent: string, sceneBridge: PhaserSceneBridge) => DestroyableGame;

export class PhaserGameLifecycle {
  private game: DestroyableGame | null = null;

  constructor(
    private readonly createGame: PhaserGameFactory,
    private readonly sceneBridge: PhaserSceneBridge
  ) {}

  start(parent: string): void {
    if (this.game !== null) {
      return;
    }

    this.clearHost(parent);
    this.game = this.createGame(parent, this.sceneBridge);
  }

  stop(): void {
    if (this.game === null) {
      return;
    }

    this.game.destroy(true);
    this.game = null;
  }

  isRunning(): boolean {
    return this.game !== null;
  }

  private clearHost(parent: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.getElementById(parent)?.replaceChildren();
  }
}
