# Gentle-AI Commands and When to Use Them

This guide explains the Gentle-AI commands available in this machine and the project workflow commands installed for Codex. It is written for daily use in this repo.

> Current verified CLI version: `gentle-ai 1.29.1`.
> Package manager rule for this project: use `pnpm`, never `npm`, for project workflows.

## Quick path

Most days you only need these:

```powershell
# Check installed version
gentle-ai version

# Sync agent configs and skills after Gentle-AI changes
gentle-ai sync --agent codex --agent claude-code

# Refresh this project's skill registry after changing skills
gentle-ai skill-registry refresh --cwd "C:\Users\david\Desktop\Agent Games Web\Biofactory_Lunar" --force

# Plan a new substantial change with SDD
/sdd-ff <change-name>

# Apply one planned SDD work unit
/sdd-apply <change-name>

# Verify the implementation against the SDD artifacts
/sdd-verify <change-name>
```

## Important safety notes

- Do **not** assume every `gentle-ai <command> --help` is read-only. In this environment, `gentle-ai upgrade --help` executed the upgrade flow.
- Prefer `gentle-ai help` or this guide for command discovery.
- Keep private planning files out of public Git unless we explicitly change that policy: `docs/`, `openspec/`, `skills/`, `AGENTS.md`, `.atl/`, `production-assets/`.
- For this project, scaffold/dependency commands must use `pnpm` only.

## CLI commands

| Command | What it does | Use when | Avoid when |
|---|---|---|---|
| `gentle-ai` | Opens the interactive TUI. | You want a guided interface instead of remembering commands. | You are automating a repeatable workflow. |
| `gentle-ai help` | Prints the available top-level commands. | You need safe command discovery. | You need detailed docs for a subcommand that may mutate state. |
| `gentle-ai version` | Prints installed Gentle-AI version. | Checking install/update state. | Never risky. |
| `gentle-ai install` | Configures AI coding agents on this machine. | First setup on a new machine or after adding a new supported agent. | During normal project work if agents are already configured. |
| `gentle-ai uninstall` | Removes Gentle-AI managed files from this machine. | You want to remove Gentle-AI integration. | During active development; this can break agent workflows. |
| `gentle-ai sync` | Syncs agent configs and skills to the current Gentle-AI version. | After install, upgrade, or skill/rule updates. | If you have unsaved manual edits to agent configs; backup first. |
| `gentle-ai skill-registry refresh` | Rebuilds `.atl/skill-registry.md` for a project. | After creating/editing skills or before sub-agent-heavy SDD work. | If you do not want `.atl/` regenerated locally. |
| `gentle-ai update` | Checks for available updates. | You want to know if managed tools are outdated. | If you actually want to apply updates; use `upgrade`. |
| `gentle-ai upgrade` | Applies updates to managed tool binaries. | You intentionally want latest managed tools. | When you only wanted help text. This command mutates global tooling. |
| `gentle-ai restore` | Restores a config backup. | A sync/upgrade damaged config and you need rollback. | If you are unsure which backup is correct. Inspect first. |

## Recommended Gentle-AI maintenance flow

```powershell
# 1. Check version
gentle-ai version

# 2. Check for updates
gentle-ai update

# 3. Apply tool updates only when you are ready
gentle-ai upgrade

# 4. Sync agent configs after upgrade
gentle-ai sync --agent codex --agent claude-code

# 5. Refresh project skill registry
gentle-ai skill-registry refresh --cwd "C:\Users\david\Desktop\Agent Games Web\Biofactory_Lunar" --force
```

Use this when Gentle-AI releases new skills, rules, or managed tool versions.

## `gentle-ai sync`

### Purpose

Keeps agent configs and skills aligned with the installed Gentle-AI version.

### Typical use

```powershell
gentle-ai sync --agent codex --agent claude-code
```

### Use when

- Gentle-AI was upgraded.
- A new agent integration was installed.
- Agent skills/rules seem stale.
- Codex/Claude are not seeing expected SDD commands or skills.

### Check after running

```powershell
Get-ChildItem "$env:USERPROFILE\.codex\skills"
Get-ChildItem "$env:USERPROFILE\.claude\skills"
```

## `gentle-ai skill-registry refresh`

### Purpose

Creates or updates the local project registry that maps available skills to compact rules for delegation.

### Typical use

```powershell
gentle-ai skill-registry refresh --cwd "C:\Users\david\Desktop\Agent Games Web\Biofactory_Lunar" --force
```

### Use when

- A new project skill was created.
- A skill was edited.
- SDD/sub-agent work needs project-specific standards.
- The orchestrator reports `skill_resolution: fallback-*` or `none`.

### Public repo note

For this project `.atl/` is ignored because the registry can contain absolute local paths like `C:\Users\david\...`.

## SDD commands installed by Gentle-AI

These are slash commands used inside Codex/Claude after Gentle-AI sync. They are not PowerShell commands.

| Command | What it does | Use when |
|---|---|---|
| `/sdd-init mode=hybrid` | Initializes SDD context, testing capabilities, registry, and persistence. | First setup or after changing artifact mode. |
| `/sdd-explore <topic>` | Investigates an idea without committing to implementation. | You need understanding before planning. |
| `/sdd-ff <change-name>` | Fast-forwards planning: proposal → spec → design → tasks. | The change is understood enough to plan in one pass. |
| `/sdd-apply <change-name>` | Implements planned tasks or a selected work unit. | Tasks exist and you are ready to write code/docs. |
| `/sdd-verify <change-name>` | Validates implementation against specs/tasks/design. | After apply, before archive. |
| `/sdd-archive <change-name>` | Closes a verified change and persists final state. | Verification has no critical issues. |
| `/sdd-continue [change-name]` | Runs the next dependency-ready SDD phase. | You paused midway and want to resume. |
| `/sdd-new <change-name>` | Starts a new change with exploration/proposal. | The idea is not ready for `/sdd-ff`. |
| `/sdd-onboard` | Walks through the SDD workflow on the real codebase. | New project/team onboarding. |

## SDD workflow for this project

This repo currently uses:

```yaml
artifact_store.mode: hybrid
package_manager: pnpm
strict_tdd: true
test_command: pnpm test
```

That means:

1. SDD artifacts are saved to Engram and local OpenSpec.
2. Local OpenSpec is ignored from public Git for now.
3. Implementation must keep `pnpm test` green.
4. New implementation work should write tests first.

## Recommended SDD implementation loop

```text
/sdd-ff <change-name>
/sdd-apply <change-name>
/sdd-verify <change-name>
/sdd-archive <change-name>
```

For large changes, split the apply phase into work units:

```text
/sdd-apply <change-name> -- work unit 1
/sdd-verify <change-name>
/sdd-apply <change-name> -- work unit 2
/sdd-verify <change-name>
```

## Current Biofactory: Lunar examples

### Setup or refresh SDD

```text
/sdd-init mode=hybrid
```

Use after changing persistence strategy or if SDD state seems stale.

### Plan scaffold work

```text
/sdd-ff setup-test-harness-and-base-scaffold
```

Use for substantial implementation planning.

### Apply scaffold in safe slices

```text
/sdd-apply setup-test-harness-and-base-scaffold
```

For this project, large changes should be work-unit based:

1. pnpm package foundation + test harness.
2. Angular shell.
3. Phaser placeholder.
4. Electron shell.
5. Verification/cleanup.

### Verify scaffold

```text
/sdd-verify setup-test-harness-and-base-scaffold
```

Expected verification commands:

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm electron:build
pnpm electron:smoke
```

## Troubleshooting

### `gentle-ai` is not recognized

Open a new terminal and check PATH:

```powershell
Get-Command gentle-ai -All
gentle-ai version
```

Expected Scoop path:

```text
C:\Users\david\scoop\shims\gentle-ai.exe
```

### Agent skills do not appear

Run:

```powershell
gentle-ai sync --agent codex --agent claude-code
gentle-ai skill-registry refresh --cwd "C:\Users\david\Desktop\Agent Games Web\Biofactory_Lunar" --force
```

### Engram or tools are outdated

Run intentionally:

```powershell
gentle-ai update
gentle-ai upgrade
```

Then sync:

```powershell
gentle-ai sync --agent codex --agent claude-code
```

### Electron runtime cannot install

Do not switch to npm and do not disable SSL blindly. First diagnose pnpm/registry/certificates.

Useful checks:

```powershell
pnpm --version
pnpm config get registry
Get-Command electron -ErrorAction SilentlyContinue
Test-Path node_modules\electron
```

## Command decision table

| Situation | Command |
|---|---|
| New machine setup | `gentle-ai install` |
| Gentle-AI updated | `gentle-ai sync --agent codex --agent claude-code` |
| Project skills changed | `gentle-ai skill-registry refresh --cwd "<project>" --force` |
| Need latest managed tools | `gentle-ai update`, then `gentle-ai upgrade` |
| Config broke after sync/upgrade | `gentle-ai restore` |
| Start SDD from zero | `/sdd-init mode=hybrid` |
| Explore an unclear idea | `/sdd-explore <topic>` |
| Plan a known change | `/sdd-ff <change-name>` |
| Implement planned work | `/sdd-apply <change-name>` |
| Check implementation quality | `/sdd-verify <change-name>` |
| Close verified work | `/sdd-archive <change-name>` |
