import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GameShell } from './layout/game-shell/game-shell';

@Component({
  selector: 'app-root',
  imports: [GameShell],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
