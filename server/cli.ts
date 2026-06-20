#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..", "..");

type Command =
  | "init"
  | "scan"
  | "drift"
  | "budget"
  | "badge"
  | "publish-check"
  | "privacy-audit"
  | "artifact-audit"
  | "mcp-audit"
  | "config-doctor"
  | "config-fix-pack"
  | "trace"
  | "status"
  | "release-plan"
  | "apply-plan"
  | "export"
  | "public-bundle"
  | "pack"
  | "demo"
  | "mcp"
  | "doctor"
  | "version"
  | "help";

function usage(): string {
  return `Vibe Coding Context OS

Usage:
  vibe init                         Create non-destructive .vibe templates
  vibe scan                         Scan approved local context
  vibe drift                        Check stale or incomplete agent context
  vibe budget                       Estimate context size
  vibe badge                        Print README-ready agent-readiness badge
  vibe pack --task "fix auth bug"   Build exports/latest/TASK_PACK.md
  vibe status                       Show scan, drift, publish, privacy summary
  vibe publish-check                Run release readiness checks
  vibe privacy-audit                Audit source for secrets, .env, JSONL logs, paths
  vibe artifact-audit               Audit generated exports for private paths/secrets
  vibe mcp-audit                    Audit MCP configs and server command risks
  vibe config-doctor                Check cross-agent config coverage and consistency
  vibe config-fix-pack              Write review-only config fix suggestions
  vibe trace                        Inspect session pressure and workflow signals
  vibe export                       Write full generated artifact bundle
  vibe public-bundle                Write public-safe portfolio/demo bundle
  vibe apply-plan                   Show dry-run map to real agent files
  vibe release-plan                 Print release checklist
  vibe demo                         Scan the bundled public-safe demo workspace
  vibe mcp                          Start stdio MCP server
  vibe doctor                       Run quick agent-context diagnosis
  vibe version                      Print package version

Recommended loops:
  First run:      vibe init && vibe scan && vibe pack --task "..."
  Demo:           vibe demo && vibe demo --export && vibe demo --public-bundle
  Before publish: vibe status && vibe drift && vibe publish-check && vibe privacy-audit && vibe artifact-audit && vibe mcp-audit && vibe config-doctor && vibe config-fix-pack && vibe trace && vibe public-bundle
  MCP client:     vibe mcp

Options:
  --json             Emit machine-readable JSON where supported
  --task <text>      Task description for pack
  --workspace <path> Approved workspace root for this command
  --codex-home <path> Codex home directory for this command
  --demo             Use the bundled demo workspace
  --export           With demo, write full demo export bundle
  --public-bundle    With demo, write public-safe demo bundle
  --privacy-audit    With demo, run demo privacy audit

Environment:
  WORKSPACE_ROOT     Approved workspace root
  CODEX_HOME         Codex home directory
  SESSION_LOOKBACK_DAYS

Privacy:
  Scans are local by default. Codex home sessions are opt-in through .vibe/config.json.
  Generated files stay under exports/ unless a human manually applies them.

Exit codes:
  0 success
  1 command/runtime error
  2 release or privacy gate failed
`;
}

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline?.slice(name.length + 1);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function applyEarlyEnvironment(): void {
  const workspace = getArg("--workspace");
  const codexHome = getArg("--codex-home");
  const demo = hasFlag("--demo") || process.argv[2] === "demo";
  if (demo) process.env.WORKSPACE_ROOT = path.join(packageRoot, "demo-workspace");
  if (workspace) process.env.WORKSPACE_ROOT = path.resolve(workspace);
  if (codexHome) process.env.CODEX_HOME = path.resolve(codexHome);
}

async function runtime() {
  const [
    analyzer,
    exporter,
    pack,
    configModule,
    utils,
    drift,
    budget,
    publish,
    init,
    applyPlan,
    privacyAudit,
    status,
    artifactAudit,
    mcpAudit,
    configDoctor,
    trace,
    badge
  ] = await Promise.all([
    import("./analyzer.js"),
    import("./exporter.js"),
    import("./pack.js"),
    import("./config.js"),
    import("./utils.js"),
    import("./drift.js"),
    import("./budget.js"),
    import("./publish.js"),
    import("./init.js"),
    import("./applyPlan.js"),
    import("./privacyAudit.js"),
    import("./status.js"),
    import("./artifactAudit.js"),
    import("./mcpAudit.js"),
    import("./configDoctor.js"),
    import("./trace.js"),
    import("./badge.js")
  ]);
  return {
    analyze: analyzer.analyze,
    exportArtifacts: exporter.exportArtifacts,
    exportPublicBundle: exporter.exportPublicBundle,
    buildTaskPack: pack.buildTaskPack,
    config: configModule.config,
    ensureInside: utils.ensureInside,
    formatDriftReport: drift.formatDriftReport,
    buildBudgetReport: budget.buildBudgetReport,
    formatBudgetReport: budget.formatBudgetReport,
    buildPublishReport: publish.buildPublishReport,
    formatPublishReport: publish.formatPublishReport,
    formatReleasePlan: publish.formatReleasePlan,
    initWorkspace: init.initWorkspace,
    buildApplyPlan: applyPlan.buildApplyPlan,
    formatApplyPlan: applyPlan.formatApplyPlan,
    buildPrivacyAudit: privacyAudit.buildPrivacyAudit,
    formatPrivacyAudit: privacyAudit.formatPrivacyAudit,
    buildStatusReport: status.buildStatusReport,
    formatStatusReport: status.formatStatusReport,
    buildArtifactAudit: artifactAudit.buildArtifactAudit,
    formatArtifactAudit: artifactAudit.formatArtifactAudit,
    buildMcpAudit: mcpAudit.buildMcpAudit,
    formatMcpAudit: mcpAudit.formatMcpAudit,
    buildConfigDoctorReport: configDoctor.buildConfigDoctorReport,
    formatConfigDoctorReport: configDoctor.formatConfigDoctorReport,
    formatConfigFixPack: configDoctor.formatConfigFixPack,
    buildTraceReport: trace.buildTraceReport,
    formatTraceReport: trace.formatTraceReport,
    buildBadgeReport: badge.buildBadgeReport,
    formatBadgeReport: badge.formatBadgeReport
  };
}

async function packageVersion(): Promise<string> {
  const candidates = [
    path.join(packageRoot, "package.json"),
    path.resolve(process.cwd(), "package.json")
  ];
  for (const packagePath of candidates) {
    try {
      const parsed = JSON.parse(await fs.readFile(packagePath, "utf8")) as { name?: string; version?: string };
      if (parsed.name === "vibe-context-os" && parsed.version) return parsed.version;
    } catch {
      // Try the next candidate.
    }
  }
  try {
    const parsed = JSON.parse(await fs.readFile(candidates[0], "utf8")) as { version?: string };
    return parsed.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function writePack(task: string): Promise<string> {
  const { analyze, buildTaskPack, config, ensureInside } = await runtime();
  const analysis = await analyze();
  const content = buildTaskPack(analysis, { task });
  const targetRoot = path.join(config.exportRoot, "latest");
  const target = path.join(targetRoot, "TASK_PACK.md");
  await ensureInside(config.exportRoot, target);
  await fs.mkdir(targetRoot, { recursive: true });
  await fs.writeFile(target, content, "utf8");
  return target;
}

async function writeConfigFixPack(): Promise<{ path: string; content: string; fixes: number }> {
  const { buildConfigDoctorReport, formatConfigFixPack, config, ensureInside } = await runtime();
  const report = await buildConfigDoctorReport();
  const content = formatConfigFixPack(report);
  const targetRoot = path.join(config.exportRoot, "latest");
  const target = path.join(targetRoot, "CONFIG_FIX_PACK.md");
  await ensureInside(config.exportRoot, target);
  await fs.mkdir(targetRoot, { recursive: true });
  await fs.writeFile(target, content, "utf8");
  return { path: target, content, fixes: report.fixes.length };
}

async function main() {
  applyEarlyEnvironment();
  const commandArg = process.argv[2] || "help";
  const command = commandArg as Command | "--help" | "-h" | "--version" | "-v";
  const json = hasFlag("--json");
  if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    console.log(await packageVersion());
    return;
  }

  if (command === "doctor") {
    const { buildStatusReport, formatStatusReport } = await runtime();
    const report = await buildStatusReport();
    if (json) printJson(report);
    else console.log(formatStatusReport(report));
    return;
  }

  if (command === "init") {
    const { initWorkspace } = await runtime();
    const result = await initWorkspace();
    if (json) {
      printJson(result);
      return;
    }
    console.log(`Initialized Vibe workspace at ${result.root}`);
    for (const file of result.files) {
      console.log(`- ${file.created ? "created" : "exists"}: ${file.path}`);
    }
    return;
  }

  if (command === "scan") {
    const { analyze } = await runtime();
    const analysis = await analyze();
    if (json) {
      printJson({
        generatedAt: analysis.generatedAt,
        summary: analysis.summary,
        categories: analysis.categories,
        workflowStages: analysis.workflowStages,
        recommendations: analysis.recommendations,
        publish: analysis.publish,
        budget: analysis.budget
      });
      return;
    }
    console.log(JSON.stringify(analysis.summary, null, 2));
    console.log("\nTop signals:");
    for (const category of analysis.categories.filter((item) => item.count > 0).slice(0, 8)) {
      console.log(`- ${category.name}: ${category.count}`);
    }
    return;
  }

  if (command === "drift") {
    const { analyze, formatDriftReport } = await runtime();
    const analysis = await analyze();
    if (json) {
      printJson({
        status: analysis.driftFindings.some((finding) => finding.severity === "critical") ? "critical" : analysis.driftFindings.length > 0 ? "review" : "clean",
        findings: analysis.driftFindings
      });
    } else {
      console.log(formatDriftReport(analysis.driftFindings));
    }
    const criticalCount = analysis.driftFindings.filter((finding) => finding.severity === "critical").length;
    if (criticalCount > 0) process.exitCode = 2;
    return;
  }

  if (command === "budget") {
    const { analyze, buildBudgetReport, formatBudgetReport } = await runtime();
    const analysis = await analyze();
    const report = buildBudgetReport(analysis);
    if (json) printJson(report);
    else console.log(formatBudgetReport(report));
    return;
  }

  if (command === "badge") {
    const { buildStatusReport, buildBadgeReport, formatBadgeReport } = await runtime();
    const report = buildBadgeReport(await buildStatusReport());
    if (json) printJson(report);
    else console.log(formatBadgeReport(report));
    return;
  }

  if (command === "status") {
    const { buildStatusReport, formatStatusReport } = await runtime();
    const report = await buildStatusReport();
    if (json) printJson(report);
    else console.log(formatStatusReport(report));
    return;
  }

  if (command === "publish-check") {
    const { analyze, buildBudgetReport, buildPublishReport, formatPublishReport } = await runtime();
    const analysis = await analyze();
    const report = buildPublishReport(analysis, buildBudgetReport(analysis));
    if (json) printJson(report);
    else console.log(formatPublishReport(report));
    if (report.status === "blocked") process.exitCode = 2;
    return;
  }

  if (command === "privacy-audit") {
    const { buildPrivacyAudit, formatPrivacyAudit } = await runtime();
    const report = await buildPrivacyAudit();
    if (json) printJson(report);
    else console.log(formatPrivacyAudit(report));
    if (report.status === "block") process.exitCode = 2;
    return;
  }

  if (command === "artifact-audit") {
    const { buildArtifactAudit, formatArtifactAudit } = await runtime();
    const report = await buildArtifactAudit();
    if (json) printJson(report);
    else console.log(formatArtifactAudit(report));
    if (report.status === "block") process.exitCode = 2;
    return;
  }

  if (command === "mcp-audit") {
    const { buildMcpAudit, formatMcpAudit } = await runtime();
    const report = await buildMcpAudit();
    if (json) printJson(report);
    else console.log(formatMcpAudit(report));
    if (report.status === "block") process.exitCode = 2;
    return;
  }

  if (command === "config-doctor") {
    const { buildConfigDoctorReport, formatConfigDoctorReport } = await runtime();
    const report = await buildConfigDoctorReport();
    if (json) printJson(report);
    else console.log(formatConfigDoctorReport(report));
    return;
  }

  if (command === "config-fix-pack") {
    const result = await writeConfigFixPack();
    if (json) {
      printJson({ path: result.path, fixes: result.fixes, bytes: Buffer.byteLength(result.content, "utf8") });
      return;
    }
    console.log(`Wrote review-only config fix pack: ${result.path}`);
    console.log(`Suggested fixes: ${result.fixes}`);
    return;
  }

  if (command === "trace") {
    const { analyze, buildTraceReport, formatTraceReport } = await runtime();
    const report = buildTraceReport(await analyze());
    if (json) printJson(report);
    else console.log(formatTraceReport(report));
    return;
  }

  if (command === "release-plan") {
    const { analyze, buildBudgetReport, buildPublishReport, formatReleasePlan } = await runtime();
    const analysis = await analyze();
    const report = buildPublishReport(analysis, buildBudgetReport(analysis));
    if (json) printJson({ status: report.status, checks: report.checks, markdown: formatReleasePlan(report) });
    else console.log(formatReleasePlan(report));
    return;
  }

  if (command === "apply-plan") {
    const { buildApplyPlan, formatApplyPlan } = await runtime();
    const targets = await buildApplyPlan();
    if (json) printJson({ targets });
    else console.log(formatApplyPlan(targets));
    return;
  }

  if (command === "export") {
    const { analyze, exportArtifacts } = await runtime();
    const analysis = await analyze();
    const result = await exportArtifacts(analysis);
    if (json) {
      printJson(result);
      return;
    }
    console.log(`Exported ${result.files.length} files to ${result.exportRoot}`);
    for (const file of result.files) {
      console.log(`- ${file.name}: ${file.path}`);
    }
    return;
  }

  if (command === "public-bundle") {
    const { analyze, exportPublicBundle } = await runtime();
    const analysis = await analyze();
    const result = await exportPublicBundle(analysis);
    if (json) {
      printJson(result);
      return;
    }
    console.log(`Exported ${result.files.length} public-safe files to ${result.exportRoot}`);
    for (const file of result.files) {
      console.log(`- ${file.name}: ${file.path}`);
    }
    return;
  }

  if (command === "pack") {
    const positional = process.argv.slice(3).filter((arg) => arg !== "--json");
    const task = getArg("--task") || positional.join(" ") || "Improve AI coding context";
    const target = await writePack(task);
    if (json) {
      printJson({ path: target, task });
      return;
    }
    console.log(`Wrote task context pack: ${target}`);
    return;
  }

  if (command === "demo") {
    const { analyze, exportArtifacts, exportPublicBundle, buildPrivacyAudit, formatPrivacyAudit } = await runtime();
    if (hasFlag("--privacy-audit")) {
      const report = await buildPrivacyAudit();
      if (json) printJson(report);
      else console.log(formatPrivacyAudit(report));
      if (report.status === "block") process.exitCode = 2;
      return;
    }
    if (hasFlag("--export")) {
      const result = await exportArtifacts(await analyze());
      if (json) printJson(result);
      else {
        console.log(`Exported ${result.files.length} demo files to ${result.exportRoot}`);
        for (const file of result.files) console.log(`- ${file.name}: ${file.path}`);
      }
      return;
    }
    if (hasFlag("--public-bundle")) {
      const result = await exportPublicBundle(await analyze());
      if (json) printJson(result);
      else {
        console.log(`Exported ${result.files.length} demo public-safe files to ${result.exportRoot}`);
        for (const file of result.files) console.log(`- ${file.name}: ${file.path}`);
      }
      return;
    }
    const analysis = await analyze();
    if (json) printJson({ summary: analysis.summary, categories: analysis.categories, publish: analysis.publish });
    else {
      console.log(JSON.stringify(analysis.summary, null, 2));
      console.log("\nTop demo signals:");
      for (const category of analysis.categories.filter((item) => item.count > 0).slice(0, 8)) {
        console.log(`- ${category.name}: ${category.count}`);
      }
    }
    return;
  }

  if (command === "mcp") {
    await import("./mcp.js");
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error(usage());
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
