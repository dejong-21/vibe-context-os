import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { analyze } from "./analyzer.js";
import { buildArtifactAudit, formatArtifactAudit } from "./artifactAudit.js";
import { buildBudgetReport, formatBudgetReport } from "./budget.js";
import { config } from "./config.js";
import { formatDriftReport } from "./drift.js";
import { exportArtifacts, exportPublicBundle } from "./exporter.js";
import { buildMcpAudit, formatMcpAudit } from "./mcpAudit.js";
import { buildTaskPack } from "./pack.js";
import { buildPrivacyAudit, formatPrivacyAudit } from "./privacyAudit.js";
import { buildPublishReport, formatPublishReport } from "./publish.js";
import { buildStatusReport, formatStatusReport } from "./status.js";
import { buildTraceReport, formatTraceReport } from "./trace.js";
import { buildConfigDoctorReport, formatConfigDoctorReport, formatConfigFixPack } from "./configDoctor.js";
import { ensureInside } from "./utils.js";

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
}

interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

const serverInfo = {
  name: "vibe-context-os",
  version: "0.1.0"
};

const emptyObjectSchema = {
  type: "object",
  properties: {},
  additionalProperties: false
};

const tools: ToolDefinition[] = [
  {
    name: "context.scan",
    title: "Scan Workspace Context",
    description: "Scan the approved local workspace and return public-safe summary signals. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.drift",
    title: "Check Context Drift",
    description: "Report stale, missing, or unsafe agent context. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.budget",
    title: "Estimate Context Budget",
    description: "Estimate context size and recommend pack strategies. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.status",
    title: "Get Vibe Context Status",
    description: "Return scan, drift, publish, privacy, budget, and recommendation summary. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.publish_check",
    title: "Run Publish Check",
    description: "Run release checks for redactions, drift, context budget, and private path warnings. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.privacy_audit",
    title: "Run Privacy Audit",
    description: "Audit publishable source files for secrets, environment files, JSONL session logs, and private paths. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.artifact_audit",
    title: "Audit Generated Artifacts",
    description: "Audit generated exports for private paths, raw session logs, and secret-like values. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.mcp_audit",
    title: "Audit MCP Safety",
    description: "Audit MCP configs for npx runtime installs, unpinned packages, private paths, sensitive env keys, and broad commands. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.config_doctor",
    title: "Check Cross-Agent Config",
    description: "Check Codex, Claude, Cursor, Gemini, Cline/Roo, Continue, Copilot, and MCP config coverage. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.config_fix_pack",
    title: "Build Config Fix Pack",
    description: "Write review-only cross-agent config fix suggestions to exports/latest/CONFIG_FIX_PACK.md.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: false, destructiveHint: false }
  },
  {
    name: "context.trace",
    title: "Inspect Session Trace",
    description: "Inspect local session summaries for context pressure, continuation loops, verification gaps, and private-path signals. Read-only.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false }
  },
  {
    name: "context.pack",
    title: "Build Task Context Pack",
    description: "Write a task-specific context pack to exports/latest/TASK_PACK.md and return its content.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          description: "Concrete coding task or handoff objective."
        }
      },
      required: ["task"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, destructiveHint: false }
  },
  {
    name: "context.export",
    title: "Export Full Artifact Bundle",
    description: "Write the full generated agent artifact bundle under exports/latest.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: false, destructiveHint: false }
  },
  {
    name: "context.public_bundle",
    title: "Export Public-Safe Bundle",
    description: "Write public-safe summary artifacts under exports/public, excluding raw session and context-map content.",
    inputSchema: emptyObjectSchema,
    annotations: { readOnlyHint: false, destructiveHint: false }
  }
];

function response(id: JsonRpcId | undefined, result: unknown): void {
  if (id === undefined) return;
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function errorResponse(id: JsonRpcId | undefined, code: number, message: string): void {
  if (id === undefined) return;
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

function toolText(text: string, structuredContent?: unknown): Record<string, unknown> {
  return {
    content: [{ type: "text", text }],
    structuredContent,
    isError: false
  };
}

function toolError(message: string): Record<string, unknown> {
  return {
    content: [{ type: "text", text: message }],
    isError: true
  };
}

function callParams(params: unknown): { name: string; arguments: Record<string, unknown> } {
  const parsed = z
    .object({
      name: z.string().min(1),
      arguments: z.record(z.unknown()).optional()
    })
    .parse(params);
  return { name: parsed.name, arguments: parsed.arguments || {} };
}

async function writeTaskPack(task: string): Promise<{ path: string; content: string; bytes: number }> {
  const analysis = await analyze();
  const content = buildTaskPack(analysis, { task });
  const targetRoot = path.join(config.exportRoot, "latest");
  const target = path.join(targetRoot, "TASK_PACK.md");
  await ensureInside(config.exportRoot, target);
  await fs.mkdir(targetRoot, { recursive: true });
  await fs.writeFile(target, content, "utf8");
  return {
    path: target,
    content,
    bytes: Buffer.byteLength(content, "utf8")
  };
}

async function writeConfigFixPack(): Promise<{ path: string; content: string; fixes: number; bytes: number }> {
  const report = await buildConfigDoctorReport();
  const content = formatConfigFixPack(report);
  const targetRoot = path.join(config.exportRoot, "latest");
  const target = path.join(targetRoot, "CONFIG_FIX_PACK.md");
  await ensureInside(config.exportRoot, target);
  await fs.mkdir(targetRoot, { recursive: true });
  await fs.writeFile(target, content, "utf8");
  return {
    path: target,
    content,
    fixes: report.fixes.length,
    bytes: Buffer.byteLength(content, "utf8")
  };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (name === "context.scan") {
    const analysis = await analyze();
    const payload = {
      generatedAt: analysis.generatedAt,
      summary: analysis.summary,
      categories: analysis.categories,
      workflowStages: analysis.workflowStages,
      recommendations: analysis.recommendations,
      publish: analysis.publish,
      budget: analysis.budget
    };
    return toolText(JSON.stringify(payload, null, 2), payload);
  }

  if (name === "context.drift") {
    const analysis = await analyze();
    const payload = {
      status: analysis.driftFindings.some((finding) => finding.severity === "critical")
        ? "critical"
        : analysis.driftFindings.length > 0
          ? "review"
          : "clean",
      findings: analysis.driftFindings
    };
    return toolText(formatDriftReport(analysis.driftFindings), payload);
  }

  if (name === "context.budget") {
    const report = buildBudgetReport(await analyze());
    return toolText(formatBudgetReport(report), report);
  }

  if (name === "context.status") {
    const report = await buildStatusReport();
    return toolText(formatStatusReport(report), report);
  }

  if (name === "context.publish_check") {
    const analysis = await analyze();
    const report = buildPublishReport(analysis, buildBudgetReport(analysis));
    return toolText(formatPublishReport(report), report);
  }

  if (name === "context.privacy_audit") {
    const report = await buildPrivacyAudit();
    return toolText(formatPrivacyAudit(report), report);
  }

  if (name === "context.artifact_audit") {
    const report = await buildArtifactAudit();
    return toolText(formatArtifactAudit(report), report);
  }

  if (name === "context.mcp_audit") {
    const report = await buildMcpAudit();
    return toolText(formatMcpAudit(report), report);
  }

  if (name === "context.config_doctor") {
    const report = await buildConfigDoctorReport();
    return toolText(formatConfigDoctorReport(report), report);
  }

  if (name === "context.config_fix_pack") {
    const result = await writeConfigFixPack();
    return toolText(result.content, { path: result.path, fixes: result.fixes, bytes: result.bytes });
  }

  if (name === "context.trace") {
    const report = buildTraceReport(await analyze());
    return toolText(formatTraceReport(report), report);
  }

  if (name === "context.pack") {
    const { task } = z.object({ task: z.string().min(1).max(500) }).parse(args);
    const result = await writeTaskPack(task);
    return toolText(result.content, { path: result.path, bytes: result.bytes });
  }

  if (name === "context.export") {
    const result = await exportArtifacts(await analyze());
    return toolText(JSON.stringify(result, null, 2), result);
  }

  if (name === "context.public_bundle") {
    const result = await exportPublicBundle(await analyze());
    return toolText(JSON.stringify(result, null, 2), result);
  }

  return toolError(`Unknown tool: ${name}`);
}

async function handleRequest(message: JsonRpcRequest): Promise<void> {
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    errorResponse(message.id, -32600, "Invalid JSON-RPC request.");
    return;
  }

  if (message.method === "initialize") {
    const protocolVersion =
      typeof (message.params as { protocolVersion?: unknown } | undefined)?.protocolVersion === "string"
        ? (message.params as { protocolVersion: string }).protocolVersion
        : "2025-06-18";
    response(message.id, {
      protocolVersion,
      capabilities: {
        tools: {}
      },
      serverInfo,
      instructions:
        "Use Vibe Context OS tools to scan local AI coding context, build task packs, and run privacy/publish gates. Do not publish raw sessions or private paths."
    });
    return;
  }

  if (message.method === "notifications/initialized") return;

  if (message.method === "tools/list") {
    response(message.id, { tools });
    return;
  }

  if (message.method === "tools/call") {
    try {
      const { name, arguments: args } = callParams(message.params);
      response(message.id, await callTool(name, args));
    } catch (error) {
      response(message.id, toolError(error instanceof Error ? error.message : "Tool call failed."));
    }
    return;
  }

  errorResponse(message.id, -32601, `Method not found: ${message.method}`);
}

async function handleLine(line: string): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed) as JsonRpcRequest | JsonRpcRequest[];
    const messages = Array.isArray(parsed) ? parsed : [parsed];
    for (const message of messages) await handleRequest(message);
  } catch (error) {
    errorResponse(undefined, -32700, error instanceof Error ? error.message : "Parse error.");
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() || "";
  for (const line of lines) void handleLine(line);
});
process.stdin.on("end", () => {
  if (buffer.trim()) void handleLine(buffer);
});
