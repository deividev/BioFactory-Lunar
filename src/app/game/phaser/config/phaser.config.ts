import Phaser from 'phaser';
import { MainBaseScene, type PhaserSceneBridge } from '../scenes/main-base.scene';
import { createPhaserGameOptions } from './phaser.options';

export function createPhaserGameConfig(parent: string, sceneBridge: PhaserSceneBridge): Phaser.Types.Core.GameConfig {
  const options = createPhaserGameOptions(parent);

  return {
    type: Phaser.AUTO,
    parent: options.parent,
    width: options.width,
    height: options.height,
    backgroundColor: options.backgroundColor,
    scale: {
      mode: Phaser.Scale[options.scale.mode],
      autoCenter: Phaser.Scale[options.scale.autoCenter]
    },
    scene: [new MainBaseScene(sceneBridge)]
  };
}
