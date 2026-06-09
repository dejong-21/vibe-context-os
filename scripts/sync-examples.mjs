import fs from "node:fs/promises";
import path from "node:path";

process.env.WORKSPACE_ROOT = path.resolve("demo-workspace");

async function modulePath(sourcePath, builtPath) {
  try {
    await fs.access(new URL(sourcePath, import.meta.url));
    return sourcePath;
  } catch {
    return builtPath;
  }
}

const analyzerPath = await modulePath("../server/analyzer.ts", "../dist-server/server/analyzer.js");
const exporterPath = await modulePath("../server/exporter.ts", "../dist-server/server/exporter.js");
const packPath = await modulePath("../server/pack.ts", "../dist-server/server/pack.js");
const configDoctorPath = await modulePath("../server/configDoctor.ts", "../dist-server/server/configDoctor.js");
const configPath = await modulePath("../server/config.ts", "../dist-server/server/config.js");

const { analyze } = await import(analyzerPath);
const { exportArtifacts, exportPublicBundle } = await import(exporterPath);
const { buildTaskPack } = await import(packPath);
const { buildConfigDoctorReport, formatConfigDoctorReport } = await import(configDoctorPath);
const { config } = await import(configPath);

const examplesRoot = path.resolve("docs/examples");
const task = "prepare the demo workspace for a public AI coding release";

function sanitizeGeneratedAt(text) {
  return text.replace(/Generated at: .+/g, "Generated at: `<generated-at>`").replace(/"generatedAt":\s*"[^"]+"/g, '"generatedAt": "<generated-at>"');
}

function simplifyTaskPack(text) {
  return sanitizeGeneratedAt(text)
    .replace(/- `([^`]+)` \(([^,]+), (\d+) KB, sha256 [^)]+\)/g, "- `$1` ($2, $3 KB)")
    .replace(/\n## Relevant Sessions\n\n\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\b1 signals\b/g, "1 signal")
    .replace(/^- \[([^\]]+)\] ([^:]+): (.+) - \3$/gm, "- [$1] $2: $3")
    .replace(/(\n- `AGENTS\.md`[^\n]+\n- `package\.json`[^\n]+\n- `README\.md`[^\n]+)(?:\n- `AGENTS\.md`[^\n]+\n- `package\.json`[^\n]+\n- `README\.md`[^\n]+)+/g, "$1");
}

function publicSummaryJson(analysis) {
  return JSON.stringify(
    {
      generatedAt: "<generated-at>",
      product: "Vibe Coding Context OS",
      workspaceLabel: "demo-workspace",
      summary: analysis.summary,
      categories: analysis.categories.filter((item) => item.count > 0).slice(0, 6),
      workflowStages: analysis.workflowStages.map(({ name, status, description }) => ({ name, status, description })),
      drift: {
        total: analysis.driftFindings.length,
        critical: analysis.driftFindings.filter((item) => item.severity === "critical").length,
        warning: analysis.driftFindings.filter((item) => item.severity === "warning").length,
        info: analysis.driftFindings.filter((item) => item.severity === "info").length
      },
      budget: analysis.budget,
      publish: analysis.publish,
      recommendations: analysis.recommendations
    },
    null,
    2
  );
}

async function readExport(relativePath) {
  return fs.readFile(path.join(config.exportRoot, relativePath), "utf8");
}

async function main() {
  const analysis = await analyze();
  await exportArtifacts(analysis);
  await exportPublicBundle(analysis);

  await fs.mkdir(examplesRoot, { recursive: true });
  await fs.writeFile(path.join(examplesRoot, "TASK_PACK.demo.md"), simplifyTaskPack(buildTaskPack(analysis, { task })), "utf8");
  await fs.writeFile(path.join(examplesRoot, "PUBLIC_CONTEXT_SUMMARY.demo.json"), `${publicSummaryJson(analysis)}\n`, "utf8");
  await fs.writeFile(
    path.join(examplesRoot, "CONFIG_DOCTOR_REPORT.demo.md"),
    sanitizeGeneratedAt(formatConfigDoctorReport(await buildConfigDoctorReport())),
    "utf8"
  );
  await fs.writeFile(path.join(examplesRoot, "MCP_TOOL_POLICY.demo.md"), await readExport("public/MCP_TOOL_POLICY.md"), "utf8");
  await fs.writeFile(path.join(examplesRoot, "PUBLIC_RELEASE_CHECKLIST.demo.md"), await readExport("public/PUBLIC_RELEASE_CHECKLIST.md"), "utf8");
  await fs.writeFile(path.join(examplesRoot, "GITHUB_PROFILE_SNIPPET.demo.md"), await readExport("public/GITHUB_PROFILE_SNIPPET.md"), "utf8");
}

await main();
console.log(`Synced public-safe examples to ${examplesRoot}`);
