import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { redactText } from "./security.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function withTempWorkspace<T>(run: (workspaceRoot: string) => Promise<T>): Promise<T> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-context-regression-"));
  const previousWorkspaceRoot = process.env.WORKSPACE_ROOT;
  const previousCodexHome = process.env.CODEX_HOME;
  const previousLookback = process.env.SESSION_LOOKBACK_DAYS;
  process.env.WORKSPACE_ROOT = root;
  process.env.CODEX_HOME = path.join(root, ".codex");
  process.env.SESSION_LOOKBACK_DAYS = "7";
  try {
    return await run(root);
  } finally {
    if (previousWorkspaceRoot === undefined) delete process.env.WORKSPACE_ROOT;
    else process.env.WORKSPACE_ROOT = previousWorkspaceRoot;
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    if (previousLookback === undefined) delete process.env.SESSION_LOOKBACK_DAYS;
    else process.env.SESSION_LOOKBACK_DAYS = previousLookback;
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function importWorkspaceModules() {
  const [analyzer, exporter, pack, privacyAudit] = await Promise.all([
    import("./analyzer.js"),
    import("./exporter.js"),
    import("./pack.js"),
    import("./privacyAudit.js")
  ]);
  return {
    analyze: analyzer.analyze,
    exportArtifacts: exporter.exportArtifacts,
    exportPublicBundle: exporter.exportPublicBundle,
    buildTaskPack: pack.buildTaskPack,
    buildPrivacyAudit: privacyAudit.buildPrivacyAudit
  };
}

const fakeOpenAiKey = ["sk", "testsecretvalue", "1234567890", "1234567890"].join("-");
const fakeBearer = ["Bearer", ["abcdefghijklm", "nopqrstuvwxyz", "1234567890"].join("")].join(" ");
const fakeSecretName = ["OPENAI", "API", "KEY"].join("_");
const secretText = [`${fakeSecretName}=${fakeOpenAiKey}`, `Authorization: ${fakeBearer}`].join("\n");
const redacted = redactText("sample.env", secretText);
assert(redacted.findings.length >= 2, "Redaction should detect OpenAI-style and bearer tokens.");
assert(!redacted.text.includes(fakeOpenAiKey), "Redaction should remove raw OpenAI-style token text.");
assert(!redacted.text.includes(fakeBearer), "Redaction should remove raw bearer token text.");

await withTempWorkspace(async (workspaceRoot) => {
  const { analyze, exportArtifacts, exportPublicBundle, buildTaskPack, buildPrivacyAudit } = await importWorkspaceModules();
  await fs.mkdir(path.join(workspaceRoot, ".vibe"), { recursive: true });
  await fs.writeFile(
    path.join(workspaceRoot, ".vibe", "config.json"),
    JSON.stringify(
      {
        scan: {
          includeCodexSessions: false
        }
      },
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(workspaceRoot, "README.md"),
    [
      "# Regression Workspace",
      "",
      "This workspace exercises public-safe context export.",
      "",
      "Use `npm run lint` before accepting agent edits."
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(workspaceRoot, "AGENTS.md"),
    [
      "# Agent Rules",
      "",
      "- Must keep generated exports private until reviewed.",
      "- Prefer task packs over raw session logs."
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(workspaceRoot, "package.json"),
    JSON.stringify({ scripts: { lint: "tsc --noEmit", build: "vite build" } }, null, 2),
    "utf8"
  );

  const analysis = await analyze();
  assert(analysis.workspaceRoot === workspaceRoot, "Analysis should use the temp workspace root from the environment.");
  assert(analysis.summary.sources >= 3, "Regression workspace should produce source inventory.");
  assert(analysis.summary.sessions === 0, "Codex session scanning should remain opt-in.");
  assert(!analysis.sources.some((source) => source.relativePath === ".env"), "Scanner should not ingest .env files as context sources.");

  const taskPack = buildTaskPack(analysis, { task: "prepare a safe public release" });
  assert(!taskPack.includes(workspaceRoot), "Task packs should not expose the real workspace root.");
  assert(taskPack.includes("<workspace-root>"), "Task packs should include a public-safe workspace placeholder.");

  const exported = await exportArtifacts(analysis);
  const contextMap = exported.files.find((file) => file.name === "Context Map");
  assert(contextMap, "Full export should include a public-safe context map.");
  const contextMapText = await fs.readFile(contextMap.path, "utf8");
  assert(!contextMapText.includes(workspaceRoot), "Context map should not expose the real workspace root.");
  assert(!contextMapText.includes(path.join(workspaceRoot, ".codex")), "Context map should not expose the real Codex home.");
  assert(!/"snippet"\s*:/.test(contextMapText), "Context map should not include raw source snippets.");
  assert(!/"absolutePath"\s*:/.test(contextMapText), "Context map should not include source absolute paths.");

  const publicBundle = await exportPublicBundle(analysis);
  assert(!publicBundle.files.some((file) => file.path.endsWith("context-map.json")), "Public bundle should exclude context-map.json.");
  for (const file of publicBundle.files) {
    const text = await fs.readFile(file.path, "utf8");
    assert(!text.includes(workspaceRoot), `Public bundle leaked workspace root in ${file.path}.`);
    assert(!text.includes(path.join(workspaceRoot, ".codex")), `Public bundle leaked Codex home in ${file.path}.`);
  }

  await fs.writeFile(path.join(workspaceRoot, ".env"), `${fakeSecretName}=${fakeOpenAiKey}\n`, "utf8");
  await fs.writeFile(path.join(workspaceRoot, "session.jsonl"), JSON.stringify({ role: "user", text: "private session" }), "utf8");
  await fs.writeFile(
    path.join(workspaceRoot, "README.md"),
    "Developer path: C:\\Users\\alice\\private-project\n",
    "utf8"
  );

  const audit = await buildPrivacyAudit();
  assert(audit.status === "block", "Privacy audit should block when source contains .env or session logs.");
  assert(audit.findings.some((finding) => finding.title === "Environment file present"), "Privacy audit should report .env files.");
  assert(audit.findings.some((finding) => finding.title === "Session log tracked by source audit"), "Privacy audit should report JSONL session logs.");
  assert(audit.findings.some((finding) => finding.title === "Private absolute path"), "Privacy audit should report private absolute paths.");
});

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        "redaction",
        "session-opt-in",
        "public-safe-context-map",
        "public-bundle-sanitization",
        "privacy-audit-blockers"
      ]
    },
    null,
    2
  )
);
