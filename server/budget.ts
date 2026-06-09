import type { AnalysisResult, CodingSession, SourceFile } from "./types.js";

export interface BudgetRow {
  name: string;
  kind: "sources" | "sessions" | "rules" | "risks" | "drift" | "pack";
  items: number;
  chars: number;
  estimatedTokens: number;
  recommendation: string;
}

export interface BudgetReport {
  totalEstimatedTokens: number;
  rows: BudgetRow[];
  warnings: string[];
}

function estimateTokens(text: string): number {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const nonCjk = Math.max(0, text.length - cjk);
  return Math.ceil(cjk * 1.2 + nonCjk / 4);
}

function sourceText(source: SourceFile): string {
  return `${source.relativePath}\n${source.kind}\n${source.snippet}`;
}

function sessionText(session: CodingSession): string {
  return `${session.title}\n${session.summary}\n${session.tags.join(" ")}`;
}

function row(name: string, kind: BudgetRow["kind"], items: number, chars: number, recommendation: string): BudgetRow {
  return {
    name,
    kind,
    items,
    chars,
    estimatedTokens: estimateTokens("x".repeat(chars)),
    recommendation
  };
}

export function buildBudgetReport(analysis: AnalysisResult): BudgetReport {
  const ruleSources = analysis.sources.filter((source) => ["agent-rule", "cursor-rule", "claude-rule", "github-instruction"].includes(source.kind));
  const docSources = analysis.sources.filter((source) => ["doc", "manifest", "config"].includes(source.kind));
  const codeSources = analysis.sources.filter((source) => source.kind === "code");
  const recentSessions = analysis.sessions.slice(0, 25);

  const rows = [
    row(
      "Agent rules and instructions",
      "rules",
      ruleSources.length,
      ruleSources.map(sourceText).join("\n").length,
      ruleSources.length === 0 ? "Generate rules before relying on cross-agent handoffs." : "Keep as always-on context."
    ),
    row(
      "Docs and manifests",
      "sources",
      docSources.length,
      docSources.map(sourceText).join("\n").length,
      "Use for repo map and package scripts; avoid dumping full docs into task prompts."
    ),
    row(
      "Code snippets",
      "sources",
      codeSources.length,
      codeSources.map(sourceText).join("\n").length,
      "Select task-relevant files only; full code context is too expensive."
    ),
    row(
      "Recent session summaries",
      "sessions",
      recentSessions.length,
      recentSessions.map(sessionText).join("\n").length,
      "Summaries are useful; raw sessions should stay private and redacted."
    ),
    row(
      "Risk and drift summaries",
      "drift",
      analysis.risks.length + analysis.driftFindings.length,
      JSON.stringify({ risks: analysis.risks.slice(0, 20), drift: analysis.driftFindings }, null, 2).length,
      "Keep in review context; critical findings block public release."
    )
  ];

  const totalEstimatedTokens = rows.reduce((sum, item) => sum + item.estimatedTokens, 0);
  const warnings: string[] = [];
  if (totalEstimatedTokens > 120_000) warnings.push("The full context map is too large for routine agent prompts; use task packs.");
  if (analysis.summary.risks > 0) warnings.push("Secret-like redactions exist; do not publish session-derived excerpts or private debugging artifacts.");
  if (analysis.driftFindings.some((finding) => finding.severity === "critical")) warnings.push("Critical drift findings exist; run publish-check before release.");

  return { totalEstimatedTokens, rows, warnings };
}

export function formatBudgetReport(report: BudgetReport): string {
  return `# Context Budget Report

Estimated full-context tokens: ${report.totalEstimatedTokens}

## Segments

${report.rows
  .map(
    (item) => `- ${item.name}: ${item.items} items, ~${item.estimatedTokens} tokens. ${item.recommendation}`
  )
  .join("\n")}

## Warnings

${report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- No budget warnings."}
`;
}
