import type { AnalysisResult } from "./types.js";
import type { BudgetReport } from "./budget.js";

export type PublishCheckSeverity = "pass" | "warn" | "block";

export interface PublishCheck {
  id: string;
  severity: PublishCheckSeverity;
  title: string;
  detail: string;
  action: string;
}

export interface PublishReport {
  status: "ready" | "review" | "blocked";
  checks: PublishCheck[];
}

function check(id: string, severity: PublishCheckSeverity, title: string, detail: string, action: string): PublishCheck {
  return { id, severity, title, detail, action };
}

export function buildPublishReport(analysis: AnalysisResult, budget: BudgetReport): PublishReport {
  const checks: PublishCheck[] = [];
  const criticalDrift = analysis.driftFindings.filter((finding) => finding.severity === "critical");
  const hasRules = analysis.summary.ruleFiles > 0;

  checks.push(
    check(
      "secret-redactions",
      analysis.summary.risks > 0 ? "block" : "pass",
      "Secret redactions",
      analysis.summary.risks > 0
        ? `${analysis.summary.risks} secret-like values were redacted during scanning.`
        : "No secret-like values were detected during scanning.",
      analysis.summary.risks > 0 ? "Review redaction findings before publishing session-derived artifacts, screenshots, or copied context excerpts." : "No action required."
    )
  );

  checks.push(
    check(
      "critical-drift",
      criticalDrift.length > 0 ? "block" : "pass",
      "Critical context drift",
      criticalDrift.length > 0 ? `${criticalDrift.length} critical drift findings exist.` : "No critical drift findings detected.",
      criticalDrift.length > 0 ? "Open CONTEXT_DRIFT_REPORT.md and fix blockers before release." : "No action required."
    )
  );

  checks.push(
    check(
      "agent-rules",
      hasRules ? "pass" : "warn",
      "Checked-in agent rules",
      hasRules ? "The workspace contains existing agent instruction files." : "No checked-in AGENTS.md, CLAUDE.md, Cursor rules, or GitHub instructions were found.",
      hasRules ? "Keep generated rules synchronized." : "Review exports/latest and apply the generated rules you actually want to commit."
    )
  );

  checks.push(
    check(
      "context-budget",
      budget.totalEstimatedTokens > 120_000 ? "warn" : "pass",
      "Context budget",
      `Estimated full-context budget is ~${budget.totalEstimatedTokens} tokens.`,
      budget.totalEstimatedTokens > 120_000 ? "Use TASK_PACK.md instead of full machine-readable maps for agent handoffs." : "Budget is reasonable for summarized review flows."
    )
  );

  checks.push(
    check(
      "private-paths",
      analysis.workspaceRoot.toLowerCase().includes("users") ? "warn" : "pass",
      "Private local paths",
      analysis.workspaceRoot.toLowerCase().includes("users")
        ? "The workspace root appears to be a user-specific local path."
        : "The workspace root does not look user-specific.",
      "Before publishing screenshots or JSON, remove user-specific absolute paths or replace them with placeholders."
    )
  );

  const status = checks.some((item) => item.severity === "block") ? "blocked" : checks.some((item) => item.severity === "warn") ? "review" : "ready";
  return { status, checks };
}

export function formatPublishReport(report: PublishReport): string {
  return `# Publish Check Report

Status: ${report.status}

${report.checks
  .map(
    (item) => `## [${item.severity}] ${item.title}

${item.detail}

Action: ${item.action}
`
  )
  .join("\n")}
`;
}

export function formatReleasePlan(report: PublishReport): string {
  const blocked = report.checks.filter((item) => item.severity === "block");
  const warnings = report.checks.filter((item) => item.severity === "warn");
  return `# Release Plan

Status: ${report.status}

## Commit Candidates

- Source files under \`server/\` and \`src/\`
- \`README.md\`
- \`package.json\` and \`package-lock.json\`
- \`Dockerfile\`
- \`codex-skill/vibe-context-os/SKILL.md\`
- Reviewed files from \`exports/latest\`, especially generated rules and public summaries

## Avoid Committing By Default

- \`node_modules/\`
- \`dist/\` and \`dist-server/\`
- Raw session-derived exports when publish status is blocked or review
- Raw session logs
- Local screenshots or docs containing private absolute paths

## Blockers

${blocked.length ? blocked.map((item) => `- ${item.title}: ${item.action}`).join("\n") : "- No blockers."}

## Manual Review

${warnings.length ? warnings.map((item) => `- ${item.title}: ${item.action}`).join("\n") : "- No warnings."}
`;
}
