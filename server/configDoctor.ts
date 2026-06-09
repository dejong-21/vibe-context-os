import fs from "node:fs/promises";
import path from "node:path";
import type { AnalysisResult } from "./types.js";
import { buildApplyPlan } from "./applyPlan.js";
import { config } from "./config.js";
import { pathExists, shortHash } from "./utils.js";

export type ConfigDoctorStatus = "ready" | "review" | "missing";
export type ConfigSurfaceStatus = "present" | "missing";
export type ConfigDoctorSeverity = "info" | "warn" | "block";
export type ConfigFixKind = "create-target" | "append-safety" | "append-verification" | "append-context" | "append-tool-policy" | "append-handoff";

export interface ConfigSurface {
  id: string;
  label: string;
  target: string;
  artifact: string;
  status: ConfigSurfaceStatus;
  signals: {
    safety: boolean;
    verification: boolean;
    context: boolean;
    tools: boolean;
    handoff: boolean;
  };
  evidence: string[];
}

export interface ConfigDoctorFinding {
  id: string;
  severity: ConfigDoctorSeverity;
  title: string;
  detail: string;
  action: string;
  evidence: string[];
}

export interface ConfigDoctorFix {
  id: string;
  kind: ConfigFixKind;
  target: string;
  artifact: string;
  title: string;
  detail: string;
  action: string;
  snippet?: string;
}

export interface ConfigDoctorReport {
  generatedAt: string;
  status: ConfigDoctorStatus;
  score: number;
  totals: {
    surfaces: number;
    present: number;
    missing: number;
    safetyCovered: number;
    verificationCovered: number;
    contextCovered: number;
    toolsCovered: number;
    handoffCovered: number;
  };
  surfaces: ConfigSurface[];
  findings: ConfigDoctorFinding[];
  fixes: ConfigDoctorFix[];
  recommendations: string[];
}

const labels: Record<string, string> = {
  "AGENTS.md": "Codex / OpenAI agents",
  "CLAUDE.md": "Claude Code",
  "GEMINI.md": "Gemini CLI",
  ".cursor/rules/vibe-context.mdc": "Cursor",
  ".clinerules": "Cline / Roo",
  ".continue/vibe-context-check.md": "Continue",
  ".github/copilot-instructions.md": "GitHub Copilot",
  ".claude/skills/vibe-context-os/SKILL.md": "Claude Code skill",
  ".mcp.json": "MCP client"
};

const safetyPattern = /\b(secret|secrets|credential|credentials|token|tokens|private|privacy|redact|redaction|\.env|raw session|session log|absolute path|approval|destructive|安全|隐私|密钥|凭据)\b/i;
const verificationPattern = /\b(npm run lint|npm test|npm run build|npm run smoke|test|tests|lint|build|smoke|verify|verification|pytest|vitest|jest|验证|测试|构建|检查)\b/i;
const contextPattern = /\b(context|task pack|agent rule|rules|AGENTS|CLAUDE|GEMINI|Cursor|Copilot|handoff|workspace|上下文|规则)\b/i;
const toolsPattern = /\b(MCP|tool|tools|shell|browser|filesystem|network|command|commands|approval|hook|hooks|工具|命令)\b/i;
const handoffPattern = /\b(pack|handoff|continue|resume|export|apply plan|task|workflow|交接|继续|导出)\b/i;

function finding(
  severity: ConfigDoctorSeverity,
  title: string,
  detail: string,
  action: string,
  evidence: string[]
): ConfigDoctorFinding {
  return {
    id: shortHash(`${severity}:${title}:${detail}:${evidence.join("|")}`),
    severity,
    title,
    detail,
    action,
    evidence: evidence.slice(0, 8)
  };
}

function fix(
  kind: ConfigFixKind,
  target: string,
  artifact: string,
  title: string,
  detail: string,
  action: string,
  snippet?: string
): ConfigDoctorFix {
  return {
    id: shortHash(`${kind}:${target}:${artifact}:${title}`),
    kind,
    target,
    artifact,
    title,
    detail,
    action,
    snippet
  };
}

const safetySnippet = `## Safety Boundary

- Treat local files, session summaries, screenshots, and generated exports as private until reviewed.
- Do not expose secrets, .env values, raw session logs, credentials, or private absolute paths.
- Run privacy, publish, and generated artifact audits before public sharing.`;

const verificationSnippet = `## Verification

- Run the relevant checks for touched files.
- For this project, prefer: npm run lint, npm test, npm run build, npm run smoke.
- For release or public artifacts, run npm run release:check.`;

const contextSnippet = `## Context Workflow

- Read local agent rules and manifests before editing.
- Prefer task-specific packs in exports/latest/TASK_PACK.md over full-context dumps.
- Keep generated rules under exports/ until a human reviews and applies them.`;

const toolPolicySnippet = `## Tool Boundary

- Use MCP, shell, browser, network, and filesystem tools only when the task requires them.
- Prefer read-only inspection before writes.
- Review MCP_TOOL_POLICY.md and .mcp.json before enabling new tools.`;

const handoffSnippet = `## Handoff

- Preserve decisions, verification commands, and unresolved risks in task packs or review checklists.
- When resuming work, regenerate context instead of relying only on chat memory.`;

async function readTargetText(target: string): Promise<string> {
  const filePath = path.join(config.workspaceRoot, target);
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > 256 * 1024) return "";
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function buildSurface(artifact: string, target: string): Promise<ConfigSurface> {
  const text = await readTargetText(target);
  const present = text.trim().length > 0;
  const signals = {
    safety: safetyPattern.test(text),
    verification: verificationPattern.test(text),
    context: contextPattern.test(text),
    tools: toolsPattern.test(text),
    handoff: handoffPattern.test(text)
  };
  return {
    id: shortHash(target),
    label: labels[target] || target,
    target,
    artifact,
    status: present ? "present" : "missing",
    signals,
    evidence: present
      ? [
          target,
          `signals: safety=${signals.safety}, verification=${signals.verification}, context=${signals.context}, tools=${signals.tools}, handoff=${signals.handoff}`
        ]
      : []
  };
}

async function generatedBundleSignals(): Promise<{ hasExports: boolean; missing: string[] }> {
  const required = ["AGENTS.generated.md", "TRACE_REPORT.md", "MCP_TOOL_POLICY.md", "PUBLISH_CHECK_REPORT.md", "PUBLIC_CONTEXT_SUMMARY.json"];
  const missing: string[] = [];
  for (const file of required) {
    if (!(await pathExists(path.join(config.exportRoot, "latest", file)))) missing.push(file);
  }
  return { hasExports: missing.length === 0, missing };
}

function reportStatus(score: number, findings: ConfigDoctorFinding[]): ConfigDoctorStatus {
  if (findings.some((item) => item.severity === "block") || score < 60) return "missing";
  if (findings.some((item) => item.severity === "warn") || score < 85) return "review";
  return "ready";
}

export async function buildConfigDoctorReport(_analysis?: AnalysisResult): Promise<ConfigDoctorReport> {
  const applyPlan = await buildApplyPlan();
  const surfaces = await Promise.all(applyPlan.map((item) => buildSurface(item.artifact, item.target)));
  const generated = await generatedBundleSignals();
  const missing = surfaces.filter((surface) => surface.status === "missing");
  const present = surfaces.filter((surface) => surface.status === "present");
  const missingSafety = present.filter((surface) => !surface.signals.safety);
  const missingVerification = present.filter((surface) => !surface.signals.verification);
  const missingContext = present.filter((surface) => !surface.signals.context);
  const missingTools = present.filter((surface) => !surface.signals.tools);
  const missingHandoff = present.filter((surface) => !surface.signals.handoff);

  const findings: ConfigDoctorFinding[] = [];
  if (missing.length > 0) {
    findings.push(
      finding(
        missing.length >= 4 ? "warn" : "info",
        "Missing agent config surfaces",
        `${missing.length} expected agent configuration targets are not present in the workspace.`,
        "Review APPLY_PLAN.md and create the missing targets only after checking generated content.",
        missing.map((surface) => surface.target)
      )
    );
  }

  if (missingSafety.length > 0) {
    findings.push(
      finding(
        "warn",
        "Safety boundary not repeated everywhere",
        `${missingSafety.length} present agent config files do not mention privacy, secrets, approval, or private-context guardrails.`,
        "Add a short safety boundary to each active agent surface so tools inherit the same publish rules.",
        missingSafety.map((surface) => surface.target)
      )
    );
  }

  if (missingVerification.length > 0) {
    findings.push(
      finding(
        "warn",
        "Verification commands not repeated everywhere",
        `${missingVerification.length} present agent config files do not mention test, lint, build, smoke, or verification commands.`,
        "Add the relevant verification loop to every active agent surface.",
        missingVerification.map((surface) => surface.target)
      )
    );
  }

  if (missingContext.length > 0) {
    findings.push(
      finding(
        "info",
        "Context rules are thin in some surfaces",
        `${missingContext.length} present files do not clearly mention context, task packs, rules, or workspace boundaries.`,
        "Use generated rules to align agent surfaces around the same context workflow.",
        missingContext.map((surface) => surface.target)
      )
    );
  }

  if (missingTools.length > 0 && present.some((surface) => surface.target === ".mcp.json")) {
    findings.push(
      finding(
        "info",
        "Tool policy is not visible in every active surface",
        `${missingTools.length} present files do not mention MCP, tools, shell, browser, or command boundaries.`,
        "Reference MCP_TOOL_POLICY.md or add a compact tool-use rule where the agent reads instructions.",
        missingTools.map((surface) => surface.target)
      )
    );
  }

  if (!generated.hasExports) {
    findings.push(
      finding(
        "info",
        "Generated bundle is incomplete or stale",
        "Some expected generated reports are not present under exports/latest.",
        "Run `npm run vibe -- export` before reviewing or applying generated agent files.",
        generated.missing
      )
    );
  }

  const fixes: ConfigDoctorFix[] = [];
  for (const surface of missing) {
    fixes.push(
      fix(
        "create-target",
        surface.target,
        surface.artifact,
        `Create ${surface.label} config after review`,
        `${surface.target} is missing. The generated artifact can be reviewed as a starting point.`,
        `Run export, review exports/latest/${surface.artifact}, then create ${surface.target} manually.`
      )
    );
  }
  for (const surface of missingSafety) {
    fixes.push(
      fix(
        "append-safety",
        surface.target,
        surface.artifact,
        `Add safety boundary to ${surface.target}`,
        "The active config does not clearly repeat privacy and secret-handling guardrails.",
        `Review and append a safety section to ${surface.target}.`,
        safetySnippet
      )
    );
  }
  for (const surface of missingVerification) {
    fixes.push(
      fix(
        "append-verification",
        surface.target,
        surface.artifact,
        `Add verification loop to ${surface.target}`,
        "The active config does not clearly tell agents which checks to run before finishing.",
        `Review and append a verification section to ${surface.target}.`,
        verificationSnippet
      )
    );
  }
  for (const surface of missingContext) {
    fixes.push(
      fix(
        "append-context",
        surface.target,
        surface.artifact,
        `Add context workflow to ${surface.target}`,
        "The active config does not clearly mention context packs, generated rules, or workspace boundaries.",
        `Review and append a context workflow section to ${surface.target}.`,
        contextSnippet
      )
    );
  }
  for (const surface of missingTools) {
    fixes.push(
      fix(
        "append-tool-policy",
        surface.target,
        surface.artifact,
        `Add tool boundary to ${surface.target}`,
        "The active config does not clearly mention MCP, shell, browser, filesystem, network, or command boundaries.",
        `Review and append a tool boundary section to ${surface.target}.`,
        toolPolicySnippet
      )
    );
  }
  for (const surface of missingHandoff) {
    fixes.push(
      fix(
        "append-handoff",
        surface.target,
        surface.artifact,
        `Add handoff guidance to ${surface.target}`,
        "The active config does not clearly tell agents how to preserve state across resumed work.",
        `Review and append a handoff section to ${surface.target}.`,
        handoffSnippet
      )
    );
  }

  const totals = {
    surfaces: surfaces.length,
    present: present.length,
    missing: missing.length,
    safetyCovered: surfaces.filter((surface) => surface.signals.safety).length,
    verificationCovered: surfaces.filter((surface) => surface.signals.verification).length,
    contextCovered: surfaces.filter((surface) => surface.signals.context).length,
    toolsCovered: surfaces.filter((surface) => surface.signals.tools).length,
    handoffCovered: surfaces.filter((surface) => surface.signals.handoff).length
  };

  const score = Math.max(
    0,
    100 -
      missing.length * 6 -
      missingSafety.length * 8 -
      missingVerification.length * 6 -
      missingContext.length * 4 -
      missingHandoff.length * 3 -
      (!generated.hasExports ? 8 : 0)
  );

  return {
    generatedAt: new Date().toISOString(),
    status: reportStatus(score, findings),
    score,
    totals,
    surfaces,
    findings,
    fixes,
    recommendations: [
      "Keep one safety boundary repeated across every active coding-agent surface.",
      "Make lint, test, build, smoke, and release checks visible in agent rules.",
      "Use APPLY_PLAN.md as a manual review map before copying generated files into real configs.",
      "Regenerate exports after changing rules, package scripts, MCP configs, or public release docs."
    ]
  };
}

export function formatConfigDoctorReport(report: ConfigDoctorReport): string {
  const surfaces = report.surfaces
    .map(
      (surface) => `- ${surface.target}: ${surface.status}, safety ${surface.signals.safety ? "yes" : "no"}, verification ${
        surface.signals.verification ? "yes" : "no"
      }, context ${surface.signals.context ? "yes" : "no"}, tools ${surface.signals.tools ? "yes" : "no"}`
    )
    .join("\n");
  const findings = report.findings.length
    ? report.findings
        .map(
          (item) => `## [${item.severity}] ${item.title}

${item.detail}

Action: ${item.action}

Evidence:
${item.evidence.map((entry) => `- ${entry}`).join("\n")}
`
        )
        .join("\n")
    : "No config doctor findings detected.";
  const fixes = report.fixes.length
    ? report.fixes.map((item) => `- [${item.kind}] ${item.target}: ${item.title}`).join("\n")
    : "- No config fixes suggested.";

  return `# Cross-Agent Config Doctor

Status: ${report.status}
Score: ${report.score}/100
Generated at: ${report.generatedAt}

## Totals

- Surfaces: ${report.totals.surfaces}
- Present: ${report.totals.present}
- Missing: ${report.totals.missing}
- Safety covered: ${report.totals.safetyCovered}
- Verification covered: ${report.totals.verificationCovered}
- Context covered: ${report.totals.contextCovered}
- Tool policy covered: ${report.totals.toolsCovered}
- Handoff covered: ${report.totals.handoffCovered}

## Surfaces

${surfaces}

## Findings

${findings}

## Suggested Fixes

${fixes}

## Recommendations

${report.recommendations.map((item) => `- ${item}`).join("\n")}
`;
}

export function formatConfigFixPack(report: ConfigDoctorReport): string {
  const fixes = report.fixes.length
    ? report.fixes
        .map((item) => {
          const snippet = item.snippet
            ? `
Suggested snippet:

\`\`\`markdown
${item.snippet}
\`\`\`
`
            : "";
          return `## ${item.title}

- Kind: ${item.kind}
- Target: \`${item.target}\`
- Generated artifact: \`exports/latest/${item.artifact}\`
- Detail: ${item.detail}
- Action: ${item.action}
${snippet}`;
        })
        .join("\n")
    : "No config fixes are suggested.";

  return `# Cross-Agent Config Fix Pack

No files were modified. This pack is review-only.

Generated at: ${report.generatedAt}
Doctor status: ${report.status}
Doctor score: ${report.score}/100

## Use This Safely

1. Run \`npm run vibe -- export\` first so generated artifacts are current.
2. Review each generated artifact and snippet below.
3. Copy changes manually into real agent config files only after review.
4. Run \`npm run vibe -- config-doctor\` again after applying changes.

## Fixes

${fixes}
`;
}
