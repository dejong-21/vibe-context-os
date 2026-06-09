import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { config } from "./config.js";
import { defaultIgnore } from "./config.js";
import { safeRelative, shortHash } from "./utils.js";

export type McpRiskSeverity = "info" | "warn" | "block";

export interface McpServerSummary {
  name: string;
  file: string;
  command?: string;
  args: string[];
  envKeys: string[];
}

export interface McpRiskFinding {
  id: string;
  severity: McpRiskSeverity;
  title: string;
  file: string;
  server?: string;
  detail: string;
  action: string;
}

export interface McpAuditReport {
  status: "pass" | "review" | "block";
  checkedFiles: number;
  servers: McpServerSummary[];
  findings: McpRiskFinding[];
}

const mcpConfigPatterns = [
  ".mcp.json",
  "mcp.json",
  ".cursor/mcp.json",
  ".cursor/**/*.mcp.json",
  ".claude/settings.json",
  ".claude/settings.local.json",
  ".vibe/**/*mcp*.json",
  "**/*mcp*.json"
];

const dangerousCommandPattern = /\b(rm|del|erase|format|shutdown|reboot|curl|wget|powershell|pwsh|cmd|bash|sh|python|node)\b/i;
const privatePathPattern = /\b[A-Z]:[\\/](?:Users|Documents and Settings)[\\/]|\/Users\/|\/home\//i;
const secretEnvPattern = /(SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY|PRIVATE_KEY|AUTH|CREDENTIAL)/i;

function finding(
  severity: McpRiskSeverity,
  title: string,
  file: string,
  detail: string,
  action: string,
  server?: string
): McpRiskFinding {
  return {
    id: shortHash(`${severity}:${title}:${file}:${server || ""}:${detail}`),
    severity,
    title,
    file,
    server,
    detail,
    action
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function extractServers(json: unknown): Array<{ name: string; config: Record<string, unknown> }> {
  const root = asRecord(json);
  if (!root) return [];
  const containers = [root.mcpServers, root.servers, root.mcp, root];
  for (const container of containers) {
    const record = asRecord(container);
    if (!record) continue;
    const servers = Object.entries(record)
      .map(([name, value]) => ({ name, config: asRecord(value) }))
      .filter((item): item is { name: string; config: Record<string, unknown> } => Boolean(item.config));
    if (servers.some((item) => "command" in item.config || "url" in item.config || "type" in item.config)) return servers;
  }
  return [];
}

function hasPinnedPackage(args: string[]): boolean {
  return args.some((arg) => /@[0-9]+\.[0-9]+\.[0-9]+/.test(arg) || /@[a-f0-9]{7,40}$/i.test(arg));
}

function commandText(command: string | undefined, args: string[]): string {
  return [command, ...args].filter(Boolean).join(" ");
}

function assessServer(file: string, server: McpServerSummary): McpRiskFinding[] {
  const findings: McpRiskFinding[] = [];
  const text = commandText(server.command, server.args);
  const command = server.command || "";

  if (/^npx$/i.test(command) || server.args.includes("npx")) {
    findings.push(
      finding(
        "warn",
        "Ephemeral npx server",
        file,
        "This MCP server uses npx, which can download and execute package code at runtime.",
        "Pin the package version, vendor the server, or document why runtime package execution is acceptable.",
        server.name
      )
    );
    if (!hasPinnedPackage(server.args)) {
      findings.push(
        finding(
          "warn",
          "Unpinned MCP package",
          file,
          "The npx command does not include an explicit package version.",
          "Pin MCP server packages to a reviewed version before sharing the config.",
          server.name
        )
      );
    }
  }

  if (dangerousCommandPattern.test(text) && !/^node$/i.test(command)) {
    findings.push(
      finding(
        "warn",
        "Broad command surface",
        file,
        "The MCP server command or args include a shell, scripting runtime, network downloader, or destructive command token.",
        "Review the server command and prefer a narrow executable with documented permissions.",
        server.name
      )
    );
  }

  if (privatePathPattern.test(text)) {
    findings.push(
      finding(
        "block",
        "Private path in MCP config",
        file,
        "The MCP server command or args include a user-specific absolute path.",
        "Replace private absolute paths with placeholders before publishing.",
        server.name
      )
    );
  }

  for (const key of server.envKeys) {
    if (secretEnvPattern.test(key)) {
      findings.push(
        finding(
          "warn",
          "Sensitive environment key",
          file,
          `The MCP config references environment key ${key}.`,
          "Keep secret values outside committed config and document required env vars with placeholders.",
          server.name
        )
      );
    }
  }

  if (!server.command && text.length === 0) {
    findings.push(
      finding(
        "info",
        "Remote or non-stdio MCP server",
        file,
        "This entry does not expose a local command. Remote MCP servers still need trust and permission review.",
        "Document the server owner, requested scopes, and data boundary.",
        server.name
      )
    );
  }

  return findings;
}

export async function buildMcpAudit(): Promise<McpAuditReport> {
  const files = await fg(mcpConfigPatterns, {
    cwd: config.workspaceRoot,
    dot: true,
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: false,
    ignore: [...defaultIgnore, "**/exports/**", "**/package-lock.json"],
    absolute: true,
    suppressErrors: true
  });

  const servers: McpServerSummary[] = [];
  const findings: McpRiskFinding[] = [];

  for (const absolutePath of files) {
    const relativePath = safeRelative(config.workspaceRoot, absolutePath);
    let text = "";
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.size > 512 * 1024) continue;
      text = await fs.readFile(absolutePath, "utf8");
    } catch {
      continue;
    }
    if (!text.trim()) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      findings.push(
        finding(
          "warn",
          "Unreadable MCP JSON",
          relativePath,
          "A possible MCP config file could not be parsed as JSON.",
          "Fix JSON syntax or rename the file if it is not an MCP config."
        )
      );
      continue;
    }

    for (const server of extractServers(parsed)) {
      const env = asRecord(server.config.env) || {};
      const summary: McpServerSummary = {
        name: server.name,
        file: relativePath,
        command: typeof server.config.command === "string" ? server.config.command : undefined,
        args: asStringArray(server.config.args),
        envKeys: Object.keys(env)
      };
      servers.push(summary);
      findings.push(...assessServer(relativePath, summary));
    }
  }

  const status = findings.some((item) => item.severity === "block") ? "block" : findings.some((item) => item.severity === "warn") ? "review" : "pass";
  return {
    status,
    checkedFiles: files.length,
    servers,
    findings
  };
}

export function formatMcpAudit(report: McpAuditReport): string {
  const serverRows = report.servers.length
    ? report.servers
        .map((server) => `- ${server.name} in \`${server.file}\`: ${commandText(server.command, server.args) || "remote/non-stdio"}`)
        .join("\n")
    : "- No MCP servers found.";
  const findingRows = report.findings.length
    ? report.findings
        .map(
          (item) => `## [${item.severity}] ${item.title}

File: \`${item.file}\`${item.server ? `\nServer: \`${item.server}\`` : ""}

${item.detail}

Action: ${item.action}
`
        )
        .join("\n")
    : "No MCP risk findings were detected.";

  return `# MCP Safety Audit

Status: ${report.status}
Checked files: ${report.checkedFiles}
Servers found: ${report.servers.length}

## Servers

${serverRows}

## Findings

${findingRows}
`;
}
