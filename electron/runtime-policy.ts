import path from 'node:path';

export interface ElectronRuntimePolicyOptions {
  readonly appName: string;
  readonly devServerUrl?: string;
  readonly pid: number;
  readonly tempDir: string;
}

export interface ElectronRuntimePolicy {
  readonly disableHttpCache: boolean;
  readonly sessionDataPath?: string;
}

function slugifyAppName(appName: string): string {
  return appName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'electron-app';
}

export function createElectronRuntimePolicy(options: ElectronRuntimePolicyOptions): ElectronRuntimePolicy {
  if (options.devServerUrl === undefined || options.devServerUrl.length === 0) {
    return {
      disableHttpCache: false
    };
  }

  return {
    disableHttpCache: true,
    sessionDataPath: path.join(options.tempDir, slugifyAppName(options.appName), `electron-dev-session-${options.pid}`)
  };
}