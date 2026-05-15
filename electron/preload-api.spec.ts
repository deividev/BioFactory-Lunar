import { describe, expect, it } from 'vitest';
import { ELECTRON_API_CHANNELS } from './preload-api';

describe('Electron preload API contract', () => {
  it('exposes only minimal shell-safe channels for the base scaffold', () => {
    expect(ELECTRON_API_CHANNELS).toEqual(['get-app-version']);
  });

  it('does not expose save, filesystem, or gameplay channels yet', () => {
    expect(ELECTRON_API_CHANNELS).not.toContain('save-game');
    expect(ELECTRON_API_CHANNELS).not.toContain('load-game');
    expect(ELECTRON_API_CHANNELS).not.toContain('fs');
    expect(ELECTRON_API_CHANNELS).not.toContain('game-state');
  });
});
