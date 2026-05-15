import { describe, expect, it } from 'vitest';
import { createGameShellViewModel } from './game-shell.view';

describe('game shell view model', () => {
  it('describes the shell as an Angular-owned game foundation', () => {
    expect(createGameShellViewModel()).toEqual({
      title: 'Biofactory: Lunar',
      subtitle: 'Angular shell ready',
      hudStatus: 'HUD placeholder online',
      visualLayerStatus: 'Phaser visual placeholder online'
    });
  });

  it('keeps gameplay systems out of the base shell', () => {
    const viewModel = createGameShellViewModel();

    expect(Object.keys(viewModel)).not.toContain('credits');
    expect(Object.keys(viewModel)).not.toContain('inventory');
    expect(Object.keys(viewModel)).not.toContain('contracts');
  });
});

