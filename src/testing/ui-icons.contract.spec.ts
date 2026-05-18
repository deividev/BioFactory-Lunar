import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ACTION_ICON_PATHS,
  ITEM_DEFINITIONS,
  ITEM_ICON_PATHS,
  RESOURCE_ICON_PATHS,
  STATE_ICON_PATHS,
} from '../app/core/data';

const LEGACY_SOURCE_ALIAS_PATHS = new Set([
  'assets/ui/icons/inventory/ui_icon_aqua_sprot.png',
  'assets/ui/icons/resources/ui_icon_oxigen.png',
  'assets/ui/icons/seeds/ui_icon_seed_aqua_sprot.png',
  'assets/ui/icons/seeds/ui_icon_seed_luma_moss.png',
]);

function expectRuntimeIconExists(iconPath: string): void {
  expect(iconPath.startsWith('assets/ui/icons/'), iconPath).toBe(true);
  expect(iconPath.endsWith('.png'), iconPath).toBe(true);
  expect(existsSync(join(process.cwd(), 'src', iconPath)), iconPath).toBe(true);
}

function collectPngPaths(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);

    if (statSync(entryPath).isDirectory()) {
      return collectPngPaths(entryPath);
    }

    return entryPath.endsWith('.png') ? [entryPath] : [];
  });
}

describe('UI icon asset contract', () => {
  it('keeps item icons mapped for every inventory definition', () => {
    expect(Object.keys(ITEM_ICON_PATHS).sort()).toEqual(ITEM_DEFINITIONS.map((definition) => definition.id).sort());
  });

  it('keeps all integrated icon paths resolvable at runtime', () => {
    const integratedIconPaths = [
      ...Object.values(RESOURCE_ICON_PATHS),
      ...Object.values(ACTION_ICON_PATHS),
      ...Object.values(ITEM_ICON_PATHS),
      ...Object.values(STATE_ICON_PATHS),
    ];

    for (const iconPath of integratedIconPaths) {
      expectRuntimeIconExists(iconPath);
    }
  });

  it('documents every current icon asset as integrated or a legacy source alias', () => {
    const iconsDirectory = join(process.cwd(), 'src/assets/ui/icons');
    const runtimeIconPaths = collectPngPaths(iconsDirectory).map((iconPath) =>
      relative(join(process.cwd(), 'src'), iconPath).replaceAll('\\', '/'),
    );
    const integratedIconPaths = new Set<string>([
      ...Object.values(RESOURCE_ICON_PATHS),
      ...Object.values(ACTION_ICON_PATHS),
      ...Object.values(ITEM_ICON_PATHS),
      ...Object.values(STATE_ICON_PATHS),
    ]);

    expect(runtimeIconPaths.filter((iconPath) => !integratedIconPaths.has(iconPath) && !LEGACY_SOURCE_ALIAS_PATHS.has(iconPath))).toEqual(
      [],
    );
  });

  it('uses canonical English filenames for normalized generated icon typos', () => {
    expect(RESOURCE_ICON_PATHS.oxygen).toBe('assets/ui/icons/resources/ui_icon_oxygen.png');
    expect(ITEM_ICON_PATHS.aqua_sprout).toBe('assets/ui/icons/inventory/ui_icon_aqua_sprout.png');
    expect(ITEM_ICON_PATHS.seed_aqua_sprout).toBe('assets/ui/icons/seeds/ui_icon_seed_aqua_sprout.png');
    expect(ITEM_ICON_PATHS.spore_luma_moss).toBe('assets/ui/icons/seeds/ui_icon_spore_luma_moss.png');
  });
});
