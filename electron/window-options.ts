export interface MainWindowOptions {
  readonly width: number;
  readonly height: number;
  readonly minWidth: number;
  readonly minHeight: number;
  readonly show: boolean;
  readonly backgroundColor: string;
  readonly webPreferences: {
    readonly contextIsolation: true;
    readonly nodeIntegration: false;
    readonly preload: string;
  };
}

export function createMainWindowOptions(preloadPath: string): MainWindowOptions {
  return {
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#02070c',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath
    }
  };
}
