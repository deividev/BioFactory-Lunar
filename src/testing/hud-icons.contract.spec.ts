import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ACTION_ICON_PATHS, RESOURCE_ICON_PATHS } from '../app/core/data';

const HUD_RESOURCE_ICONS = [
  RESOURCE_ICON_PATHS.credits,
  RESOURCE_ICON_PATHS.energy,
  RESOURCE_ICON_PATHS.water,
  RESOURCE_ICON_PATHS.nutrients,
] as const;

const HUD_SYSTEM_ICONS = [
  RESOURCE_ICON_PATHS.oxygen,
  ACTION_ICON_PATHS.robots,
  ACTION_ICON_PATHS.storage,
  ACTION_ICON_PATHS.investigation,
  ACTION_ICON_PATHS.contracts,
  ACTION_ICON_PATHS.shipments,
] as const;

describe('HUD icon asset and layout contract', () => {
  it('keeps the HUD command bar icons in stable runtime asset paths', () => {
    for (const icon of [...HUD_RESOURCE_ICONS, ...HUD_SYSTEM_ICONS]) {
      expect(existsSync(join(process.cwd(), 'src', icon)), icon).toBe(true);
    }
  });

  it('keeps the top HUD focused on brand plus telemetry, with simulation controls moved to the footer', () => {
    const hudStyles = readFileSync(join(process.cwd(), 'src/app/layout/hud-top/hud-top.scss'), 'utf8');
    const footerStyles = readFileSync(join(process.cwd(), 'src/app/layout/bottom-nav/bottom-nav.scss'), 'utf8');

    expect(hudStyles).toContain('.hud-top__brand-card');
    expect(hudStyles).toContain('.hud-top__telemetry-strip');
    expect(hudStyles).not.toContain('.hud-top__clock-card');
    expect(hudStyles).toContain('.hud-top__resource-card');
    expect(hudStyles).toContain('.hud-top__system-card');
    expect(hudStyles).toMatch(/\.hud-top\s*{[\s\S]*grid-template-columns:\s*minmax\(9rem,\s*13rem\)\s+minmax\(0,\s*1fr\)/);
    expect(hudStyles).toMatch(/\.hud-top__telemetry-strip\s*{[\s\S]*display:\s*flex/);
    expect(hudStyles).toMatch(/\.hud-top__card-icon\s*{[\s\S]*width:\s*clamp\(1\.35rem,\s*1\.8vw,\s*1\.75rem\)/);

    expect(footerStyles).toContain('.bottom-nav__sim-controls');
    expect(footerStyles).toContain('.bottom-nav__clock-readout');
    expect(footerStyles).toContain('.bottom-nav__control-group');
  });
});
