import { describe, expect, it } from 'vitest';
import { ELECTRON_API_CHANNELS } from './preload-api';

describe('Electron preload API contract', () => {
  it('still exposes the get-app-version shell channel', () => {
    expect(ELECTRON_API_CHANNELS).toContain('get-app-version');
  });

  it('exposes the save-game, load-game, and has-save IPC channels', () => {
    expect(ELECTRON_API_CHANNELS).toContain('save-game');
    expect(ELECTRON_API_CHANNELS).toContain('load-game');
    expect(ELECTRON_API_CHANNELS).toContain('has-save');
  });

  it('exposes the apply-dev-layouts dev tool channel', () => {
    expect(ELECTRON_API_CHANNELS).toContain('apply-dev-layouts');
  });

  it('exposes the open-external-url shell channel', () => {
    expect(ELECTRON_API_CHANNELS).toContain('open-external-url');
  });

  it('does not expose filesystem or gameplay state channels', () => {
    expect(ELECTRON_API_CHANNELS).not.toContain('fs');
    expect(ELECTRON_API_CHANNELS).not.toContain('game-state');
  });
});
