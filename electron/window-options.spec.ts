import { describe, expect, it } from 'vitest';
import { createMainWindowOptions } from './window-options';

describe('Electron main window options', () => {
  it('uses a secure renderer boundary', () => {
    const options = createMainWindowOptions('C:/app/electron/preload.js');

    expect(options.webPreferences.contextIsolation).toBe(true);
    expect(options.webPreferences.nodeIntegration).toBe(false);
    expect(options.webPreferences.preload).toBe('C:/app/electron/preload.js');
  });

  it('starts with desktop-friendly dimensions and hidden first paint', () => {
    const options = createMainWindowOptions('preload.js');

    expect(options.width).toBeGreaterThanOrEqual(1280);
    expect(options.height).toBeGreaterThanOrEqual(720);
    expect(options.show).toBe(false);
  });
});
