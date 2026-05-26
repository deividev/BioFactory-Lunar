export const ELECTRON_API_CHANNELS = ['get-app-version', 'save-game', 'load-game', 'has-save', 'apply-dev-layouts', 'open-external-url'] as const;

export type ElectronApiChannel = (typeof ELECTRON_API_CHANNELS)[number];

export interface ElectronApi {
  readonly getAppVersion: () => Promise<string>;
  readonly saveGame: (payload: string) => Promise<void>;
  readonly loadGame: () => Promise<string | null>;
  readonly hasSave: () => Promise<boolean>;
  readonly applyDevLayouts: (overridesJson: string) => Promise<void>;
  readonly openExternalUrl: (url: string) => Promise<void>;
}
