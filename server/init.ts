import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { ensureInside } from "./utils.js";

export interface InitResult {
  root: string;
  files: Array<{ path: string; created: boolean }>;
}

const files: Array<{ relativePath: string; content: string }> = [
  {
    relativePath: ".vibe/config.json",
    content: JSON.stringify(
      {
        schemaVersion: 1,
        generatedBy: "Vibe Coding Context OS",
        scan: {
          includeCodexSessions: true,
          sessionLookbackDays: 120,
          maxFiles: 900,
          maxFileBytes: 262144,
          include: [],
          exclude: ["**/.env*", "**/secrets/**", "**/*secret*"]
        },
        publish: {
          blockOnRedactions: true,
          blockOnCriticalDrift: true,
          requireHumanReviewBeforeApplyingRules: true
        }
      },
      null,
      2
    ) + "\n"
  },
  {
    relativePath: ".vibe/context-source.md",
    content: `# Vibe Context Source

Use this file as the human-reviewed source of truth before applying generated agent rules.

## Project Mission

- Describe what this repository does.
- Describe who uses it.
- Describe what AI coding agents must preserve.

## Verification Commands

- npm run lint
- npm run build
- npm run smoke

## Tool Policy

- File writes should stay scoped to the requested task.
- Generated rules must be reviewed before being copied into checked-in agent files.
- MCP/browser/network tools need task-level justification.
`
  },
  {
    relativePath: ".vibe/README.md",
    content: `# .vibe

This folder stores local-first context engineering configuration for Vibe Coding Context OS.

Recommended loop:

1. Run \`npm run vibe -- scan\`.
2. Run \`npm run vibe -- drift\`.
3. Run \`npm run vibe -- pack --task "..."\` for handoff.
4. Run \`npm run vibe -- publish-check\` before making artifacts public.
`
  }
];

export async function initWorkspace(): Promise<InitResult> {
  const created: InitResult["files"] = [];
  const root = path.join(config.workspaceRoot, ".vibe");
  await ensureInside(config.workspaceRoot, root);
  await fs.mkdir(root, { recursive: true });

  for (const file of files) {
    const target = path.join(config.workspaceRoot, file.relativePath);
    await ensureInside(config.workspaceRoot, target);
    let didCreate = false;
    try {
      await fs.access(target);
    } catch {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.content, "utf8");
      didCreate = true;
    }
    created.push({ path: target, created: didCreate });
  }

  return { root, files: created };
}
