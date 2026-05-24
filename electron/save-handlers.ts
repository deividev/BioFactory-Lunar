import { join } from 'node:path';

const SAVE_FILE_NAME = 'biofactory-lunar-save.json';

export interface SaveHandlerFs {
  readonly readFile: (filePath: string) => string;
  readonly writeFile: (filePath: string, data: string) => void;
  readonly exists: (filePath: string) => boolean;
}

export interface SaveHandlers {
  readonly saveGame: (payload: string) => void;
  readonly loadGame: () => string | null;
  readonly hasSave: () => boolean;
}

export function createSaveHandlers(userDataPath: string, fs: SaveHandlerFs): SaveHandlers {
  const savePath = join(userDataPath, SAVE_FILE_NAME);

  return {
    saveGame: (payload: string): void => {
      fs.writeFile(savePath, payload);
    },
    loadGame: (): string | null => {
      if (!fs.exists(savePath)) return null;
      return fs.readFile(savePath);
    },
    hasSave: (): boolean => {
      return fs.exists(savePath);
    }
  };
}
