import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { PhaserGameLifecycle } from './phaser-game.lifecycle';
import { PHASER_GAME_FACTORY } from './phaser-game.token';

export { PHASER_GAME_FACTORY };

@Component({
  selector: 'app-phaser-game',
  templateUrl: './phaser-game.html',
  styleUrl: './phaser-game.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhaserGame implements AfterViewInit, OnDestroy {
  @ViewChild('phaserContainer', { static: true })
  private readonly phaserContainer!: ElementRef<HTMLElement>;

  private readonly lifecycle = new PhaserGameLifecycle(inject(PHASER_GAME_FACTORY));

  ngAfterViewInit(): void {
    this.lifecycle.start(this.phaserContainer.nativeElement.id);
  }

  ngOnDestroy(): void {
    this.lifecycle.stop();
  }
}
