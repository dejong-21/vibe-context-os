import { analyze } from "./analyzer.js";
import { buildBudgetReport } from "./budget.js";
import { buildPrivacyAudit } from "./privacyAudit.js";
import { buildPublishReport } from "./publish.js";
import type { AnalysisResult } from "./types.js";

export type DriftStatus = "clean" | "review" | "critical";
export type OverallStatus = "ready" | "review" | "blocked";

export interface StatusReport {
  generatedAt: string;
  workspaceRoot: string;
  summary: AnalysisResult["summary"];
  overall: {
    status: OverallStatus;
    blockers: number;
    warnings: number;
    message: string;
  };
  drift: {
    status: DriftStatus;
    findings: number;
    critical: number;
  };
  publish: {
    status: "ready" | "review" | "blocked";
    blocked: number;
    warnings: number;
  };
  privacy: {
    status: "pass" | "warn" | "block";
    checkedFiles: number;
    findings: number;
  };
  budget: {
    totalEstimatedTokens: number;
    warnings: string[];
  };
  recommendations: string[];
}

function driftStatus(analysis: AnalysisResult): DriftStatus {
  if (analysis.driftFindings.some((finding) => finding.severity === "critical")) return "critical";
  if (analysis.driftFindings.length > 0) return "review";
  return "clean";
}

function overallMessage(status: OverallStatus): string {
  if (status === "blocked") return "Fix blockers before publishing generated context or public demo artifacts.";
  if (status === "review") return "Manual review is needed before publishing or applying generated agent files.";
  return "No blocking release or privacy issues were detected.";
}

export async function buildStatusReport(existingAnalysis?: AnalysisResult): Promise<StatusReport> {
  const analysis = existingAnalysis || (await analyze());
  const budget = buildBudgetReport(analysis);
  const publish = buildPublishReport(analysis, budget);
  const privacy = await buildPrivacyAudit();
  const criticalDrift = analysis.driftFindings.filter((finding) => finding.severity === "critical").length;
  const publishBlocked = publish.checks.filter((item) => item.severity === "block").length;
  const publishWarnings = publish.checks.filter((item) => item.severity === "warn").length;
  const blockers = publishBlocked + (privacy.status === "block" ? privacy.findings.length || 1 : 0);
  const warnings =
    publishWarnings +
    (privacy.status === "warn" ? privacy.findings.length || 1 : 0) +
    (analysis.driftFindings.length - criticalDrift) +
    budget.warnings.length;
  const overallStatus: OverallStatus = blockers > 0 ? "blocked" : warnings > 0 || publish.status === "review" ? "review" : "ready";

  return {
    generatedAt: analysis.generatedAt,
    workspaceRoot: analysis.workspaceRoot,
    summary: analysis.summary,
    overall: {
      status: overallStatus,
      blockers,
      warnings,
      message: overallMessage(overallStatus)
    },
    drift: {
      status: driftStatus(analysis),
      findings: analysis.driftFindings.length,
      critical: criticalDrift
    },
    publish: {
      status: publish.status,
      blocked: publishBlocked,
      warnings: publishWarnings
    },
    privacy: {
      status: privacy.status,
      checkedFiles: privacy.checkedFiles,
      findings: privacy.findings.length
    },
    budget: {
      totalEstimatedTokens: budget.totalEstimatedTokens,
      warnings: budget.warnings
    },
    recommendations: analysis.recommendations
  };
}

export function formatStatusReport(report: StatusReport): string {
  const recommendations = report.recommendations.length
    ? report.recommendations.map((item) => `- ${item}`).join("\n")
    : "- No immediate recommendations.";
  const budgetWarnings = report.budget.warnings.length ? `\n\nBudget warnings:\n${report.budget.warnings.map((item) => `- ${item}`).join("\n")}` : "";

  return `# Vibe Context Status

Workspace: ${report.workspaceRoot}
Overall: ${report.overall.status} (${report.overall.blockers} blockers, ${report.overall.warnings} warnings)
${report.overall.message}

Sources: ${report.summary.sources}
Sessions: ${report.summary.sessions}
Risks: ${report.summary.risks}
Drift: ${report.drift.status} (${report.drift.findings} findings, ${report.drift.critical} critical)
Publish: ${report.publish.status} (${report.publish.blocked} blockers, ${report.publish.warnings} warnings)
Privacy: ${report.privacy.status} (${report.privacy.findings} findings across ${report.privacy.checkedFiles} files)
Context budget: ~${report.budget.totalEstimatedTokens} tokens${budgetWarnings}

Recommended next steps:
${recommendations}
`;
}
