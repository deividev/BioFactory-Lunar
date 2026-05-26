import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyModuleLayoutOverrides } from './dev-layout-patcher';

const FIXTURE_SOURCE = `\
export const MVP_MODULE_HOTSPOTS: readonly ModuleHotspotConfig[] = [
  {
    id: 'module_command_center_basic_01',
    label: 'Command Center',
    xRatio: 0.34,
    yRatio: 0.915,
    widthRatio: 0.15,
    heightRatio: 0.1,
    spriteWidthRatio: 0.29,
    spriteHeightRatio: 0.21,
    spritePath: 'assets/phaser/modules/module_command_center.png',
  },
  {
    id: 'module_greenhouse_basic_01',
    label: 'Greenhouse',
    xRatio: 0.27,
    yRatio: 0.775,
    widthRatio: 0.18,
    heightRatio: 0.11,
    spriteWidthRatio: 0.31,
    spriteHeightRatio: 0.23,
    spritePath: 'assets/phaser/modules/module_greenhouse_basic.png',
  },
];`;

describe('applyModuleLayoutOverrides', () => {
  let tmpRoot: string;
  let configPath: string;

  beforeEach(() => {
    tmpRoot = join(tmpdir(), `dev-layout-patcher-${Date.now()}`);
    const configDir = join(tmpRoot, 'src', 'app', 'game', 'phaser', 'scenes');
    mkdirSync(configDir, { recursive: true });
    configPath = join(configDir, 'main-base-layout.config.ts');
    writeFileSync(configPath, FIXTURE_SOURCE, 'utf-8');
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('patches ratio values for a matching module and reports it as applied', () => {
    const overrides = JSON.stringify({
      module_command_center_basic_01: { xRatio: 0.45, yRatio: 0.88 },
    });

    const result = applyModuleLayoutOverrides(tmpRoot, overrides);

    expect(result.applied).toEqual(['module_command_center_basic_01']);
    expect(result.unchanged).toHaveLength(0);

    const updated = readFileSync(configPath, 'utf-8');

    expect(updated).toContain('xRatio: 0.45,');
    expect(updated).toContain('yRatio: 0.88,');
  });

  it('leaves a module unchanged when all override values already match', () => {
    const overrides = JSON.stringify({
      module_command_center_basic_01: { xRatio: 0.34, yRatio: 0.915 },
    });

    const result = applyModuleLayoutOverrides(tmpRoot, overrides);

    expect(result.applied).toHaveLength(0);
    expect(result.unchanged).toEqual(['module_command_center_basic_01']);
  });

  it('patches only the targeted module and leaves other modules untouched', () => {
    const overrides = JSON.stringify({
      module_command_center_basic_01: { xRatio: 0.50 },
    });

    applyModuleLayoutOverrides(tmpRoot, overrides);

    const updated = readFileSync(configPath, 'utf-8');

    expect(updated).toContain("id: 'module_greenhouse_basic_01'");
    expect(updated).toMatch(/module_greenhouse_basic_01[\s\S]*xRatio: 0\.27/);
  });

  it('reports an unknown module id as unchanged and does not modify the file', () => {
    const overrides = JSON.stringify({
      module_does_not_exist: { xRatio: 0.99 },
    });

    const result = applyModuleLayoutOverrides(tmpRoot, overrides);

    expect(result.unchanged).toContain('module_does_not_exist');

    const updated = readFileSync(configPath, 'utf-8');

    expect(updated).toBe(FIXTURE_SOURCE);
  });

  it('throws when the config source file does not exist', () => {
    expect(() =>
      applyModuleLayoutOverrides('/nonexistent/path', JSON.stringify({})),
    ).toThrow('only available in development');
  });
});
