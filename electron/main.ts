import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain } = require('electron') as typeof import('electron');
import { resolveElectronMainPaths } from './main-paths.js';
import { createElectronRuntimePolicy } from './runtime-policy.js';
import { createMainWindowOptions } from './window-options.js';
import { createSaveHandlers } from './save-handlers.js';

type MainBrowserWindow = InstanceType<typeof BrowserWindow>;

let mainWindow: MainBrowserWindow | null = null;
const mainPaths = resolveElectronMainPaths(import.meta.url);
const runtimePolicy = createElectronRuntimePolicy({
  appName: app.name,
  devServerUrl: process.env['BIOFACTORY_DEV_SERVER_URL'],
  pid: process.pid,
  tempDir: app.getPath('temp')
});

if (runtimePolicy.sessionDataPath !== undefined) {
  mkdirSync(runtimePolicy.sessionDataPath, { recursive: true });
  app.setPath('sessionData', runtimePolicy.sessionDataPath);
}

if (runtimePolicy.disableHttpCache) {
  app.commandLine.appendSwitch('disable-http-cache');
}

async function loadRenderer(window: MainBrowserWindow): Promise<void> {
  const devServerUrl = process.env['BIOFACTORY_DEV_SERVER_URL'];

  if (devServerUrl !== undefined && devServerUrl.length > 0) {
    await window.loadURL(devServerUrl);
    return;
  }

  await window.loadFile(mainPaths.angularBuildIndex);
}

function registerIpcHandlers(): void {
  ipcMain.handle('get-app-version', () => app.getVersion());

  const saveHandlers = createSaveHandlers(app.getPath('userData'), {
    readFile: (filePath) => readFileSync(filePath, 'utf8'),
    writeFile: (filePath, data) => writeFileSync(filePath, data, 'utf8'),
    exists: (filePath) => existsSync(filePath)
  });

  ipcMain.handle('save-game', (_event, payload: string) => saveHandlers.saveGame(payload));
  ipcMain.handle('load-game', () => saveHandlers.loadGame());
  ipcMain.handle('has-save', () => saveHandlers.hasSave());
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow(createMainWindowOptions(mainPaths.preloadPath));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  await loadRenderer(mainWindow);
}

registerIpcHandlers();

app.whenReady()
  .then(async () => {
    await createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to start Electron shell.', error);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});





