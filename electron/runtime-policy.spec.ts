import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createElectronRuntimePolicy } from './runtime-policy';

describe('Electron runtime policy', () => {
  it('isolates Chromium session data and disables HTTP cache during Angular dev-server runs', () => {
    const policy = createElectronRuntimePolicy({
      appName: 'Biofactory Lunar',
      devServerUrl: 'http://127.0.0.1:4200',
      pid: 4242,
      tempDir: 'C:/Temp'
    });

    expect(policy.disableHttpCache).toBe(true);
    expect(policy.sessionDataPath).toBe(path.join('C:/Temp', 'biofactory-lunar', 'electron-dev-session-4242'));
  });

  it('keeps the default Chromium cache/session behavior for packaged or smoke builds', () => {
    const policy = createElectronRuntimePolicy({
      appName: 'Biofactory Lunar',
      devServerUrl: undefined,
      pid: 4242,
      tempDir: 'C:/Temp'
    });

    expect(policy.disableHttpCache).toBe(false);
    expect(policy.sessionDataPath).toBeUndefined();
  });
});