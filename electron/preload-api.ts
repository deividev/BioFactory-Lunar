export const ELECTRON_API_CHANNELS = ['get-app-version'] as const;

export type ElectronApiChannel = (typeof ELECTRON_API_CHANNELS)[number];

export interface ElectronApi {
  readonly getAppVersion: () => Promise<string>;
}
