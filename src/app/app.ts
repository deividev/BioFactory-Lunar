import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GameShell } from './layout/game-shell/game-shell';

@Component({
  selector: 'app-root',
  imports: [GameShell],
  template: '<app-game-shell />',
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
