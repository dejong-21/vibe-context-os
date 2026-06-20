import type { StatusReport } from "./status.js";

export interface BadgeReport {
  status: StatusReport["overall"]["status"];
  color: "brightgreen" | "yellow" | "red";
  label: string;
  message: string;
  url: string;
  markdown: string;
  summary: {
    blockers: number;
    warnings: number;
    sources: number;
    privacy: StatusReport["privacy"]["status"];
    drift: StatusReport["drift"]["status"];
  };
}

function colorForStatus(status: StatusReport["overall"]["status"]): BadgeReport["color"] {
  if (status === "ready") return "brightgreen";
  if (status === "blocked") return "red";
  return "yellow";
}

function shieldsEscape(value: string): string {
  return encodeURIComponent(value.replace(/-/g, "--"));
}

export function buildBadgeReport(report: StatusReport): BadgeReport {
  const label = "agent-ready";
  const message = report.overall.status;
  const color = colorForStatus(report.overall.status);
  const url = `https://img.shields.io/badge/${shieldsEscape(label)}-${shieldsEscape(message)}-${color}`;
  return {
    status: report.overall.status,
    color,
    label,
    message,
    url,
    markdown: `[![${label}: ${message}](${url})](https://github.com/dejong-21/vibe-context-os)`,
    summary: {
      blockers: report.overall.blockers,
      warnings: report.overall.warnings,
      sources: report.summary.sources,
      privacy: report.privacy.status,
      drift: report.drift.status
    }
  };
}

export function formatBadgeReport(report: BadgeReport): string {
  return `# Agent Readiness Badge

${report.markdown}

Status: ${report.status}
Blockers: ${report.summary.blockers}
Warnings: ${report.summary.warnings}
Sources: ${report.summary.sources}
Privacy: ${report.summary.privacy}
Drift: ${report.summary.drift}

Markdown:

\`\`\`markdown
${report.markdown}
\`\`\`
`;
}
