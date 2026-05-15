import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, '../..');

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

const themeTokens = readWorkspaceFile('src/styles/theme/_theme-tokens.scss');
const globalStyles = readWorkspaceFile('src/styles.scss');
const gameShellStyles = readWorkspaceFile('src/app/layout/game-shell/game-shell.scss');
const phaserStyles = readWorkspaceFile('src/app/game/phaser/phaser-game.scss');
const uiDesignSystem = readWorkspaceFile('docs/02_game_design/07_UI_DESIGN_SYSTEM.md');
const implementationPlan = readWorkspaceFile('docs/04_implementation/13_IMPLEMENTATION_PLAN.md');

describe('centralize-ui-theme-tokens spec contract', () => {
  it('Scenario: Theme tokens are globally available', () => {
    expect(globalStyles).toContain("@use './styles/theme/theme-tokens';");
    expect(themeTokens).toMatch(/:root\s*\{/);

    const expectedTokens = [
      '--bf-surface-canvas',
      '--bf-surface-panel',
      '--bf-surface-raised',
      '--bf-surface-elevated',
      '--bf-text-primary',
      '--bf-text-muted',
      '--bf-border-subtle',
      '--bf-border-strong',
      '--bf-accent-interactive',
      '--bf-accent-success',
      '--bf-accent-info',
      '--bf-accent-warning',
      '--bf-accent-danger',
      '--bf-accent-tech',
      '--bf-accent-experimental'
    ];

    for (const token of expectedTokens) {
      expect(themeTokens).toContain(`${token}:`);
    }
  });

  it('Scenario: Token changes propagate to all consumers', () => {
    const runtimeConsumers = [globalStyles, gameShellStyles, phaserStyles];
    const consumerReferences = [
      'var(--bf-surface-canvas)',
      'var(--bf-surface-panel)',
      'var(--bf-border-subtle)',
      'var(--bf-accent-info)',
      'var(--bf-accent-interactive)'
    ];

    for (const reference of consumerReferences) {
      expect(runtimeConsumers.some((fileContent) => fileContent.includes(reference))).toBe(true);
    }

    const retiredPaletteLiterals = [
      '#07111c',
      '#02070c',
      '#0c1117',
      '#e8f7ff',
      '#9adff2',
      'rgba(153, 230, 255, 0.18)',
      'rgba(153, 230, 255, 0.22)'
    ];

    for (const literal of retiredPaletteLiterals) {
      expect(globalStyles).not.toContain(literal);
      expect(gameShellStyles).not.toContain(literal);
      expect(phaserStyles).not.toContain(literal);
    }
  });

  it('Scenario: Tokens are discoverable by role', () => {
    const tokenDefinitions = Array.from(themeTokens.matchAll(/--bf-([a-z-]+):/g), (match) => match[1]);

    expect(tokenDefinitions).toHaveLength(15);
    expect(themeTokens).toContain('// ── Surfaces');
    expect(themeTokens).toContain('// ── Text');
    expect(themeTokens).toContain('// ── Borders');
    expect(themeTokens).toContain('// ── Accents');

    for (const token of tokenDefinitions) {
      expect(token).toMatch(/^(surface|text|border|accent)-/);
      expect(token).not.toMatch(/^(hud|button|modal|phaser|shell)-/);
    }
  });

  it('Scenario: Game shell uses semantic tokens', () => {
    expect(gameShellStyles).toContain('var(--bf-surface-panel)');
    expect(gameShellStyles).toContain('var(--bf-surface-canvas)');
    expect(gameShellStyles).toContain('var(--bf-surface-raised)');
    expect(gameShellStyles).toContain('var(--bf-border-subtle)');
    expect(gameShellStyles).toContain('var(--bf-accent-info)');
    expect(gameShellStyles).toContain('var(--bf-accent-interactive)');

    for (const literal of ['#07111c', '#02070c', '#0c1117', '#9adff2']) {
      expect(gameShellStyles).not.toContain(literal);
    }
  });

  it('Scenario: Phaser host canvas uses semantic tokens', () => {
    expect(phaserStyles).toContain('background: var(--bf-surface-canvas);');
    expect(phaserStyles).toContain('width: 100%;');
    expect(phaserStyles).toContain('height: 100%;');
    expect(phaserStyles).not.toContain('#02070c');
  });

  it('Scenario: Contributor discovers palette guidance', () => {
    expect(uiDesignSystem).toContain('src/styles/theme/_theme-tokens.scss');
    expect(uiDesignSystem).toContain('--bf-surface-canvas');
    expect(uiDesignSystem).toContain('--bf-text-primary');
    expect(uiDesignSystem).toContain('--bf-border-subtle');
    expect(uiDesignSystem).toContain('--bf-accent-interactive');

    expect(implementationPlan).toContain('src/styles/theme/_theme-tokens.scss');
    expect(implementationPlan).toContain('docs/02_game_design/07_UI_DESIGN_SYSTEM.md');
    expect(implementationPlan).toContain('sección 8.0');
  });

  it('Scenario: Palette skill asset remains reference-only', () => {
    expect(uiDesignSystem).toContain('skills/biofactory-lunar-ui-palette/assets/palette.tokens.css');
    expect(uiDesignSystem).toContain('material de referencia de diseño');
    expect(uiDesignSystem).toContain('No debe importarse como stylesheet en runtime');

    expect(globalStyles).not.toContain('skills/biofactory-lunar-ui-palette/assets/palette.tokens.css');
    expect(themeTokens).toContain('Design reference (NOT a runtime import):');
    expect(themeTokens).not.toMatch(/@(?:use|import).*palette\.tokens\.css/);
  });
});