import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveElectronMainPaths } from './main-paths';

describe('Electron main path resolution', () => {
  it('resolves the Angular build from the workspace root instead of dist-electron', () => {
    const workspaceRoot = 'C:/Users/david/Desktop/Agent Games Web/Biofactory_Lunar';
    const mainFileUrl = `file:///${workspaceRoot}/dist-electron/electron/main.js`;

    const mainPaths = resolveElectronMainPaths(mainFileUrl);

    expect(mainPaths.preloadPath).toBe(path.join(workspaceRoot, 'dist-electron', 'electron', 'preload.js'));
    expect(mainPaths.angularBuildIndex).toBe(path.join(workspaceRoot, 'dist', 'biofactory-lunar', 'browser', 'index.html'));
    expect(mainPaths.angularBuildIndex).not.toContain(path.join('dist-electron', 'dist'));
  });
});