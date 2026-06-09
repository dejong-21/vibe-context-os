---
description: Run Vibe Context OS preflight for the current project before coding.
argument-hint: "[workspace]"
allowed-tools: Bash, Read, Grep, Glob
---

Run Vibe Context OS preflight for `$ARGUMENTS` if provided, otherwise for the current project root.

Steps:

1. Resolve the workspace root. Do not scan parent folders unless the user explicitly asks.
2. Prefer the installed skill helper:

```bash
node .claude/skills/vibe-context-os/scripts/vibe-agent.mjs preflight --workspace .
```

Replace `.` with `$ARGUMENTS` only when the user provided a workspace.

If the helper is unavailable, run the CLI checks directly:

```bash
vibe-context status --workspace .
vibe-context drift --workspace .
vibe-context privacy-audit --workspace .
vibe-context config-doctor --workspace .
vibe-context trace --workspace .
```

If `$ARGUMENTS` is empty, use `.` as the workspace.

Summarize:

- overall readiness
- privacy status
- drift findings
- config doctor score
- whether a task pack should be generated before editing

Do not publish raw session text, private paths, `.env` values, or secrets.
