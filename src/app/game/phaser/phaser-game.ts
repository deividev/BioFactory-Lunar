import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import Phaser from 'phaser';
import { createPhaserGameConfig } from './config/phaser.config';
import { PhaserGameLifecycle } from './phaser-game.lifecycle';

@Component({
  selector: 'app-phaser-game',
  templateUrl: './phaser-game.html',
  styleUrl: './phaser-game.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhaserGame implements AfterViewInit, OnDestroy {
  @ViewChild('phaserContainer', { static: true })
  private readonly phaserContainer!: ElementRef<HTMLElement>;

  private readonly lifecycle = new PhaserGameLifecycle((parent: string) => new Phaser.Game(createPhaserGameConfig(parent)));

  ngAfterViewInit(): void {
    this.lifecycle.start(this.phaserContainer.nativeElement.id);
  }

  ngOnDestroy(): void {
    this.lifecycle.stop();
  }
}
