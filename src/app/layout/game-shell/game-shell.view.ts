export interface GameShellViewModel {
  readonly title: string;
  readonly subtitle: string;
  readonly hudStatus: string;
  readonly visualLayerStatus: string;
}

export function createGameShellViewModel(): GameShellViewModel {
  return {
    title: 'Biofactory: Lunar',
    subtitle: 'Angular shell ready',
    hudStatus: 'HUD placeholder online',
    visualLayerStatus: 'Phaser visual placeholder online'
  };
}
