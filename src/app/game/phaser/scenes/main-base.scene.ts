import Phaser from 'phaser';

export class MainBaseScene extends Phaser.Scene {
  constructor() {
    super('MainBaseScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x02070c);
    this.add.circle(width * 0.76, height * 0.24, 56, 0x9adff2, 0.25);
    this.add.rectangle(width / 2, height * 0.76, width * 0.72, 120, 0x162231, 0.92);
    this.add.rectangle(width / 2, height * 0.65, 280, 120, 0x2f5368, 0.92);
    this.add.text(width / 2, height * 0.48, 'Biofactory: Lunar visual placeholder', {
      color: '#e8f7ff',
      fontFamily: 'monospace',
      fontSize: '32px'
    }).setOrigin(0.5);
  }
}
