import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { config } from "./config.js";
import { redactText } from "./security.js";
import { safeRelative, shortHash } from "./utils.js";

export type PrivacyAuditSeverity = "pass" | "warn" | "block";

export interface PrivacyAuditFinding {
  id: string;
  severity: Exclude<PrivacyAuditSeverity, "pass">;
  title: string;
  file: string;
  detail: string;
  action: string;
}

export interface PrivacyAuditReport {
  status: PrivacyAuditSeverity;
  checkedFiles: number;
  findings: PrivacyAuditFinding[];
}

const auditInclude = [
  "**/.env",
  "**/.env.*",
  "**/*.jsonl",
  "**/*.{md,mdx,txt,json,yml,yaml,toml,ts,tsx,js,jsx,py,css,html}",
  "Dockerfile",
  ".github/**/*",
  ".cursor/rules/**/*",
  ".vibe/**/*",
  "codex-skill/**/*"
];

const auditIgnore = [
  "**/.git/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/dist-server/**",
  "**/exports/**",
  "**/coverage/**",
  "**/*.png",
  "**/*.jpg",
  "**/*.jpeg",
  "**/*.webp",
  "**/*.gif",
  "**/*.mp4",
  "**/*.zip"
];

const privatePathPatterns = [
  /\b[A-Z]:\\Users\\[^\\\s"')<>{}]+/gi,
  /\b[A-Z]:\/Users\/[^/\s"')<>{}]+/gi,
  /\/Users\/[^/\s"')<>{}]+/g,
  /\/home\/[^/\s"')<>{}]+/g
];

function finding(
  severity: Exclude<PrivacyAuditSeverity, "pass">,
  title: string,
  file: string,
  detail: string,
  action: string
): PrivacyAuditFinding {
  return {
    id: shortHash(`${severity}:${title}:${file}:${detail}`),
    severity,
    title,
    file,
    detail,
    action
  };
}

function isAllowedExample(file: string, text: string): boolean {
  if (file === ".env.example") return true;
  if (file.startsWith("docs/") && text.includes("/absolute/path/to/your")) return true;
  return false;
}

async function readText(filePath: string): Promise<string> {
  const stat = await fs.stat(filePath);
  if (stat.size > 512 * 1024) return "";
  return fs.readFile(filePath, "utf8");
}

export async function buildPrivacyAudit(): Promise<PrivacyAuditReport> {
  const files = await fg(auditInclude, {
    cwd: config.workspaceRoot,
    dot: true,
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: false,
    ignore: auditIgnore,
    absolute: true,
    suppressErrors: true
  });

  const findings: PrivacyAuditFinding[] = [];

  for (const absolutePath of files) {
    const relativePath = safeRelative(config.workspaceRoot, absolutePath);
    if (/^sessions\//i.test(relativePath) || /\.jsonl$/i.test(relativePath)) {
      findings.push(
        finding(
          "block",
          "Session log tracked by source audit",
          relativePath,
          "Session logs should stay outside source-controlled release material.",
          "Move session logs out of the repository or add them to ignore rules."
        )
      );
      continue;
    }

    if (/^\.env($|\.)/i.test(relativePath) && relativePath !== ".env.example") {
      findings.push(
        finding(
          "block",
          "Environment file present",
          relativePath,
          "Environment files commonly contain secrets or private paths.",
          "Remove this file from publishable source material."
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
          "Remove or rotate the value before publishing."
        )
      );
    }

    if (!isAllowedExample(relativePath, text)) {
      for (const pattern of privatePathPatterns) {
        if (pattern.test(text)) {
          findings.push(
            finding(
              "warn",
              "Private absolute path",
              relativePath,
              "A user-specific absolute path appears in publishable source material.",
              "Replace private absolute paths with placeholders."
            )
          );
          pattern.lastIndex = 0;
          break;
        }
        pattern.lastIndex = 0;
      }
    }
  }

  const status: PrivacyAuditSeverity = findings.some((item) => item.severity === "block")
    ? "block"
    : findings.some((item) => item.severity === "warn")
      ? "warn"
      : "pass";

  return {
    status,
    checkedFiles: files.length,
    findings
  };
}

export function formatPrivacyAudit(report: PrivacyAuditReport): string {
  if (report.findings.length === 0) {
    return `# Privacy Audit

Status: pass
Checked files: ${report.checkedFiles}

No publish-blocking private paths, secrets, session logs, or environment files were detected.
`;
  }

  return `# Privacy Audit

Status: ${report.status}
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
