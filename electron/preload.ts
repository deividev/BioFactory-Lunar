import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');
import type { ElectronApi } from './preload-api.js';

const electronApi: ElectronApi = {
  getAppVersion: async () => String(await ipcRenderer.invoke('get-app-version')),
  saveGame: async (payload: string) => {
    await ipcRenderer.invoke('save-game', payload);
  },
  loadGame: async () => {
    const result = await ipcRenderer.invoke('load-game');
    return result === null ? null : String(result);
  },
  hasSave: async () => Boolean(await ipcRenderer.invoke('has-save')),
  applyDevLayouts: async (overridesJson: string) => {
    await ipcRenderer.invoke('apply-dev-layouts', overridesJson);
  },
  openExternalUrl: async (url: string) => {
    await ipcRenderer.invoke('open-external-url', url);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronApi);



