import Phaser from 'phaser';
import { MainBaseScene } from '../scenes/main-base.scene';
import { createPhaserGameOptions } from './phaser.options';

export function createPhaserGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  const options = createPhaserGameOptions(parent);

  return {
    type: Phaser.AUTO,
    parent: options.parent,
    width: options.width,
    height: options.height,
    backgroundColor: options.backgroundColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainBaseScene]
  };
}
