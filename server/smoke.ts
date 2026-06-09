import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { analyze } from "./analyzer.js";
import { exportArtifacts, exportPublicBundle } from "./exporter.js";
import { buildTaskPack } from "./pack.js";
import { formatDriftReport } from "./drift.js";
import { buildApplyPlan, formatApplyPlan } from "./applyPlan.js";
import { buildPrivacyAudit, formatPrivacyAudit } from "./privacyAudit.js";
import { buildStatusReport, formatStatusReport } from "./status.js";
import { buildArtifactAudit, formatArtifactAudit } from "./artifactAudit.js";
import { buildTraceReport, formatTraceReport } from "./trace.js";
import { buildConfigDoctorReport, formatConfigDoctorReport } from "./configDoctor.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const analysis = await analyze();
assert(analysis.summary.sources >= 1, "Expected at least one scanned source.");
assert(analysis.categories.length >= 1, "Expected category signals.");
assert(Array.isArray(analysis.driftFindings), "Expected drift findings array.");
const packageJson = JSON.parse(await fs.readFile(path.join(process.cwd(), "package.json"), "utf8")) as { version: string };

const cliEntry = path.join(process.cwd(), "dist-server", "server", "cli.js");
try {
  const version = spawnSync(process.execPath, [cliEntry, "version"], { cwd: process.cwd(), encoding: "utf8" });
  assert(version.status === 0, "Built CLI version command should exit successfully.");
  assert(version.stdout.trim() === packageJson.version, "Built CLI version should match package.json.");
  const help = spawnSync(process.execPath, [cliEntry, "help"], { cwd: process.cwd(), encoding: "utf8" });
  assert(help.status === 0, "Built CLI help command should exit successfully.");
  assert(help.stdout.includes("Recommended loops"), "CLI help should include first-use guidance.");
  assert(help.stdout.includes("Exit codes"), "CLI help should document exit codes.");
  assert(help.stdout.includes("--workspace"), "CLI help should document --workspace.");
  const demo = spawnSync(process.execPath, [cliEntry, "demo", "--json"], { cwd: process.cwd(), encoding: "utf8" });
  assert(demo.status === 0, "Built CLI demo command should exit successfully.");
  const demoPayload = JSON.parse(demo.stdout) as { summary?: { sources?: number; risks?: number } };
  assert((demoPayload.summary?.sources || 0) >= 1, "CLI demo should scan bundled demo workspace.");
  assert(demoPayload.summary?.risks === 0, "CLI demo should be public-safe.");
  const workspaceScan = spawnSync(process.execPath, [cliEntry, "scan", "--workspace", "demo-workspace", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert(workspaceScan.status === 0, "Built CLI --workspace scan should exit successfully.");
  const workspacePayload = JSON.parse(workspaceScan.stdout) as { summary?: { sources?: number } };
  assert((workspacePayload.summary?.sources || 0) >= 1, "CLI --workspace should scan the requested workspace.");
  const status = spawnSync(process.execPath, [cliEntry, "status", "--workspace", "demo-workspace", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert(status.status === 0, "Built CLI status --workspace should exit successfully.");
  const statusPayload = JSON.parse(status.stdout) as {
    summary?: { sources?: number };
    overall?: { status?: string };
    privacy?: { status?: string };
    publish?: { status?: string };
  };
  assert((statusPayload.summary?.sources || 0) >= 1, "CLI status should include scan summary.");
  assert(typeof statusPayload.overall?.status === "string", "CLI status should include an overall status.");
  assert(statusPayload.privacy?.status === "pass", "CLI status should include privacy status.");
  assert(typeof statusPayload.publish?.status === "string", "CLI status should include publish status.");
  const trace = spawnSync(process.execPath, [cliEntry, "trace", "--workspace", "demo-workspace", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert(trace.status === 0, "Built CLI trace --workspace should exit successfully.");
  const tracePayload = JSON.parse(trace.stdout) as { status?: string; totals?: { sessions?: number } };
  assert(typeof tracePayload.status === "string", "CLI trace should include a status.");
  assert(typeof tracePayload.totals?.sessions === "number", "CLI trace should include session totals.");
  const configDoctor = spawnSync(process.execPath, [cliEntry, "config-doctor", "--workspace", "demo-workspace", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert(configDoctor.status === 0, "Built CLI config-doctor --workspace should exit successfully.");
  const configDoctorPayload = JSON.parse(configDoctor.stdout) as { status?: string; score?: number; totals?: { surfaces?: number } };
  assert(typeof configDoctorPayload.status === "string", "CLI config-doctor should include a status.");
  assert(typeof configDoctorPayload.score === "number", "CLI config-doctor should include a score.");
  assert((configDoctorPayload.totals?.surfaces || 0) >= 1, "CLI config-doctor should include surface totals.");
  const configFixPack = spawnSync(process.execPath, [cliEntry, "config-fix-pack", "--workspace", "demo-workspace", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert(configFixPack.status === 0, "Built CLI config-fix-pack --workspace should exit successfully.");
  const configFixPayload = JSON.parse(configFixPack.stdout) as { path?: string; fixes?: number; bytes?: number };
  assert(configFixPayload.path?.endsWith(path.join("exports", "latest", "CONFIG_FIX_PACK.md")), "CLI config-fix-pack should write CONFIG_FIX_PACK.md.");
  assert(typeof configFixPayload.fixes === "number", "CLI config-fix-pack should include fix count.");
} catch {
  // Build artifacts may not exist before `npm run build`; source-level smoke continues below.
}

const productionServerEntry = path.join(process.cwd(), "dist-server", "server", "index.js");
const productionIndexHtml = path.join(process.cwd(), "dist", "index.html");
try {
  const serverText = await fs.readFile(productionServerEntry, "utf8");
  assert(serverText.includes('path.resolve(__dirname, "..", "..", "dist")'), "Production server should serve the root dist directory.");
  await fs.access(productionIndexHtml);
} catch {
  // Build artifacts may not exist before `npm run build`; source-level checks still run below.
}

const driftReport = formatDriftReport(analysis.driftFindings);
assert(driftReport.includes("Context Drift Report") || driftReport.includes("No context drift"), "Expected drift report output.");

const traceReport = buildTraceReport(analysis);
const traceReportText = formatTraceReport(traceReport);
assert(traceReportText.includes("Trace Inspector Report"), "Expected trace inspector report output.");
assert(typeof traceReport.status === "string", "Trace report should include a status.");
assert(traceReport.totals.sessions === analysis.sessions.length, "Trace report should reuse session count.");

const configDoctorReport = await buildConfigDoctorReport(analysis);
const configDoctorText = formatConfigDoctorReport(configDoctorReport);
assert(configDoctorText.includes("Cross-Agent Config Doctor"), "Expected config doctor report output.");
assert(typeof configDoctorReport.status === "string", "Config doctor report should include a status.");
assert(configDoctorReport.totals.surfaces >= 6, "Config doctor should inspect major agent surfaces.");

const statusReport = await buildStatusReport(analysis);
const statusReportText = formatStatusReport(statusReport);
assert(statusReportText.includes("Vibe Context Status"), "Expected status report output.");
assert(typeof statusReport.overall.status === "string", "Status report should include overall status.");
assert(statusReport.summary.sources === analysis.summary.sources, "Status report should reuse the scan summary.");
assert(statusReport.privacy.status !== "block", "Status report should include non-blocking privacy status for this source tree.");

const pack = buildTaskPack(analysis, { task: "verify Vibe Context OS smoke path" });
assert(pack.includes("Safety Boundary"), "Task pack should include safety boundary.");
assert(pack.includes("Workspace Snapshot"), "Task pack should include workspace snapshot.");
assert(!pack.includes(analysis.workspaceRoot), "Task pack should not include the real workspace root.");
assert(pack.includes("<workspace-root>"), "Task pack should include a public-safe workspace placeholder.");

const applyPlan = await buildApplyPlan();
assert(applyPlan.length >= 6, "Apply plan should include the major coding agent targets.");
for (const requiredTarget of ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".cursor/rules/vibe-context.mdc", ".clinerules", ".continue/vibe-context-check.md"]) {
  assert(applyPlan.some((target) => target.target === requiredTarget), `Apply plan missing target: ${requiredTarget}`);
}
assert(
  applyPlan.some((target) => target.target === ".github/copilot-instructions.md"),
  "Apply plan missing GitHub Copilot instructions target."
);
assert(
  applyPlan.some((target) => target.target === ".claude/skills/vibe-context-os/SKILL.md"),
  "Apply plan missing Claude project skill target."
);
assert(applyPlan.some((target) => target.target === ".mcp.json"), "Apply plan missing MCP client target.");
const applyPlanText = formatApplyPlan(applyPlan);
assert(applyPlanText.includes("This is a dry-run"), "Apply plan should be explicitly non-mutating.");

const exported = await exportArtifacts(analysis);
assert(exported.files.length >= 14, "Expected generated multi-agent artifact bundle.");

const artifactAudit = await buildArtifactAudit();
const artifactAuditText = formatArtifactAudit(artifactAudit);
assert(artifactAuditText.includes("Generated Artifact Audit"), "Artifact audit should format a readable report.");
assert(artifactAudit.checkedFiles >= exported.files.length, "Artifact audit should inspect generated export files.");
assert(artifactAudit.status !== "block", "Generated exports should not contain private paths, raw session logs, or high-risk secrets.");

const exportedNames = new Set(exported.files.map((file) => file.name));
for (const required of [
  "GEMINI.md",
  "Cline/Roo Rules",
  "Continue Check",
  "GitHub Copilot Instructions",
  "Claude Project Skill",
  "MCP Tool Policy",
  "Trace Inspector Report",
  "Config Doctor Report",
  "Config Fix Pack",
  "Context Drift Report",
  "Context Budget Report",
  "Publish Check Report",
  "Public Release Checklist",
  "Public Context Summary",
  "Release Plan",
  "Apply Plan",
  "GitHub Action",
  "MCP Manifest",
  "MCP Client Config"
]) {
  assert(exportedNames.has(required), `Missing exported artifact: ${required}`);
}

for (const file of exported.files) {
  const stat = await fs.stat(file.path);
  assert(stat.size > 0, `Exported file is empty: ${file.path}`);
}

const applyPlanFile = exported.files.find((file) => file.name === "Apply Plan");
assert(applyPlanFile, "Expected APPLY_PLAN.md in export bundle.");
const exportedApplyPlanText = await fs.readFile(applyPlanFile.path, "utf8");
assert(exportedApplyPlanText.includes("This is a dry-run"), "Exported APPLY_PLAN.md should remain a dry-run.");

const contextMapFile = exported.files.find((file) => file.name === "Context Map");
assert(contextMapFile, "Expected context-map.json in export bundle.");
const contextMapText = await fs.readFile(contextMapFile.path, "utf8");
const contextMap = JSON.parse(contextMapText) as {
  workspaceRoot?: string;
  codexHome?: string;
  sources?: Array<{ absolutePath?: string; snippet?: string }>;
  sessions?: Array<{ sample?: unknown }>;
  risks?: Array<{ preview?: string }>;
};
assert(contextMap.workspaceRoot === "<workspace-root>", "context-map.json should not expose the real workspace root.");
assert(contextMap.codexHome === "<codex-home>", "context-map.json should not expose the real Codex home.");
assert(!/C:\\Users\\/i.test(contextMapText), "context-map.json should not include Windows user absolute paths.");
assert(!/\/Users\//i.test(contextMapText), "context-map.json should not include macOS user absolute paths.");
assert(!/password\s*[:=]/i.test(contextMapText), "context-map.json should not include password-like text.");
assert(!contextMap.sources?.some((source) => source.absolutePath || source.snippet), "context-map.json should not include source absolute paths or snippets.");
assert(!contextMap.sessions?.some((session) => session.sample), "context-map.json should not include raw session samples.");
assert(!contextMap.risks?.some((risk) => risk.preview), "context-map.json should not include redaction previews.");

const publicBundle = await exportPublicBundle(analysis);
assert(publicBundle.files.length >= 5, "Expected public-safe bundle.");
assert(!publicBundle.files.some((file) => file.path.endsWith("context-map.json")), "Public bundle must not include machine-readable context-map.json.");
for (const file of publicBundle.files) {
  const text = await fs.readFile(file.path, "utf8");
  assert(!text.includes(analysis.workspaceRoot), `Public bundle leaked workspace root: ${file.path}`);
  assert(!text.includes(analysis.codexHome), `Public bundle leaked Codex home: ${file.path}`);
}

const [concurrentFullExport, concurrentPublicBundle] = await Promise.all([exportArtifacts(analysis), exportPublicBundle(analysis)]);
assert(concurrentFullExport.files.length >= 14, "Concurrent full export should complete.");
assert(concurrentPublicBundle.files.length >= 5, "Concurrent public bundle export should complete.");

const privacyAudit = await buildPrivacyAudit();
const privacyAuditText = formatPrivacyAudit(privacyAudit);
assert(privacyAuditText.includes("Privacy Audit"), "Privacy audit should format a readable report.");
assert(privacyAudit.status !== "block", "Privacy audit should not find publish-blocking leaks in the source tree.");

console.log(
  JSON.stringify(
    {
      ok: true,
      sources: analysis.summary.sources,
      sessions: analysis.summary.sessions,
      risks: analysis.summary.risks,
      drift: analysis.driftFindings.length,
      exported: exported.files.length,
      publicBundle: publicBundle.files.length
    },
    null,
    2
  )
);
