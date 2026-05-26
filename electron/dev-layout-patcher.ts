import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RATIO_KEYS = [
  'xRatio',
  'yRatio',
  'widthRatio',
  'heightRatio',
  'spriteWidthRatio',
  'spriteHeightRatio',
] as const;

type RatioKey = (typeof RATIO_KEYS)[number];
type RatioOverrides = Partial<Record<RatioKey, number>>;
type ModuleOverrides = Record<string, RatioOverrides>;

export interface ApplyLayoutResult {
  readonly applied: readonly string[];
  readonly unchanged: readonly string[];
}

function patchModule(source: string, moduleId: string, ratios: RatioOverrides): string {
  return source.replace(
    new RegExp(`(\\{[^{}]*id:\\s*'${moduleId}'[^{}]*)\\}`, 'gs'),
    (_, block: string) => {
      let updated = block;

      for (const key of RATIO_KEYS) {
        const value = ratios[key];

        if (typeof value !== 'number' || !Number.isFinite(value)) {
          continue;
        }

        updated = updated.replace(
          new RegExp(`(${key}:\\s*)[\\d.]+`),
          `$1${parseFloat(value.toFixed(6))}`,
        );
      }

      return updated + '}';
    },
  );
}

export function applyModuleLayoutOverrides(
  workspaceRoot: string,
  overridesJson: string,
): ApplyLayoutResult {
  const configPath = resolve(
    workspaceRoot,
    'src/app/game/phaser/scenes/main-base-layout.config.ts',
  );

  if (!existsSync(configPath)) {
    throw new Error(
      `Source file not found: ${configPath}. applyModuleLayoutOverrides is only available in development.`,
    );
  }

  const overrides = JSON.parse(overridesJson) as ModuleOverrides;
  const source = readFileSync(configPath, 'utf-8');
  let result = source;
  const applied: string[] = [];
  const unchanged: string[] = [];

  for (const [moduleId, ratios] of Object.entries(overrides)) {
    const patched = patchModule(result, moduleId, ratios);

    if (patched !== result) {
      applied.push(moduleId);
      result = patched;
    } else {
      unchanged.push(moduleId);
    }
  }

  if (result !== source) {
    writeFileSync(configPath, result, 'utf-8');
  }

  return { applied, unchanged };
}
