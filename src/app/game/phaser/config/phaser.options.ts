export const PHASER_GAME_SIZE = {
  width: 1920,
  height: 1080
} as const;

export interface PhaserGameOptions {
  readonly parent: string;
  readonly width: number;
  readonly height: number;
  readonly backgroundColor: string;
  readonly scale: {
    readonly mode: 'FIT';
    readonly autoCenter: 'CENTER_BOTH';
  };
}

export function createPhaserGameOptions(parent: string): PhaserGameOptions {
  return {
    parent,
    width: PHASER_GAME_SIZE.width,
    height: PHASER_GAME_SIZE.height,
    backgroundColor: '#02070c',
    scale: {
      mode: 'FIT',
      autoCenter: 'CENTER_BOTH'
    }
  };
}
