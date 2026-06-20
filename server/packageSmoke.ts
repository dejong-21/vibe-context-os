import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run(command: string, args: string[], options: { cwd: string; env?: NodeJS.ProcessEnv; input?: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    if (options.input) child.stdin.write(options.input);
    child.stdin.end();
    child.on("error", (error) => {
      reject(error);
    });
    child.on("exit", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}\n${stderr}\n${stdout}`));
    });
  });
}

function npmCommand(args: string[]): { command: string; args: string[] } {
  if (process.platform !== "win32") return { command: "npm", args };
  const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  return { command: process.execPath, args: [npmCli, ...args] };
}

function extractTarball(packOutput: string): string {
  const lines = packOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const tarball = [...lines].reverse().find((line) => line.endsWith(".tgz"));
  assert(tarball, "npm pack should print a .tgz tarball path.");
  return path.resolve(tarball);
}

async function withTempDir<T>(runInDir: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-context-package-smoke-"));
  try {
    return await runInDir(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

const repoRoot = process.cwd();
const packCommand = npmCommand(["pack"]);
const packOutput = await run(packCommand.command, packCommand.args, { cwd: repoRoot });
const tarball = extractTarball(packOutput);

try {
  await withTempDir(async (tempRoot) => {
    const demoRoot = path.join(tempRoot, "workspace");
    await fs.mkdir(demoRoot, { recursive: true });
    await fs.writeFile(path.join(demoRoot, "README.md"), "# Package smoke workspace\n\nUse AI coding context safely.\n", "utf8");
    await fs.writeFile(path.join(demoRoot, "AGENTS.md"), "- Must run privacy checks before publishing.\n", "utf8");
    await fs.writeFile(path.join(tempRoot, "package.json"), JSON.stringify({ type: "module", version: "9.9.9" }, null, 2), "utf8");
    const installCommand = npmCommand(["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball]);
    await run(installCommand.command, installCommand.args, { cwd: tempRoot });

    const binNames = ["vibe-context", "vibe-context-os", "agent-context-doctor"];
    for (const name of binNames) {
      const bin = path.join(tempRoot, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);
      await fs.access(bin);
    }
    const cliEntry = path.join(tempRoot, "node_modules", "vibe-context-os", "dist-server", "server", "cli.js");
    await fs.access(cliEntry);
    const env = {
      ...process.env,
      WORKSPACE_ROOT: demoRoot,
      SESSION_LOOKBACK_DAYS: "7"
    };

    const versionText = await run(process.execPath, [cliEntry, "version"], { cwd: tempRoot, env: process.env });
    assert(versionText.trim() === "0.1.0", "Installed CLI version should come from vibe-context-os, not the caller package.");

    const scanText = await run(process.execPath, [cliEntry, "scan", "--json"], { cwd: tempRoot, env });
    const scan = JSON.parse(scanText) as { summary?: { sources?: number; risks?: number } };
    assert((scan.summary?.sources || 0) >= 2, "Installed CLI should scan the temp workspace.");
    assert(scan.summary?.risks === 0, "Installed CLI should not report risks for the clean temp workspace.");

    const workspaceScanText = await run(process.execPath, [cliEntry, "scan", "--workspace", demoRoot, "--json"], { cwd: tempRoot, env: process.env });
    const workspaceScan = JSON.parse(workspaceScanText) as { summary?: { sources?: number; risks?: number } };
    assert((workspaceScan.summary?.sources || 0) >= 2, "Installed CLI --workspace should scan the requested workspace.");
    assert(workspaceScan.summary?.risks === 0, "Installed CLI --workspace should preserve clean scan behavior.");

    const statusText = await run(process.execPath, [cliEntry, "status", "--workspace", demoRoot, "--json"], { cwd: tempRoot, env: process.env });
    const status = JSON.parse(statusText) as {
      summary?: { sources?: number };
      overall?: { status?: string };
      privacy?: { status?: string };
      publish?: { status?: string };
    };
    assert((status.summary?.sources || 0) >= 2, "Installed CLI status should include scan summary.");
    assert(typeof status.overall?.status === "string", "Installed CLI status should include overall status.");
    assert(status.privacy?.status === "pass", "Installed CLI status should include privacy pass.");
    assert(typeof status.publish?.status === "string", "Installed CLI status should include publish status.");

    const badgeText = await run(process.execPath, [cliEntry, "badge", "--workspace", demoRoot, "--json"], { cwd: tempRoot, env: process.env });
    const badge = JSON.parse(badgeText) as { status?: string; markdown?: string; url?: string };
    assert(typeof badge.status === "string", "Installed CLI badge should include readiness status.");
    assert(badge.markdown?.includes("img.shields.io"), "Installed CLI badge should include shields.io markdown.");
    assert(badge.url?.includes("img.shields.io"), "Installed CLI badge should include badge URL.");

    const traceText = await run(process.execPath, [cliEntry, "trace", "--workspace", demoRoot, "--json"], { cwd: tempRoot, env: process.env });
    const trace = JSON.parse(traceText) as { status?: string; totals?: { sessions?: number } };
    assert(typeof trace.status === "string", "Installed CLI trace should include a status.");
    assert(typeof trace.totals?.sessions === "number", "Installed CLI trace should include session totals.");

    const configDoctorText = await run(process.execPath, [cliEntry, "config-doctor", "--workspace", demoRoot, "--json"], {
      cwd: tempRoot,
      env: process.env
    });
    const configDoctor = JSON.parse(configDoctorText) as { status?: string; score?: number; totals?: { surfaces?: number } };
    assert(typeof configDoctor.status === "string", "Installed CLI config-doctor should include a status.");
    assert(typeof configDoctor.score === "number", "Installed CLI config-doctor should include a score.");
    assert((configDoctor.totals?.surfaces || 0) >= 1, "Installed CLI config-doctor should include surface totals.");

    const configFixText = await run(process.execPath, [cliEntry, "config-fix-pack", "--workspace", demoRoot, "--json"], {
      cwd: tempRoot,
      env: process.env
    });
    const configFixPack = JSON.parse(configFixText) as { path?: string; fixes?: number; bytes?: number };
    assert(configFixPack.path?.endsWith(path.join("exports", "latest", "CONFIG_FIX_PACK.md")), "Installed CLI config-fix-pack should write CONFIG_FIX_PACK.md.");
    assert(typeof configFixPack.fixes === "number", "Installed CLI config-fix-pack should include fix count.");
    assert(typeof configFixPack.bytes === "number", "Installed CLI config-fix-pack should include byte count.");

    const demoText = await run(process.execPath, [cliEntry, "demo", "--json"], { cwd: tempRoot, env: process.env });
    const demo = JSON.parse(demoText) as { summary?: { sources?: number; risks?: number } };
    assert((demo.summary?.sources || 0) >= 1, "Installed CLI demo should scan the bundled demo workspace.");
    assert(demo.summary?.risks === 0, "Installed CLI demo should stay public-safe.");

    const privacyText = await run(process.execPath, [cliEntry, "privacy-audit", "--json"], { cwd: tempRoot, env });
    const privacy = JSON.parse(privacyText) as { status?: string };
    assert(privacy.status === "pass", "Installed CLI privacy audit should pass for the clean temp workspace.");

    const mcpAuditText = await run(process.execPath, [cliEntry, "mcp-audit", "--json"], { cwd: tempRoot, env });
    const mcpAudit = JSON.parse(mcpAuditText) as { status?: string };
    assert(mcpAudit.status !== "block", "Installed CLI MCP audit should not block the clean temp workspace.");

    const exportText = await run(process.execPath, [cliEntry, "export", "--json"], { cwd: tempRoot, env });
    const exported = JSON.parse(exportText) as { files?: Array<{ path?: string }> };
    assert((exported.files?.length || 0) >= 14, "Installed CLI export should write the generated artifact bundle.");

    const publicBundleText = await run(process.execPath, [cliEntry, "public-bundle", "--json"], { cwd: tempRoot, env });
    const publicBundle = JSON.parse(publicBundleText) as { files?: Array<{ path?: string }> };
    assert((publicBundle.files?.length || 0) >= 5, "Installed CLI public-bundle should write public-safe artifacts.");

    const artifactAuditText = await run(process.execPath, [cliEntry, "artifact-audit", "--json"], { cwd: tempRoot, env });
    const artifactAuditCli = JSON.parse(artifactAuditText) as { status?: string; checkedFiles?: number };
    assert(artifactAuditCli.status !== "block", "Installed CLI artifact audit should not block clean generated artifacts.");
    assert((artifactAuditCli.checkedFiles || 0) >= 1, "Installed CLI artifact audit should check generated files.");

    const packText = await run(process.execPath, [cliEntry, "pack", "--task", "verify installed package", "--json"], { cwd: tempRoot, env });
    const pack = JSON.parse(packText) as { path?: string };
    assert(pack.path?.endsWith(path.join("exports", "latest", "TASK_PACK.md")), "Installed CLI should write TASK_PACK.md.");

    const mcpInput = [
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "package-smoke", version: "0.1.0" } }
      }),
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "context.privacy_audit", arguments: {} } }),
      JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "context.status", arguments: {} } }),
      JSON.stringify({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "context.artifact_audit", arguments: {} } }),
      JSON.stringify({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "context.mcp_audit", arguments: {} } }),
      JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "context.trace", arguments: {} } }),
      JSON.stringify({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "context.config_doctor", arguments: {} } }),
      JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "context.config_fix_pack", arguments: {} } }),
      ""
    ].join("\n");
    const mcpText = await run(process.execPath, [cliEntry, "mcp"], { cwd: tempRoot, env, input: mcpInput });
    const messages = mcpText
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { id?: number; result?: { tools?: Array<{ name: string }>; structuredContent?: { status?: string } } });
    const tools = messages.find((message) => message.id === 2)?.result?.tools || [];
    const audit = messages.find((message) => message.id === 3)?.result?.structuredContent;
    const mcpStatus = messages.find((message) => message.id === 4)?.result?.structuredContent as
      | { overall?: { status?: string }; privacy?: { status?: string } }
      | undefined;
    const artifactAudit = messages.find((message) => message.id === 5)?.result?.structuredContent as { status?: string } | undefined;
    const mcpAuditTool = messages.find((message) => message.id === 6)?.result?.structuredContent as { status?: string } | undefined;
    const mcpTrace = messages.find((message) => message.id === 7)?.result?.structuredContent as { status?: string } | undefined;
    const mcpConfigDoctor = messages.find((message) => message.id === 8)?.result?.structuredContent as
      | { status?: string; score?: number }
      | undefined;
    const mcpConfigFixPack = messages.find((message) => message.id === 9)?.result?.structuredContent as
      | { fixes?: number; bytes?: number }
      | undefined;
    assert(tools.some((tool) => tool.name === "context.scan"), "Installed MCP server should list context.scan.");
    assert(tools.some((tool) => tool.name === "context.status"), "Installed MCP server should list context.status.");
    assert(tools.some((tool) => tool.name === "context.artifact_audit"), "Installed MCP server should list context.artifact_audit.");
    assert(tools.some((tool) => tool.name === "context.mcp_audit"), "Installed MCP server should list context.mcp_audit.");
    assert(tools.some((tool) => tool.name === "context.trace"), "Installed MCP server should list context.trace.");
    assert(tools.some((tool) => tool.name === "context.config_doctor"), "Installed MCP server should list context.config_doctor.");
    assert(tools.some((tool) => tool.name === "context.config_fix_pack"), "Installed MCP server should list context.config_fix_pack.");
    assert(audit?.status === "pass", "Installed MCP privacy audit tool should pass.");
    assert(typeof mcpStatus?.overall?.status === "string", "Installed MCP status tool should include overall status.");
    assert(mcpStatus?.privacy?.status === "pass", "Installed MCP status tool should include privacy pass.");
    assert(artifactAudit?.status !== "block", "Installed MCP artifact audit should not block clean generated artifacts.");
    assert(mcpAuditTool?.status !== "block", "Installed MCP MCP-audit tool should not block clean workspace.");
    assert(typeof mcpTrace?.status === "string", "Installed MCP trace tool should include trace status.");
    assert(typeof mcpConfigDoctor?.status === "string", "Installed MCP config doctor should include status.");
    assert(typeof mcpConfigDoctor?.score === "number", "Installed MCP config doctor should include score.");
    assert(typeof mcpConfigFixPack?.fixes === "number", "Installed MCP config fix pack should include fix count.");
    assert(typeof mcpConfigFixPack?.bytes === "number", "Installed MCP config fix pack should include byte count.");
  });
} finally {
  await fs.rm(tarball, { force: true });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      package: path.basename(tarball),
      checks: [
        "install",
        "version",
        "cli-scan",
        "workspace-flag",
        "status",
        "badge",
        "trace",
        "config-doctor",
        "config-fix-pack",
        "demo",
        "privacy-audit",
        "artifact-audit",
        "mcp-audit",
        "task-pack",
        "mcp-tools",
        "mcp-status",
        "mcp-trace",
        "mcp-config-doctor",
        "mcp-config-fix-pack"
      ]
    },
    null,
    2
  )
);
