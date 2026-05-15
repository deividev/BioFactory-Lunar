import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');
import type { ElectronApi } from './preload-api.js';

const electronApi: ElectronApi = {
  getAppVersion: async () => String(await ipcRenderer.invoke('get-app-version'))
};

contextBridge.exposeInMainWorld('electronAPI', electronApi);



