import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ElectronMainPaths {
  readonly preloadPath: string;
  readonly angularBuildIndex: string;
  readonly workspaceRoot: string;
}

export function resolveElectronMainPaths(currentFileUrl: string): ElectronMainPaths {
  const currentDir = path.dirname(fileURLToPath(currentFileUrl));
  const workspaceRoot = path.resolve(currentDir, '..', '..');

  return {
    preloadPath: path.join(currentDir, 'preload.js'),
    angularBuildIndex: path.join(workspaceRoot, 'dist', 'biofactory-lunar', 'browser', 'index.html'),
    workspaceRoot,
  };
}