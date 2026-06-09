import path from "node:path";
import type { DriftFinding, RedactionFinding, SourceFile } from "./types.js";
import { shortHash } from "./utils.js";

function ruleSources(sources: SourceFile[]): SourceFile[] {
  return sources.filter((source) => ["agent-rule", "cursor-rule", "claude-rule", "github-instruction"].includes(source.kind));
}

function extractReferencedPaths(text: string): string[] {
  const references = new Set<string>();
  const patterns = [
    /`([^`]+\.(?:ts|tsx|js|jsx|py|md|mdx|json|yml|yaml|toml|txt|sh|ps1|cmd|bat))`/g,
    /\b((?:src|server|app|docs|scripts|tests|test|\.github|\.cursor|\.claude|codex-skill)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9_-]+)\b/g
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const value = match[1].replace(/\\/g, "/").replace(/^\.\/+/, "");
      if (value.includes("/") && !value.includes("..") && value.length < 180) references.add(value);
    }
  }
  return [...references];
}

function packageScripts(sources: SourceFile[]): Record<string, string> {
  const packageJson = sources.find((source) => source.relativePath === "vibe-context-os/package.json" || source.relativePath === "package.json");
  if (!packageJson) return {};
  try {
    const parsed = JSON.parse(packageJson.snippet) as { scripts?: Record<string, string> };
    return parsed.scripts || {};
  } catch {
    return {};
  }
}

function hasText(sources: SourceFile[], words: string[]): boolean {
  const text = sources.map((source) => `${source.relativePath}\n${source.snippet}`).join("\n").toLowerCase();
  return words.some((word) => text.includes(word.toLowerCase()));
}

export function detectDrift(sources: SourceFile[], risks: RedactionFinding[]): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const existingPaths = new Set(sources.map((source) => source.relativePath.replace(/\\/g, "/")));
  const rules = ruleSources(sources);
  const allRuleText = rules.map((source) => source.snippet).join("\n");
  const scripts = packageScripts(sources);

  if (rules.length === 0) {
    findings.push({
      id: "missing-agent-rules",
      severity: "warning",
      title: "No checked-in agent rules found",
      detail: "The scanner did not find AGENTS.md, CLAUDE.md, Cursor rules, or GitHub Copilot instructions in the approved workspace.",
      recommendation: "Export the generated rules bundle, review it, then apply the relevant files to the repository.",
      evidence: ["exports/latest/AGENTS.generated.md", "exports/latest/CLAUDE.generated.md", "exports/latest/.cursor/rules/vibe-context.generated.mdc"]
    });
  }

  const referenced = rules.flatMap((source) =>
    extractReferencedPaths(source.snippet).map((reference) => ({ source: source.relativePath, reference }))
  );
  const missing = referenced.filter(({ reference }) => !existingPaths.has(reference));
  for (const item of missing.slice(0, 12)) {
    findings.push({
      id: shortHash(`missing-ref:${item.source}:${item.reference}`),
      severity: "critical",
      title: "Rule references a missing path",
      detail: `A rule file references \`${item.reference}\`, but it was not found in the scanned workspace.`,
      recommendation: "Update the rule or restore the referenced file before relying on this agent context.",
      evidence: [item.source, item.reference]
    });
  }

  for (const scriptName of ["test", "lint", "build"]) {
    if (scripts[scriptName] && !new RegExp(`\\b${scriptName}\\b`, "i").test(allRuleText)) {
      findings.push({
        id: `script-not-mentioned-${scriptName}`,
        severity: scriptName === "test" ? "warning" : "info",
        title: `Rules do not mention npm ${scriptName}`,
        detail: `package.json defines \`${scriptName}\`, but current agent rules do not tell agents when to run it.`,
        recommendation: `Add a verification rule that asks agents to run \`npm run ${scriptName}\` for relevant changes.`,
        evidence: [`package.json scripts.${scriptName}: ${scripts[scriptName]}`]
      });
    }
  }

  const hasCodex = rules.some((source) => source.kind === "agent-rule");
  const hasClaude = rules.some((source) => source.kind === "claude-rule");
  const hasCursor = rules.some((source) => source.kind === "cursor-rule");
  if (rules.length > 0 && (!hasCodex || !hasClaude || !hasCursor)) {
    findings.push({
      id: "incomplete-agent-format-coverage",
      severity: "info",
      title: "Agent rule coverage is incomplete",
      detail: "The workspace has some agent instructions, but not all common Codex, Claude Code, and Cursor formats.",
      recommendation: "Use the context compiler export to keep agent-specific files synchronized from one source of truth.",
      evidence: [`Codex=${hasCodex}`, `Claude=${hasClaude}`, `Cursor=${hasCursor}`]
    });
  }

  if (risks.length > 0) {
    findings.push({
      id: "unreviewed-redactions",
      severity: "critical",
      title: "Secret-like redactions require review",
      detail: `${risks.length} secret-like values were detected and redacted during scanning.`,
      recommendation: "Do not publish session-derived excerpts, screenshots, or private debugging artifacts until these findings are reviewed.",
      evidence: risks.slice(0, 5).map((risk) => `${risk.label} in ${risk.sourcePath}`)
    });
  }

  if (!hasText(sources, ["mcp", "model context protocol", "tool allowlist", "allowed tools"])) {
    findings.push({
      id: "missing-mcp-allowlist",
      severity: "info",
      title: "No MCP or tool allowlist policy found",
      detail: "MCP tools are powerful and can expose local files, browser state, or credentials if used without boundaries.",
      recommendation: "Add a tool policy section that distinguishes safe read-only tools, export tools, and approval-required tools.",
      evidence: ["AGENTS.generated.md", "REVIEW_CHECKLIST.md"]
    });
  }

  if (!hasText(sources, ["handoff", "continue this task", "task_pack", "TASK_PACK"])) {
    findings.push({
      id: "missing-handoff-protocol",
      severity: "info",
      title: "No cross-agent handoff protocol found",
      detail: "Community workflows increasingly move tasks between Codex, Claude Code, Cursor, Gemini CLI, Aider, and Cline.",
      recommendation: "Use generated TASK_PACK.md as the standard handoff artifact for cross-agent continuation.",
      evidence: ["exports/latest/TASK_PACK.md"]
    });
  }

  return findings;
}

export function formatDriftReport(findings: DriftFinding[]): string {
  if (findings.length === 0) return "No context drift findings detected.\n";
  return `# Context Drift Report

${findings
  .map(
    (finding) => `## [${finding.severity}] ${finding.title}

${finding.detail}

Recommendation: ${finding.recommendation}

Evidence:
${finding.evidence.map((item) => `- ${item}`).join("\n")}
`
  )
  .join("\n")}
`;
}
