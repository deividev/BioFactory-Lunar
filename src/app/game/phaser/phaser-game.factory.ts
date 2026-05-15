import Phaser from 'phaser';
import { createPhaserGameConfig } from './config/phaser.config';
import { DestroyableGame, PhaserGameFactory } from './phaser-game.lifecycle';

export const createDefaultPhaserGame: PhaserGameFactory = (parent: string): DestroyableGame =>
  new Phaser.Game(createPhaserGameConfig(parent));
