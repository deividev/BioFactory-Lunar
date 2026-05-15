import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { createDefaultPhaserGame } from './game/phaser/phaser-game.factory';
import { PHASER_GAME_FACTORY } from './game/phaser/phaser-game.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    {
      provide: PHASER_GAME_FACTORY,
      useValue: createDefaultPhaserGame
    }
  ]
};
