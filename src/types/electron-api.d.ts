import type { ElectronApi } from '../../electron/preload-api';

declare global {
  interface Window {
    readonly electronAPI?: ElectronApi;
  }
}

export {};
