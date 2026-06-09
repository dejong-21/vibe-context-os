---
description: Generate and follow a Vibe Context OS task pack for a concrete coding task.
argument-hint: "\"task description\""
allowed-tools: Bash, Read, Grep, Glob
---

Generate a task pack for:

```text
$ARGUMENTS
```

Prefer the installed skill helper:

```bash
node .claude/skills/vibe-context-os/scripts/vibe-agent.mjs pack --workspace . --task "$ARGUMENTS"
```

If the helper is unavailable, run:

```bash
vibe-context pack --workspace . --task "$ARGUMENTS"
```

Then read `exports/latest/TASK_PACK.md` and use it as the working contract before editing files.

Report:

- task pack path
- relevant files or rules cited by the pack
- safety boundary
- verification commands to run after implementation

If the task is empty, ask the user for a concrete task before generating the pack.
