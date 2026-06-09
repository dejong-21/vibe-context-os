---
name: vibe-context-os
description: Agent-native workflow for AI coding context engineering. Use when Codex or another coding agent needs to scan a repository, build a task-specific context pack, check privacy/publish/drift/MCP risk, align AGENTS.md/CLAUDE.md/Cursor/Gemini/Cline/Continue/Copilot/MCP rules, or hand work safely between Codex, Claude Code, Cursor, Gemini CLI, Aider, Cline, and MCP-capable agents.
---

# Vibe Context OS

Use this skill as an agent-native context preflight. Prefer it inside the coding session before opening a web dashboard.

## Fast Path

From the target project root, run the bundled helper when available:

```bash
node <this-skill>/scripts/vibe-agent.mjs preflight --workspace .
node <this-skill>/scripts/vibe-agent.mjs pack --workspace . --task "describe the current coding task"
```

If the helper is not available, run the CLI directly:

```bash
vibe-context status --workspace .
vibe-context drift --workspace .
vibe-context privacy-audit --workspace .
vibe-context pack --workspace . --task "describe the current coding task"
```

Use `npm run vibe -- ...` instead of `vibe-context ...` when working inside the `vibe-context-os` source repository.

## Agent Loop

1. Identify the approved workspace root. Do not scan parent folders by accident.
2. Run preflight:

```bash
node <this-skill>/scripts/vibe-agent.mjs preflight --workspace <workspace>
```

3. For the concrete task, generate a task pack:

```bash
node <this-skill>/scripts/vibe-agent.mjs pack --workspace <workspace> --task "<task>"
```

4. Read `exports/latest/TASK_PACK.md` and use it as the task contract.
5. Make code changes only after the task pack and privacy/drift status are understood.
6. Before sharing or publishing, run:

```bash
node <this-skill>/scripts/vibe-agent.mjs publish --workspace <workspace>
```

7. Report changed files, generated files, and verification commands.

## When To Use Each Mode

- `preflight`: first step in a repository, before large edits, after context compaction, or when agent rules may be stale.
- `pack`: before implementing a specific task or handing work to another agent.
- `publish`: before GitHub sharing, README screenshots, public bundles, npm packaging, or portfolio output.
- `config`: when Codex/Claude/Cursor/Gemini/Cline/Continue/Copilot/MCP rules disagree or are missing.
- `trace`: when a task depends on long-running local AI coding sessions.

## Guardrails

- Keep raw sessions, `.env`, screenshots, local usernames, and private absolute paths private.
- Do not auto-apply generated rules to `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, `.mcp.json`, or other agent files.
- Treat `exports/latest` as working output and `exports/public` as reviewable publish material.
- If privacy or artifact audit blocks, stop publishing and remove the finding before continuing.
- If MCP audit warns, review command, args, package pinning, env keys, and filesystem/network reach.
- Prefer task packs over dumping whole directories or chat logs into model context.

## Optional References

- Read `references/agent-native.md` when deciding how to use this skill across Codex, Claude Code, Cursor, MCP clients, or handoff workflows.
