/**
 * apply-module-layouts.mjs
 *
 * Patches main-base-layout.config.ts with ratio overrides exported from the
 * dev panel. Run after adjusting module positions in the browser dev panel.
 *
 * Usage:
 *   1. Open the dev panel  → click "Copy JSON for script"
 *   2. Create the overrides file:
 *        New-Item scripts\module-layout-overrides.json   (PowerShell)
 *      Paste the copied JSON into that file and save.
 *   3. pnpm layout:apply
 *
 * The overrides file format:
 *   {
 *     "module_command_center_basic_01": { "xRatio": 0.36, "yRatio": 0.92, ... },
 *     ...
 *   }
 * Only the modules you want to change need to be present.
 * Ratio keys: xRatio, yRatio, widthRatio, heightRatio, spriteWidthRatio, spriteHeightRatio
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG_PATH = resolve(
  __dirname,
  '../src/app/game/phaser/scenes/main-base-layout.config.ts',
);
const OVERRIDES_PATH = resolve(__dirname, 'module-layout-overrides.json');

const RATIO_KEYS = [
  'xRatio',
  'yRatio',
  'widthRatio',
  'heightRatio',
  'spriteWidthRatio',
  'spriteHeightRatio',
];

function cleanNumber(value) {
  return parseFloat(value.toFixed(6));
}

/**
 * Finds the object block for a given moduleId and replaces ratio values inside it.
 * Works because module objects in the config are flat (no nested braces).
 */
function patchModule(source, moduleId, ratios) {
  const moduleBlockRegex = new RegExp(
    `(\\{[^{}]*id:\\s*'${moduleId}'[^{}]*)\\}`,
    'gs',
  );

  return source.replace(moduleBlockRegex, (_, block) => {
    let updated = block;

    for (const key of RATIO_KEYS) {
      const value = ratios[key];

      if (typeof value !== 'number' || !Number.isFinite(value)) {
        continue;
      }

      updated = updated.replace(
        new RegExp(`(${key}:\\s*)[\\d.]+`),
        `$1${cleanNumber(value)}`,
      );
    }

    return updated + '}';
  });
}

function validateOverrides(overrides) {
  if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) {
    throw new Error('Overrides file must be a JSON object at the top level.');
  }

  for (const [moduleId, ratios] of Object.entries(overrides)) {
    if (typeof ratios !== 'object' || ratios === null) {
      throw new Error(`Module "${moduleId}" value must be an object.`);
    }

    for (const key of Object.keys(ratios)) {
      if (!RATIO_KEYS.includes(key)) {
        throw new Error(`Unknown key "${key}" in module "${moduleId}". Allowed: ${RATIO_KEYS.join(', ')}`);
      }
    }
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

if (!existsSync(OVERRIDES_PATH)) {
  console.error(`
Error: scripts/module-layout-overrides.json not found.

How to create it:
  1. Open the dev panel in the browser (http://127.0.0.1:4200)
  2. Adjust module positions using the sliders
  3. Click "Copy JSON for script"
  4. Create the file and paste the JSON:

     PowerShell:  New-Item scripts\\module-layout-overrides.json
     Then paste the clipboard contents and save.

  5. Run: pnpm layout:apply
`);
  process.exit(1);
}

let overrides;

try {
  overrides = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf-8'));
} catch (err) {
  console.error(`Error: could not parse scripts/module-layout-overrides.json.\n${err.message}`);
  process.exit(1);
}

try {
  validateOverrides(overrides);
} catch (err) {
  console.error(`Validation error: ${err.message}`);
  process.exit(1);
}

const moduleIds = Object.keys(overrides);

if (moduleIds.length === 0) {
  console.log('Overrides file is empty — nothing to apply.');
  process.exit(0);
}

const source = readFileSync(CONFIG_PATH, 'utf-8');
let result = source;
const applied = [];
const notFound = [];

for (const [moduleId, ratios] of Object.entries(overrides)) {
  const patched = patchModule(result, moduleId, ratios);

  if (patched === result) {
    notFound.push(moduleId);
  } else {
    applied.push(moduleId);
    result = patched;
  }
}

if (notFound.length > 0) {
  console.warn(`Warning: these module IDs were not found in the config file:\n  ${notFound.join('\n  ')}`);
}

if (result === source) {
  console.log('No changes — all override values already match the config.');
  process.exit(0);
}

writeFileSync(CONFIG_PATH, result, 'utf-8');

console.log(`✓ Patched: src/app/game/phaser/scenes/main-base-layout.config.ts`);
console.log(`  Updated: ${applied.join(', ')}`);
console.log(`\nBoth browser and Electron will now use these positions as defaults.`);
