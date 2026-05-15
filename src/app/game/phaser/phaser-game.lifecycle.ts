export interface DestroyableGame {
  destroy(removeCanvas?: boolean): void;
}

export type PhaserGameFactory = (parent: string) => DestroyableGame;

export class PhaserGameLifecycle {
  private game: DestroyableGame | null = null;

  constructor(private readonly createGame: PhaserGameFactory) {}

  start(parent: string): void {
    if (this.game !== null) {
      return;
    }

    this.game = this.createGame(parent);
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
}
