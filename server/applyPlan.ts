import path from "node:path";
import { config } from "./config.js";
import { pathExists } from "./utils.js";

export interface ApplyTarget {
  artifact: string;
  target: string;
  targetExists: boolean;
  advice: string;
}

const mappings = [
  ["AGENTS.generated.md", "AGENTS.md", "Codex/OpenAI agents"],
  ["CLAUDE.generated.md", "CLAUDE.md", "Claude Code"],
  ["GEMINI.generated.md", "GEMINI.md", "Gemini CLI"],
  [".cursor/rules/vibe-context.generated.mdc", ".cursor/rules/vibe-context.mdc", "Cursor"],
  [".clinerules.generated.md", ".clinerules", "Cline/Roo"],
  [".continue/vibe-context-check.md", ".continue/vibe-context-check.md", "Continue"],
  [".github/copilot-instructions.md", ".github/copilot-instructions.md", "GitHub Copilot"],
  [".claude/skills/vibe-context-os/SKILL.md", ".claude/skills/vibe-context-os/SKILL.md", "Claude Code skill"],
  [".mcp.vibe-context.example.json", ".mcp.json", "MCP client"]
] as const;

export async function buildApplyPlan(): Promise<ApplyTarget[]> {
  const targets: ApplyTarget[] = [];
  for (const [artifact, target, label] of mappings) {
    const targetPath = path.join(config.workspaceRoot, target);
    const exists = await pathExists(targetPath);
    targets.push({
      artifact,
      target,
      targetExists: exists,
      advice: exists
        ? `${label} target already exists. Diff manually before applying generated content.`
        : `${label} target does not exist. Safe to create after reviewing generated content.`
    });
  }
  return targets;
}

export function formatApplyPlan(targets: ApplyTarget[]): string {
  return `# Apply Plan

This is a dry-run. No files were written.

${targets
  .map(
    (item) => `## ${item.target}

- Artifact: \`exports/latest/${item.artifact}\`
- Target exists: ${item.targetExists ? "yes" : "no"}
- Advice: ${item.advice}
`
  )
  .join("\n")}
`;
}
