# Agent-Native Usage

## Product Stance

Vibe Context OS should feel like an agent preflight and handoff system, not a dashboard-first app. The web UI is useful for inspection, but the high-frequency workflow is:

1. agent enters repo
2. agent scans safe context
3. agent generates a task pack
4. agent follows the task pack while editing
5. agent runs publish/privacy gates before sharing output

## Codex Pattern

Use this skill when a user asks for:

- "scan this project before working"
- "make a task context pack"
- "check whether my agent rules are stale"
- "prepare this repo for GitHub"
- "make Codex/Claude/Cursor rules consistent"
- "continue after a long vibe coding session"

Codex should:

- run `scripts/vibe-agent.mjs` from this skill, or fall back to the `vibe-context` CLI
- read `exports/latest/TASK_PACK.md` when a task pack is generated
- avoid copying raw sessions into the answer
- summarize gate results in plain language
- only apply generated files when the user explicitly asks

## Claude Code Pattern

Place the skill folder in one of these locations when using Claude Code Agent Skills:

- project scope: `.claude/skills/vibe-context-os`
- user scope: `~/.claude/skills/vibe-context-os`

For custom slash commands, place the command templates from `agent-kit/claude-code/commands/` into `.claude/commands/`.

Recommended commands:

- `/vibe-preflight`: run status, drift, privacy audit, config doctor, and trace
- `/vibe-pack <task>`: generate and follow a task pack
- `/vibe-publish`: run publish/privacy/artifact/MCP gates and public bundle

## MCP Pattern

When an MCP client is the primary surface, start:

```bash
vibe-context mcp
```

Use:

- `context.status` first
- `context.pack` before a concrete implementation task
- `context.config_doctor` before editing agent rules
- `context.privacy_audit`, `context.artifact_audit`, and `context.mcp_audit` before public sharing
- `context.public_bundle` for GitHub or portfolio material

## Handoff Prompt

Use this prompt when handing a task pack to another coding agent:

```text
Continue this task using the Vibe Context Pack below.
Respect the safety boundary, use only cited files unless discovery is needed, and report changed files plus verification commands.
```

Then paste only the relevant `TASK_PACK.md` content.
