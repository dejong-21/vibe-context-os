import { spawn } from "node:child_process";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertDefined<T>(value: T | undefined | null, message: string): asserts value is T {
  if (value === undefined || value === null) throw new Error(message);
}

type JsonRpcMessage = {
  id?: string | number | null;
  result?: unknown;
  error?: unknown;
};

async function runMcpSmoke(): Promise<JsonRpcMessage[]> {
  const child = spawn(process.execPath, [path.join(process.cwd(), "dist-server", "server", "cli.js"), "mcp"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      WORKSPACE_ROOT: path.join(process.cwd(), "demo-workspace"),
      SESSION_LOOKBACK_DAYS: "7"
    },
    stdio: ["pipe", "pipe", "pipe"]
  });

  const messages: JsonRpcMessage[] = [];
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    const lines = stdout.split(/\r?\n/);
    stdout = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      messages.push(JSON.parse(line) as JsonRpcMessage);
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const send = (id: number, method: string, params?: unknown) => {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  };

  send(1, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "vibe-context-os-smoke", version: "0.1.0" }
  });
  send(2, "tools/list");
  send(3, "tools/call", { name: "context.scan", arguments: {} });
  send(4, "tools/call", { name: "context.status", arguments: {} });
  send(5, "tools/call", { name: "context.artifact_audit", arguments: {} });
  send(6, "tools/call", { name: "context.mcp_audit", arguments: {} });
  send(7, "tools/call", { name: "context.trace", arguments: {} });
  send(8, "tools/call", { name: "context.config_doctor", arguments: {} });
  send(9, "tools/call", { name: "context.config_fix_pack", arguments: {} });
  child.stdin.end();

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("MCP smoke timed out."));
    }, 15_000);
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code && code !== 0) reject(new Error(`MCP process exited with ${code}: ${stderr}`));
      else resolve();
    });
  });

  return messages;
}

const messages = await runMcpSmoke();
const initialize = messages.find((message) => message.id === 1);
const toolsList = messages.find((message) => message.id === 2) as { result?: { tools?: Array<{ name: string }> } } | undefined;
const scan = messages.find((message) => message.id === 3) as { result?: { structuredContent?: { summary?: { sources?: number } } } } | undefined;
const status = messages.find((message) => message.id === 4) as {
  result?: { structuredContent?: { overall?: { status?: string }; privacy?: { status?: string } } };
} | undefined;
const artifactAudit = messages.find((message) => message.id === 5) as { result?: { structuredContent?: { status?: string } } } | undefined;
const mcpAudit = messages.find((message) => message.id === 6) as { result?: { structuredContent?: { status?: string } } } | undefined;
const trace = messages.find((message) => message.id === 7) as { result?: { structuredContent?: { status?: string } } } | undefined;
const configDoctor = messages.find((message) => message.id === 8) as { result?: { structuredContent?: { status?: string; score?: number } } } | undefined;
const configFixPack = messages.find((message) => message.id === 9) as { result?: { structuredContent?: { fixes?: number; bytes?: number } } } | undefined;

assertDefined(initialize?.result, "MCP initialize should return server capabilities.");
assertDefined(toolsList?.result?.tools, "MCP tools/list should return tools.");
assertDefined(scan?.result?.structuredContent?.summary?.sources, "MCP context.scan should return a workspace summary.");
assert(toolsList.result.tools.some((tool) => tool.name === "context.scan"), "MCP tools/list should include context.scan.");
assert(toolsList.result.tools.some((tool) => tool.name === "context.status"), "MCP tools/list should include context.status.");
assert(toolsList.result.tools.some((tool) => tool.name === "context.privacy_audit"), "MCP tools/list should include context.privacy_audit.");
assert(toolsList.result.tools.some((tool) => tool.name === "context.artifact_audit"), "MCP tools/list should include context.artifact_audit.");
assert(toolsList.result.tools.some((tool) => tool.name === "context.mcp_audit"), "MCP tools/list should include context.mcp_audit.");
assert(toolsList.result.tools.some((tool) => tool.name === "context.trace"), "MCP tools/list should include context.trace.");
assert(toolsList.result.tools.some((tool) => tool.name === "context.config_doctor"), "MCP tools/list should include context.config_doctor.");
assert(toolsList.result.tools.some((tool) => tool.name === "context.config_fix_pack"), "MCP tools/list should include context.config_fix_pack.");
assert(typeof status?.result?.structuredContent?.overall?.status === "string", "MCP context.status should include overall status.");
assert(status?.result?.structuredContent?.privacy?.status === "pass", "MCP context.status should include privacy pass for demo workspace.");
assert(artifactAudit?.result?.structuredContent?.status !== "block", "MCP context.artifact_audit should not block demo generated artifacts.");
assert(mcpAudit?.result?.structuredContent?.status !== "block", "MCP context.mcp_audit should not block demo workspace.");
assert(typeof trace?.result?.structuredContent?.status === "string", "MCP context.trace should include trace status.");
assert(typeof configDoctor?.result?.structuredContent?.status === "string", "MCP context.config_doctor should include status.");
assert(typeof configDoctor?.result?.structuredContent?.score === "number", "MCP context.config_doctor should include score.");
assert(typeof configFixPack?.result?.structuredContent?.fixes === "number", "MCP context.config_fix_pack should include fix count.");
assert(typeof configFixPack?.result?.structuredContent?.bytes === "number", "MCP context.config_fix_pack should include byte count.");

const toolCount = toolsList.result.tools.length;
const sourceCount = scan.result.structuredContent.summary.sources;

console.log(
  JSON.stringify(
    {
      ok: true,
      tools: toolCount,
      sources: sourceCount
    },
    null,
    2
  )
);
