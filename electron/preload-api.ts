export const ELECTRON_API_CHANNELS = ['get-app-version', 'save-game', 'load-game', 'has-save'] as const;

export type ElectronApiChannel = (typeof ELECTRON_API_CHANNELS)[number];

export interface ElectronApi {
  readonly getAppVersion: () => Promise<string>;
  readonly saveGame: (payload: string) => Promise<void>;
  readonly loadGame: () => Promise<string | null>;
  readonly hasSave: () => Promise<boolean>;
}
