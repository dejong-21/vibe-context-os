# Agent-Native Usage

Vibe Context OS is most useful when it runs inside the coding-agent loop. The web console is an inspection surface; the primary workflow should happen from Codex, Claude Code, MCP clients, or the CLI.

## Codex Skill

The reusable skill lives in:

```text
codex-skill/vibe-context-os
```

Install it into Codex by copying that folder to:

```text
%USERPROFILE%\.codex\skills\vibe-context-os
```

Or run:

```bash
npm run agent:install:codex
```

Then ask Codex for tasks like:

```text
Use Vibe Context OS to preflight this repository before editing.
```

or:

```text
Use Vibe Context OS to generate a task pack for adding a safer export flow, then follow it.
```

## Claude Code Skill

Claude Code skills can live at project scope or user scope:

```text
.claude/skills/vibe-context-os
~/.claude/skills/vibe-context-os
```

Copy `codex-skill/vibe-context-os` into one of those locations. Claude Code can then use it automatically when relevant, or you can invoke it directly as:

```text
/vibe-context-os preflight this repository before coding
```

User-scope install:

```bash
npm run agent:install:claude-user
```

Project-scope install with command templates:

```bash
npm run agent:install -- --claude-project /path/to/project
```

Claude Code also supports old-style command files under `.claude/commands/`. Templates are included in:

```text
agent-kit/claude-code/commands
```

Copy them into a project:

```text
.claude/commands/vibe-preflight.md
.claude/commands/vibe-pack.md
.claude/commands/vibe-publish.md
```

Then use:

```text
/vibe-preflight
/vibe-pack "prepare this repo for GitHub"
/vibe-publish
```

## MCP Client

Build or install the package, then run:

```bash
vibe-context mcp
```

Use these tools from the MCP client:

- `context.status` first
- `context.pack` before a concrete implementation task
- `context.config_doctor` before editing agent rules
- `context.privacy_audit`, `context.artifact_audit`, and `context.mcp_audit` before public sharing
- `context.public_bundle` for GitHub or portfolio material

## CLI Agent Loop

For any coding agent that can run shell commands:

```bash
vibe-context status --workspace .
vibe-context drift --workspace .
vibe-context privacy-audit --workspace .
vibe-context pack --workspace . --task "describe task"
```

Read `exports/latest/TASK_PACK.md`, then implement the task.

Before public sharing:

```bash
vibe-context publish-check --workspace .
vibe-context public-bundle --workspace .
vibe-context artifact-audit --workspace .
vibe-context mcp-audit --workspace .
```

## Why This Is Better Than Dashboard-First

Agents already build and edit inside Codex, Claude Code, Cursor, and terminal workflows. Vibe Context OS should meet them there:

- preflight before edits
- task pack before implementation
- gate checks before sharing
- generated rules only after review

Use the web app when you want visual inspection, screenshots, or manual review.
