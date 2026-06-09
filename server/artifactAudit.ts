import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { config } from "./config.js";
import { redactText } from "./security.js";
import { safeRelative, shortHash } from "./utils.js";

export type ArtifactAuditSeverity = "pass" | "warn" | "block";

export interface ArtifactAuditFinding {
  id: string;
  severity: Exclude<ArtifactAuditSeverity, "pass">;
  title: string;
  file: string;
  detail: string;
  action: string;
}

export interface ArtifactAuditReport {
  status: ArtifactAuditSeverity;
  exportRoot: string;
  checkedFiles: number;
  findings: ArtifactAuditFinding[];
}

const auditInclude = ["**/*.{md,mdx,txt,json,yml,yaml,toml,js,jsx,ts,tsx}", "**/Dockerfile"];
const auditIgnore = ["**/.git/**", "**/node_modules/**", "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.webp", "**/*.gif", "**/*.mp4", "**/*.zip"];
const privatePathPatterns = [
  /\b[A-Z]:\\Users\\[^\\\s"')<>{}]+/gi,
  /\b[A-Z]:\/Users\/[^/\s"')<>{}]+/gi,
  /\/Users\/[^/\s"')<>{}]+/g,
  /\/home\/[^/\s"')<>{}]+/g
];

function finding(
  severity: Exclude<ArtifactAuditSeverity, "pass">,
  title: string,
  file: string,
  detail: string,
  action: string
): ArtifactAuditFinding {
  return {
    id: shortHash(`${severity}:${title}:${file}:${detail}`),
    severity,
    title,
    file,
    detail,
    action
  };
}

async function readText(filePath: string): Promise<string> {
  const stat = await fs.stat(filePath);
  if (stat.size > 1024 * 1024) return "";
  return fs.readFile(filePath, "utf8");
}

function hasPrivatePath(text: string): boolean {
  for (const pattern of privatePathPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      pattern.lastIndex = 0;
      return true;
    }
  }
  return false;
}

export async function buildArtifactAudit(exportRoot = config.exportRoot): Promise<ArtifactAuditReport> {
  const resolvedRoot = path.resolve(exportRoot);
  const files = await fg(auditInclude, {
    cwd: resolvedRoot,
    dot: true,
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: false,
    ignore: auditIgnore,
    absolute: true,
    suppressErrors: true
  });
  const findings: ArtifactAuditFinding[] = [];

  for (const absolutePath of files) {
    const relativePath = safeRelative(resolvedRoot, absolutePath);
    if (/\.jsonl$/i.test(relativePath) || /^sessions\//i.test(relativePath) || /\/sessions\//i.test(relativePath)) {
      findings.push(
        finding(
          "block",
          "Session log in generated artifacts",
          relativePath,
          "Generated release artifacts must not contain raw session logs.",
          "Remove session logs from export output before publishing."
        )
      );
      continue;
    }

    let text = "";
    try {
      text = await readText(absolutePath);
    } catch {
      continue;
    }
    if (!text) continue;

    const redactions = redactText(relativePath, text).findings;
    for (const redaction of redactions) {
      findings.push(
        finding(
          redaction.severity === "high" ? "block" : "warn",
          redaction.label,
          relativePath,
          `Secret-like value detected with fingerprint ${redaction.fingerprint}.`,
          "Remove or rotate the value before publishing generated artifacts."
        )
      );
    }

    if (hasPrivatePath(text)) {
      findings.push(
        finding(
          "block",
          "Private absolute path",
          relativePath,
          "A user-specific absolute path appears in generated release artifacts.",
          "Replace private absolute paths with placeholders before publishing."
        )
      );
    }
  }

  const status: ArtifactAuditSeverity = findings.some((item) => item.severity === "block")
    ? "block"
    : findings.some((item) => item.severity === "warn")
      ? "warn"
      : "pass";

  return {
    status,
    exportRoot: resolvedRoot,
    checkedFiles: files.length,
    findings
  };
}

export function formatArtifactAudit(report: ArtifactAuditReport): string {
  if (report.findings.length === 0) {
    return `# Generated Artifact Audit

Status: pass
Export root: ${report.exportRoot}
Checked files: ${report.checkedFiles}

No private paths, raw session logs, or secret-like values were detected in generated artifacts.
`;
  }

  return `# Generated Artifact Audit

Status: ${report.status}
Export root: ${report.exportRoot}
Checked files: ${report.checkedFiles}

${report.findings
  .map(
    (item) => `## [${item.severity}] ${item.title}

File: \`${item.file}\`

${item.detail}

Action: ${item.action}
`
  )
  .join("\n")}`;
}
