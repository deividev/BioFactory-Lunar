/**
 * dev-layout-server.mjs
 *
 * Tiny HTTP sidecar that accepts module-layout overrides from the browser dev
 * panel and patches main-base-layout.config.ts on the fly — no manual steps.
 *
 * Started automatically by `pnpm dev`. Listens on http://127.0.0.1:4299.
 *
 * POST /apply-layouts
 *   Body: JSON string matching the ModuleOverrides format
 *   Response: { applied: string[], unchanged: string[] }
 */

import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = 4299;
const CONFIG_PATH = resolve(
  __dirname,
  '../src/app/game/phaser/scenes/main-base-layout.config.ts',
);

const RATIO_KEYS = [
  'xRatio',
  'yRatio',
  'widthRatio',
  'heightRatio',
  'spriteWidthRatio',
  'spriteHeightRatio',
];

function patchModule(source, moduleId, ratios) {
  return source.replace(
    new RegExp(`(\\{[^{}]*id:\\s*'${moduleId}'[^{}]*)\\}`, 'gs'),
    (_, block) => {
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

function applyOverrides(overridesJson) {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Config file not found: ${CONFIG_PATH}`);
  }

  const overrides = JSON.parse(overridesJson);
  const source = readFileSync(CONFIG_PATH, 'utf-8');
  let result = source;
  const applied = [];
  const unchanged = [];

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
    writeFileSync(CONFIG_PATH, result, 'utf-8');
  }

  return { applied, unchanged };
}

const server = createServer((req, res) => {
  // Allow requests from the Angular dev server (any localhost origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/apply-layouts') {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';

  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    try {
      const { overridesJson } = JSON.parse(body);
      const result = applyOverrides(overridesJson);
      const patched = result.applied.length > 0;

      console.log(
        patched
          ? `[layout-server] Patched: ${result.applied.join(', ')}`
          : `[layout-server] No changes (values already match)`,
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('[layout-server] Error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err.message) }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[layout-server] Listening on http://127.0.0.1:${PORT}`);
});
