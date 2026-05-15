import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PhaserGame } from '../../game/phaser/phaser-game';
import { createGameShellViewModel } from './game-shell.view';

@Component({
  selector: 'app-game-shell',
  imports: [PhaserGame],
  templateUrl: './game-shell.html',
  styleUrl: './game-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameShell {
  protected readonly viewModel = createGameShellViewModel();
}
