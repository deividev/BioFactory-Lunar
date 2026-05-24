declare module 'electron' {
  export const app: {
    whenReady(): Promise<void>;
    on(event: string, listener: (...args: unknown[]) => void): void;
    quit(): void;
    getVersion(): string;
    getPath(name: string): string;
  };

  export class BrowserWindow {
    constructor(options: unknown);
    loadURL(url: string): Promise<void>;
    loadFile(file: string): Promise<void>;
    once(event: string, listener: () => void): void;
    show(): void;
    static getAllWindows(): BrowserWindow[];
  }

  export const ipcMain: {
    handle(channel: string, listener: (...args: unknown[]) => unknown): void;
  };

  export const contextBridge: {
    exposeInMainWorld(apiKey: string, api: unknown): void;
  };

  export const ipcRenderer: {
    invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  };
}
