import { InjectionToken } from '@angular/core';
import { PhaserGameFactory } from './phaser-game.lifecycle';

export const PHASER_GAME_FACTORY = new InjectionToken<PhaserGameFactory>('PHASER_GAME_FACTORY');
