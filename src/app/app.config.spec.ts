import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    AUTO: 'AUTO',
    Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
    Game: class MockGame {},
    Scene: class MockScene {}
  }
}));

import { appConfig } from './app.config';

describe('Angular app config', () => {
  it('configures zoneless change detection and the Phaser game factory provider', () => {
    expect(appConfig.providers).toHaveLength(2);
  });
});
