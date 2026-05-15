import Phaser from 'phaser';

const TEMP_BACKGROUND_KEY = 'main-base-background';
const TEMP_BACKGROUND_PATH = 'assets/backgrounds/bg_lunar_prototype.png';

export class MainBaseScene extends Phaser.Scene {
  private background?: Phaser.GameObjects.Image;

  constructor() {
    super('MainBaseScene');
  }

  preload(): void {
    if (!this.textures.exists(TEMP_BACKGROUND_KEY)) {
      this.load.image(TEMP_BACKGROUND_KEY, TEMP_BACKGROUND_PATH);
    }
  }

  create(): void {
    this.background = this.add.image(0, 0, TEMP_BACKGROUND_KEY);

    this.layoutBackground(this.scale.width, this.scale.height);
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: { width: number; height: number }): void {
    this.layoutBackground(gameSize.width, gameSize.height);
  }

  private layoutBackground(width: number, height: number): void {
    this.background?.setPosition(width / 2, height / 2).setDisplaySize(width, height);
  }
}
