import path from "node:path";
import fs from "node:fs/promises";

const command = process.argv[2] || "scan";
const allowed = new Set(["scan", "export", "public-bundle", "privacy-audit"]);

if (!allowed.has(command)) {
  console.error(`Unsupported demo command: ${command}`);
  process.exit(1);
}

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
const privacyAuditPath = await modulePath("../server/privacyAudit.ts", "../dist-server/server/privacyAudit.js");
const { analyze } = await import(analyzerPath);
const { exportArtifacts, exportPublicBundle } = await import(exporterPath);
const { buildPrivacyAudit, formatPrivacyAudit } = await import(privacyAuditPath);

if (command === "scan") {
  const analysis = await analyze();
  console.log(JSON.stringify(analysis.summary, null, 2));
  console.log("\nTop signals:");
  for (const category of analysis.categories.filter((item) => item.count > 0).slice(0, 8)) {
    console.log(`- ${category.name}: ${category.count}`);
  }
} else if (command === "export") {
  const result = await exportArtifacts(await analyze());
  console.log(`Exported ${result.files.length} files to ${result.exportRoot}`);
  for (const file of result.files) console.log(`- ${file.name}: ${file.path}`);
} else if (command === "public-bundle") {
  const result = await exportPublicBundle(await analyze());
  console.log(`Exported ${result.files.length} public-safe files to ${result.exportRoot}`);
  for (const file of result.files) console.log(`- ${file.name}: ${file.path}`);
} else if (command === "privacy-audit") {
  const report = await buildPrivacyAudit();
  console.log(formatPrivacyAudit(report));
  if (report.status === "block") process.exitCode = 2;
}
