import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createSaveHandlers } from './save-handlers';
import type { SaveHandlerFs } from './save-handlers';

const FAKE_USER_DATA = '/fake/user-data';
const EXPECTED_SAVE_PATH = path.join('/fake/user-data', 'biofactory-lunar-save.json');

describe('Electron save handlers', () => {
  describe('saveGame', () => {
    it('writes the raw payload to biofactory-lunar-save.json under userData', () => {
      const writeFile = vi.fn((_p: string, _d: string) => {});
      const handlers = createSaveHandlers(FAKE_USER_DATA, {
        readFile: vi.fn((_p: string) => ''),
        writeFile,
        exists: vi.fn((_p: string) => false)
      } satisfies SaveHandlerFs);
      handlers.saveGame('{"level":1}');
      expect(writeFile).toHaveBeenCalledWith(EXPECTED_SAVE_PATH, '{"level":1}');
    });

    it('propagates write errors to the caller', () => {
      const handlers = createSaveHandlers(FAKE_USER_DATA, {
        readFile: vi.fn((_p: string) => ''),
        writeFile: vi.fn((_p: string, _d: string) => { throw new Error('disk full'); }),
        exists: vi.fn((_p: string) => false)
      } satisfies SaveHandlerFs);
      expect(() => handlers.saveGame('{}')).toThrow('disk full');
    });
  });

  describe('loadGame', () => {
    it('returns the raw file content when biofactory-lunar-save.json exists', () => {
      const handlers = createSaveHandlers(FAKE_USER_DATA, {
        readFile: vi.fn((_p: string) => '{"level":2}'),
        writeFile: vi.fn((_p: string, _d: string) => {}),
        exists: vi.fn((_p: string) => true)
      } satisfies SaveHandlerFs);
      expect(handlers.loadGame()).toBe('{"level":2}');
    });

    it('returns null when biofactory-lunar-save.json does not exist', () => {
      const handlers = createSaveHandlers(FAKE_USER_DATA, {
        readFile: vi.fn((_p: string) => ''),
        writeFile: vi.fn((_p: string, _d: string) => {}),
        exists: vi.fn((_p: string) => false)
      } satisfies SaveHandlerFs);
      expect(handlers.loadGame()).toBeNull();
    });
  });

  describe('hasSave', () => {
    it('returns true when biofactory-lunar-save.json exists', () => {
      const handlers = createSaveHandlers(FAKE_USER_DATA, {
        readFile: vi.fn((_p: string) => ''),
        writeFile: vi.fn((_p: string, _d: string) => {}),
        exists: vi.fn((_p: string) => true)
      } satisfies SaveHandlerFs);
      expect(handlers.hasSave()).toBe(true);
    });

    it('returns false when biofactory-lunar-save.json does not exist', () => {
      const handlers = createSaveHandlers(FAKE_USER_DATA, {
        readFile: vi.fn((_p: string) => ''),
        writeFile: vi.fn((_p: string, _d: string) => {}),
        exists: vi.fn((_p: string) => false)
      } satisfies SaveHandlerFs);
      expect(handlers.hasSave()).toBe(false);
    });
  });
});
