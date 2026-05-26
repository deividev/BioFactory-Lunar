import { Injectable } from '@angular/core';

function resolveElectronApi(): NonNullable<Window['electronAPI']> | undefined {
  return (globalThis as unknown as Window).electronAPI;
}

@Injectable({ providedIn: 'root' })
export class ElectronBridgeService {
  isElectron(): boolean {
    return resolveElectronApi() !== undefined;
  }

  saveGame(payload: string): Promise<void> {
    return resolveElectronApi()!.saveGame(payload);
  }

  loadGame(): Promise<string | null> {
    return resolveElectronApi()!.loadGame();
  }

  hasSave(): Promise<boolean> {
    return resolveElectronApi()!.hasSave();
  }

  applyDevLayouts(overridesJson: string): Promise<void> {
    return resolveElectronApi()!.applyDevLayouts(overridesJson);
  }

  openExternalUrl(url: string): Promise<void> {
    return resolveElectronApi()!.openExternalUrl(url);
  }
}
