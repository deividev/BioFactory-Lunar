import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PHASER_ASSETS = [
  'phaser/backgrounds/lunar/bg_sky_base.png',
  'phaser/backgrounds/lunar/bg_stars_far.png',
  'phaser/backgrounds/lunar/bg_earth.png',
  'phaser/backgrounds/lunar/bg_lunar_ground.png',
  'phaser/backgrounds/lunar/bg_platform_front.png',
  'phaser/modules/module_command_center.png',
  'phaser/modules/module_greenhouse_basic.png',
  'phaser/modules/module_processing.png',
  'phaser/modules/module_shipping_hangar.png',
  'phaser/modules/module_storage.png',
] as const;

describe('Phaser style spike asset contract', () => {
  it('keeps the Pack 1 and Pack 2 runtime assets in src/assets with stable names', () => {
    for (const asset of PHASER_ASSETS) {
      expect(existsSync(join(process.cwd(), 'src/assets', asset)), asset).toBe(true);
    }
  });

  it('copies src/assets into the Angular runtime assets output', () => {
    const angularConfig = JSON.parse(readFileSync(join(process.cwd(), 'angular.json'), 'utf8'));
    const assets = angularConfig.projects['biofactory-lunar'].architect.build.options.assets;

    expect(assets).toContainEqual({
      glob: '**/*',
      input: 'src/assets',
      output: 'assets',
    });
  });
});
