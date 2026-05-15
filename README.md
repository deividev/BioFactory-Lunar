# Biofactory: Lunar

Biofactory: Lunar is a desktop-first 2D management game prototype built with Angular, Phaser, and Electron. The current public scaffold proves the technical foundation: Angular owns the app shell, Phaser renders a visual placeholder, Electron provides a secure desktop shell, and all project workflows use pnpm.

## Current status

| Area | Status |
|---|---|
| Angular app shell | Ready |
| Phaser visual placeholder | Ready |
| Electron secure shell | Ready |
| Test harness | Ready with Vitest |
| Gameplay systems | Not implemented yet |
| Save/load | Not implemented yet |
| Final art/assets | Not included yet |

## Tech stack

| Layer | Tooling | Responsibility |
|---|---|---|
| App/UI | Angular 21 + TypeScript | App shell, UI, future game state and services |
| Visual layer | Phaser 3 | Visual scene placeholder, future interactive 2D layer |
| Desktop shell | Electron | Desktop window, secure preload boundary, future native APIs |
| Tests | Vitest | Unit tests and scaffold verification |
| Package manager | pnpm | Dependency install and all scripts |

## Requirements

- Node.js `>=22.0.0`
- pnpm `>=10.0.0`

Check locally:

```powershell
node --version
pnpm --version
```

> This project intentionally uses **pnpm only**. Do not use `npm install`, `npm test`, or `npm run ...` for project workflows.

## Quick start

```powershell
pnpm install
pnpm dev
```

Open the Angular app at:

```txt
http://127.0.0.1:4200
```

## Common commands

| Command | Use case |
|---|---|
| `pnpm install` | Install dependencies from `pnpm-lock.yaml`. |
| `pnpm dev` | Start the Angular dev server on `127.0.0.1:4200`. |
| `pnpm test` | Run the Vitest test suite once. |
| `pnpm test:watch` | Run Vitest in watch mode. |
| `pnpm typecheck` | Run TypeScript type checks without emitting files. |
| `pnpm build` | Build the Angular app with relative base href for Electron compatibility. |
| `pnpm electron:build` | Compile Electron TypeScript files. |
| `pnpm electron:smoke` | Build Angular, compile Electron, and launch Electron once. |
| `pnpm electron:dev` | Run Angular dev server, Electron watcher, and Electron dev launcher together. |
| `pnpm electron:start` | Build everything and start Electron from the production build. |

## Verification

Before considering a code change complete, run:

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm electron:build
```

For a desktop smoke check:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
pnpm electron:smoke
```

`ELECTRON_RUN_AS_NODE` must be unset for Electron to run as Electron instead of Node in some agent/tooling environments.

## Development workflow

1. Install dependencies with pnpm.
2. Write or update tests first.
3. Implement the smallest change needed.
4. Run tests and type checks.
5. Build Angular and Electron.
6. For desktop changes, run an Electron smoke check.

This project follows a strict TDD discipline. Passing tests alone is not enough once coverage tooling is configured: code changes must also meet the project's coverage threshold.

## Project structure

```txt
biofactory-lunar/
  electron/                 Electron main/preload shell and tests
  src/
    app/
      game/phaser/          Phaser host, config, lifecycle, placeholder scene
      layout/game-shell/    Angular shell and placeholder HUD
    testing/                Scaffold test harness proof
    types/                  Renderer/global type declarations
  angular.json              Angular workspace config
  package.json              pnpm scripts and dependencies
  pnpm-lock.yaml            Dependency lockfile
  tsconfig*.json            TypeScript configs
  vitest.config.ts          Test config
```

## Architecture rules

- Angular is the owner of app state, future game state, UI state, and business logic.
- Phaser is visual-only: render placeholders/scene visuals and later emit UI events through a bridge.
- Electron is the desktop boundary: window, preload, native APIs, and packaging.
- Renderer code must not access Node.js or `fs` directly.
- Use `contextBridge` in preload for any future native API.
- Keep gameplay, save/load, economy, contracts, and inventory out of Phaser and Electron.

## What is intentionally not here yet

- Crop, inventory, contract, processing, shipment, economy, or robot gameplay.
- Save/load implementation.
- Final art assets.
- Steamworks integration.
- Installer/release packaging.

## Troubleshooting

### `pnpm` is not recognized

Install or enable pnpm, then open a new terminal:

```powershell
corepack enable
pnpm --version
```

### Electron exits as Node

Unset `ELECTRON_RUN_AS_NODE`:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
pnpm electron:smoke
```

### Dev server does not connect to Electron

The project uses `127.0.0.1` instead of `localhost` to avoid IPv6/IPv4 issues on Windows.

Use:

```powershell
pnpm electron:dev
```

### Build output appears in Git

Generated folders should be ignored:

```txt
.angular/
dist/
dist-electron/
node_modules/
coverage/
```

If they appear in `git status`, check `.gitignore` before committing.
