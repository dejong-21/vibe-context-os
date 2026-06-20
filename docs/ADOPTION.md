# Adoption Playbook

Use this playbook when adding Vibe Context OS to a real repository.

## 1. Run the Doctor

From a source checkout:

```bash
npm run vibe -- doctor --workspace /path/to/repo
```

After npm publication:

```bash
npx vibe-context-os doctor --workspace /path/to/repo
```

Start with the status report. Do not copy generated rules into the target repository until the privacy and artifact audits are clean.

## 2. Generate a Task Pack

```bash
npm run vibe -- pack --workspace /path/to/repo --task "prepare this repository for agentic maintenance"
```

Give `exports/latest/TASK_PACK.md` to Codex, Claude Code, Cursor, OpenCode, Gemini CLI, Cline, or Aider before implementation work. This is the preferred handoff surface because it is smaller and safer than dumping the entire repository context.

## 3. Add a Readiness Badge

```bash
npm run vibe -- badge --workspace /path/to/repo
```

Review the generated Markdown and paste it into the target README only when the status matches your intended public signal:

- `ready`: good public signal.
- `review`: acceptable for early projects, but disclose that manual review is required.
- `blocked`: do not publish the badge until blockers are fixed.

## 4. Add the GitHub Action

```yaml
name: Agent context

on:
  pull_request:
  workflow_dispatch:

jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: dejong-21/vibe-context-os@main
        with:
          task: "review this pull request for AI coding agent readiness"
          fail-on: block
```

Use `fail-on: never` for the first exploratory run, then tighten it to `warning` or `block` once the repository has stable rules and privacy gates.

The Action exposes:

- `status-json`: path to the status report.
- `task-pack`: path to `exports/latest/TASK_PACK.md`.
- `public-bundle`: path to `exports/public`.
- `badge-markdown`: README-ready agent-readiness badge Markdown.

## 5. Install Agent-Native Surfaces

Codex skill:

```bash
npm run agent:install:codex
```

Claude Code user skill:

```bash
npm run agent:install:claude-user
```

Claude Code project commands:

```bash
npm run agent:install -- --claude-project /path/to/repo
```

Recommended agent prompts:

```text
Use Vibe Context OS to preflight this repository before editing.
Use Vibe Context OS to generate a task pack for this task, then follow it.
Use Vibe Context OS to run publish gates before I share this repository.
```

## 6. Connect MCP

Build the package, then run:

```bash
vibe-context mcp
```

Prefer read-only tools first:

- `context.status`
- `context.drift`
- `context.config_doctor`
- `context.privacy_audit`
- `context.mcp_audit`
- `context.pack`

Only generate public bundles after reviewing privacy output.

## 7. Publish Safely

Before any public release:

```bash
npm run vibe -- privacy-audit --workspace /path/to/repo
npm run vibe -- publish-check --workspace /path/to/repo
npm run vibe -- public-bundle --workspace /path/to/repo
npm run vibe -- artifact-audit --workspace /path/to/repo
```

The public bundle is designed for README snippets, portfolio pages, and screenshots. It should not contain raw private sessions, absolute user paths, or secrets.
