import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'electron/**/*.spec.ts'],
    exclude: ['src/**/*.ng.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['src/**/*.ts', 'electron/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.d.ts',
        'src/**/index.ts',
        'src/app/core/models/**/*.ts',
        'src/main.ts',
        'src/app/features/contracts/contracts.ts',
        'src/app/features/greenhouse/greenhouse.ts',
        'src/app/features/processing/processing.ts',
        'src/app/features/shipments/shipments.ts',
        'src/app/features/command-center/command-center.ts',
        'src/app/layout/game-shell/game-shell.ts',
        'src/app/layout/alerts-panel/alerts-panel.ts',
        'src/app/layout/bottom-nav/bottom-nav.ts',
        'src/app/layout/hud-top/hud-top.ts',
        'src/app/features/storage/storage.ts',
        'src/app/features/dev/module-layout-dev-panel/module-layout-dev-panel.ts',
        'src/app/core/config/demo-links.config.ts',
        'src/app/core/data/demo-session.data.ts',
        'src/app/game/phaser/phaser-game.ts',
        'electron/main.ts',
        'electron/preload.ts',
        'node_modules/**',
        'dist/**',
        'dist-electron/**',
        '.angular/**',
        'coverage/**',
        'docs/**',
        'openspec/**',
        'skills/**',
        'production-assets/**'
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      }
    }
  }
});
