import '@angular/compiler';
import { vi } from 'vitest';

const { MockGameShell } = vi.hoisted(() => ({
  MockGameShell: class MockGameShell {}
}));

vi.mock('./layout/game-shell/game-shell', () => ({
  GameShell: MockGameShell
}));

import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App component metadata', () => {
  it('declares the expected root selector and standalone shell dependency', () => {
    const componentDefinition = (App as typeof App & {
      ɵcmp?: {
        selectors?: string[][];
      };
    }).ɵcmp;

    expect(componentDefinition?.selectors).toEqual([['app-root']]);
  });
});