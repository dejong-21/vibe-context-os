---
description: Run Vibe Context OS publish, privacy, artifact, and MCP gates before public sharing.
argument-hint: "[workspace]"
allowed-tools: Bash, Read, Grep, Glob
---

Run public-sharing gates for `$ARGUMENTS` if provided, otherwise for the current project root.

Use `.` when `$ARGUMENTS` is empty.

Prefer the installed skill helper:

```bash
node .claude/skills/vibe-context-os/scripts/vibe-agent.mjs publish --workspace .
```

Replace `.` with `$ARGUMENTS` only when the user provided a workspace.

If the helper is unavailable, run the CLI checks directly:

```bash
vibe-context publish-check --workspace .
vibe-context privacy-audit --workspace .
vibe-context public-bundle --workspace .
vibe-context artifact-audit --workspace .
vibe-context mcp-audit --workspace .
```

Summarize:

- whether public sharing is ready, review, or blocked
- public bundle path
- blockers and warnings
- files that must not be committed

Do not claim artifacts are safe if any audit reports a blocker.
