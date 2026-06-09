import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { RedactionFinding, SourceFile, SourceKind } from "./types.js";
import { config, defaultIgnore } from "./config.js";
import { redactText } from "./security.js";
import { safeRelative, sha256, shortHash } from "./utils.js";
import { loadWorkspaceConfig } from "./workspaceConfig.js";

const includePatterns = [
  "**/AGENTS.md",
  "**/CLAUDE.md",
  "**/GEMINI.md",
  "**/.clinerules",
  "**/.clinerules/**/*.{md,txt}",
  "**/.roo/rules/**/*.{md,mdx,txt}",
  "**/.continue/**/*.{md,mdx,yml,yaml,json}",
  "**/.claude/**/*.{md,mdx,json,yml,yaml}",
  "**/.vibe/**/*.{md,mdx,json,yml,yaml,toml,txt}",
  "**/.cursor/rules/**/*.{md,mdc}",
  "**/.github/**/*.{md,mdx,yml,yaml}",
  "**/README.md",
  "**/docs/**/*.{md,mdx,txt}",
  "**/*.{md,mdx,txt,json,yml,yaml,toml}",
  "**/*.{ts,tsx,js,jsx,py}",
  "**/Dockerfile",
  "**/requirements*.txt",
  "**/package.json",
  "**/pyproject.toml"
];

function classify(relativePath: string): SourceKind {
  const normalized = relativePath.toLowerCase();
  if (normalized.endsWith("agents.md")) return "agent-rule";
  if (normalized.endsWith("claude.md")) return "claude-rule";
  if (normalized.endsWith("gemini.md")) return "agent-rule";
  if (normalized.includes("/.clinerules") || normalized.includes("/.roo/rules/")) return "agent-rule";
  if (normalized.includes("/.continue/")) return "github-instruction";
  if (normalized.includes("/.vibe/")) return "github-instruction";
  if (normalized.includes("/.cursor/rules/") || normalized.startsWith(".cursor/rules/")) return "cursor-rule";
  if (normalized.includes("/.github/") && /\.(md|mdx|yml|yaml)$/.test(normalized)) return "github-instruction";
  if (/package\.json$|pyproject\.toml$|requirements.*\.txt$|dockerfile$/.test(normalized)) return "manifest";
  if (/readme\.md$|\/docs\//.test(normalized)) return "doc";
  if (/\.(yml|yaml|json|toml)$/.test(normalized)) return "config";
  if (/\.(ts|tsx|js|jsx|py)$/.test(normalized)) return "code";
  if (/\.(md|mdx|txt)$/.test(normalized)) return "doc";
  return "other";
}

function shouldReadText(relativePath: string, size: number, maxFileBytes: number): boolean {
  if (size > maxFileBytes) return false;
  if (relativePath.toLowerCase().endsWith("package-lock.json")) return false;
  return true;
}

export async function scanWorkspace(): Promise<{ sources: SourceFile[]; risks: RedactionFinding[]; warnings: string[] }> {
  const warnings: string[] = [];
  const workspaceConfig = await loadWorkspaceConfig();
  const scanConfig = workspaceConfig.scan || {};
  const patterns = scanConfig.include?.length ? [...includePatterns, ...scanConfig.include] : includePatterns;
  const ignore = [...defaultIgnore, ...(scanConfig.exclude || [])];
  const maxFiles = scanConfig.maxFiles || config.maxFiles;
  const maxFileBytes = scanConfig.maxFileBytes || config.maxFileBytes;
  const entries = await fg(patterns, {
    cwd: config.workspaceRoot,
    dot: true,
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: false,
    ignore,
    absolute: true,
    suppressErrors: true
  });

  const limited = entries.slice(0, maxFiles);
  if (entries.length > limited.length) {
    warnings.push(`Scan limited to ${maxFiles} files out of ${entries.length} matched candidates.`);
  }

  const sources: SourceFile[] = [];
  const risks: RedactionFinding[] = [];

  for (const absolutePath of limited) {
    try {
      const stat = await fs.lstat(absolutePath);
      if (!stat.isFile() || stat.isSymbolicLink()) continue;
      const relativePath = safeRelative(config.workspaceRoot, absolutePath);
      const kind = classify(relativePath);
      const bytes = shouldReadText(relativePath, stat.size, maxFileBytes) ? await fs.readFile(absolutePath) : Buffer.from("");
      const rawText = bytes.toString("utf8");
      const { text, findings } = redactText(relativePath, rawText.slice(0, 16_000));
      risks.push(...findings);
      sources.push({
        id: shortHash(`${relativePath}:${stat.mtimeMs}:${stat.size}`),
        kind,
        absolutePath,
        relativePath,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        sha256: sha256(bytes.length > 0 ? bytes : `${relativePath}:${stat.size}:${stat.mtimeMs}`),
        snippet: text.slice(0, 4_000),
        redactionCount: findings.length
      });
    } catch (error) {
      warnings.push(`Skipped ${absolutePath}: ${(error as Error).message}`);
    }
  }

  return { sources, risks, warnings };
}
