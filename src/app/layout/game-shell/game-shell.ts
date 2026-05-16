import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Storage } from '../../features/storage/storage';
import { PhaserGame } from '../../game/phaser/phaser-game';
import { HudTop } from '../hud-top/hud-top';

@Component({
  selector: 'app-game-shell',
  imports: [HudTop, Storage, PhaserGame],
  templateUrl: './game-shell.html',
  styleUrl: './game-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameShell {}

