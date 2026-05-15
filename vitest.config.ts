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
        'src/main.ts',
        'src/app/layout/game-shell/game-shell.ts',
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

