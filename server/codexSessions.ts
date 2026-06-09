import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { CodingSession, RedactionFinding, SessionMessage } from "./types.js";
import { config } from "./config.js";
import { redactText } from "./security.js";
import { firstSentences, monthKey, safeRelative, shortHash, unique } from "./utils.js";

interface SessionIndexItem {
  id: string;
  thread_name?: string;
  updated_at?: string;
}

function roleOf(value: unknown): SessionMessage["role"] {
  if (value === "user" || value === "assistant" || value === "system" || value === "tool") return value;
  return "other";
}

async function loadSessionIndex(): Promise<Map<string, SessionIndexItem>> {
  const indexPath = path.join(config.codexHome, "session_index.jsonl");
  const map = new Map<string, SessionIndexItem>();
  try {
    const text = await fs.readFile(indexPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line) as SessionIndexItem;
        if (item.id) map.set(item.id, item);
      } catch {
        // Ignore partial index rows.
      }
    }
  } catch {
    // Codex index is optional.
  }
  return map;
}

function extractInputText(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  const parts: string[] = [];
  for (const item of content) {
    if (item && typeof item === "object" && "type" in item && (item as { type?: string }).type === "input_text") {
      const text = (item as { text?: unknown }).text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts;
}

function isNoise(text: string): boolean {
  const trimmed = text.trim();
  return (
    !trimmed ||
    trimmed.startsWith("# AGENTS.md instructions") ||
    trimmed.startsWith("<environment_context>") ||
    trimmed.startsWith("<skills_instructions>") ||
    trimmed.startsWith("<plugins_instructions>") ||
    trimmed.startsWith("<permissions instructions>")
  );
}

function tagSession(blob: string, title: string): string[] {
  const haystack = `${title}\n${blob}`.toLowerCase();
  const tags: string[] = [];
  const groups: Record<string, string[]> = {
    "context-engineering": ["agents.md", "claude.md", "cursor", "rule", "skill", "context", "prompt"],
    "coding-agent": ["codex", "claude code", "opencode", "agent", "mcp", "tool"],
    research: ["论文", "科研", "复现", "experiment", "paper", "loft", "bonai", "building"],
    infra: ["autodl", "4090", "server", "服务器", "ssh", "docker", "部署", "remote"],
    debugging: ["bug", "fix", "error", "报错", "排查", "debug", "root cause"],
    docs: ["readme", "ppt", "docx", "pdf", "文档", "slides"],
    automation: ["workflow", "工作流", "自动化", "playwright", "browser", "chrome"]
  };
  for (const [tag, keywords] of Object.entries(groups)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) tags.push(tag);
  }
  return tags.length > 0 ? tags : ["general"];
}

async function parseCodexJsonl(filePath: string, index: Map<string, SessionIndexItem>): Promise<{ session?: CodingSession; risks: RedactionFinding[] }> {
  const raw = await fs.readFile(filePath, "utf8");
  const risks: RedactionFinding[] = [];
  const messages: SessionMessage[] = [];
  let id = shortHash(filePath);
  let metaTimestamp = new Date((await fs.stat(filePath)).mtimeMs).toISOString();
  const sourcePath = safeRelative(config.codexHome, filePath);

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let row: unknown;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (!row || typeof row !== "object") continue;
    const object = row as { timestamp?: string; type?: string; payload?: Record<string, unknown> };
    const payload = object.payload || {};
    if (object.type === "session_meta") {
      const payloadId = payload.id;
      const payloadTimestamp = payload.timestamp;
      if (typeof payloadId === "string") id = payloadId;
      if (typeof payloadTimestamp === "string") metaTimestamp = payloadTimestamp;
      continue;
    }
    if (payload.role) {
      const texts = extractInputText(payload.content);
      for (const value of texts) {
        if (isNoise(value)) continue;
        const { text, findings } = redactText(sourcePath, value.replace(/\s+/g, " ").trim());
        risks.push(...findings);
        messages.push({ role: roleOf(payload.role), text, timestamp: object.timestamp });
      }
    }
    if (payload.type === "user_message" && typeof payload.message === "string" && !isNoise(payload.message)) {
      const { text, findings } = redactText(sourcePath, payload.message.replace(/\s+/g, " ").trim());
      risks.push(...findings);
      messages.push({ role: "user", text, timestamp: object.timestamp });
    }
  }

  if (messages.length === 0) return { risks };
  const indexed = index.get(id);
  const title = indexed?.thread_name || firstSentences(messages[0]?.text || path.basename(filePath), 80);
  const blob = messages.map((message) => message.text).join("\n");

  return {
    risks,
    session: {
      id: shortHash(`${id}:${filePath}`),
      title,
      provider: "codex",
      sourcePath,
      updatedAt: indexed?.updated_at || metaTimestamp,
      messageCount: messages.length,
      userTurns: messages.filter((message) => message.role === "user").length,
      assistantTurns: messages.filter((message) => message.role === "assistant").length,
      sample: messages.slice(0, 6),
      tags: tagSession(blob, title),
      summary: firstSentences(blob, 320)
    }
  };
}

async function parseWorkspaceSession(filePath: string): Promise<{ session?: CodingSession; risks: RedactionFinding[] }> {
  const sourcePath = safeRelative(config.workspaceRoot, filePath);
  const raw = await fs.readFile(filePath, "utf8");
  const json = JSON.parse(raw) as { title?: string; name?: string; messages?: Array<{ role?: string; content?: string; text?: string }> };
  const risks: RedactionFinding[] = [];
  const messages: SessionMessage[] = [];

  for (const item of json.messages || []) {
    const value = typeof item.content === "string" ? item.content : typeof item.text === "string" ? item.text : "";
    if (isNoise(value)) continue;
    const { text, findings } = redactText(sourcePath, value.replace(/\s+/g, " ").trim());
    risks.push(...findings);
    messages.push({ role: roleOf(item.role), text });
  }
  if (messages.length === 0) return { risks };
  const stat = await fs.stat(filePath);
  const title = json.title || json.name || firstSentences(messages[0].text, 80);
  const blob = messages.map((message) => message.text).join("\n");

  return {
    risks,
    session: {
      id: shortHash(`${filePath}:${stat.mtimeMs}`),
      title,
      provider: "workspace",
      sourcePath,
      updatedAt: new Date(stat.mtimeMs).toISOString(),
      messageCount: messages.length,
      userTurns: messages.filter((message) => message.role === "user").length,
      assistantTurns: messages.filter((message) => message.role === "assistant").length,
      sample: messages.slice(0, 6),
      tags: tagSession(blob, title),
      summary: firstSentences(blob, 320)
    }
  };
}

export interface SessionScanOptions {
  includeCodexSessions?: boolean;
  lookbackDays?: number;
}

export async function scanSessions(options: SessionScanOptions = {}): Promise<{ sessions: CodingSession[]; risks: RedactionFinding[]; timeline: Map<string, number> }> {
  const includeCodexSessions = options.includeCodexSessions ?? false;
  const lookbackDays = options.lookbackDays || config.lookbackDays;
  const index = includeCodexSessions ? await loadSessionIndex() : new Map<string, SessionIndexItem>();
  const cutoffMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const codexPatterns = ["sessions/**/*.jsonl", "archived_sessions/*.jsonl"];
  const codexFiles = includeCodexSessions
    ? await fg(codexPatterns, {
        cwd: config.codexHome,
        absolute: true,
        onlyFiles: true,
        suppressErrors: true,
        ignore: ["**/node_modules/**", "**/.git/**"]
      })
    : [];

  const workspaceSessionFiles = await fg(["sessions/**/*.json"], {
    cwd: config.workspaceRoot,
    absolute: true,
    onlyFiles: true,
    suppressErrors: true,
    ignore: ["**/node_modules/**", "**/.git/**"]
  });

  const sessions: CodingSession[] = [];
  const risks: RedactionFinding[] = [];

  for (const filePath of codexFiles) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs < cutoffMs) continue;
      const parsed = await parseCodexJsonl(filePath, index);
      risks.push(...parsed.risks);
      if (parsed.session) sessions.push(parsed.session);
    } catch {
      // Partial session files are expected during active Codex usage.
    }
  }

  for (const filePath of workspaceSessionFiles) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs < cutoffMs) continue;
      const parsed = await parseWorkspaceSession(filePath);
      risks.push(...parsed.risks);
      if (parsed.session) sessions.push(parsed.session);
    } catch {
      // Workspace chat logs can have arbitrary shape.
    }
  }

  const deduped = new Map<string, CodingSession>();
  for (const session of sessions) {
    deduped.set(`${session.provider}:${session.sourcePath}`, session);
  }

  const sorted = [...deduped.values()].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)).slice(0, 240);
  const timeline = new Map<string, number>();
  for (const session of sorted) {
    const date = Number.isFinite(Date.parse(session.updatedAt)) ? new Date(session.updatedAt) : new Date();
    const key = monthKey(date);
    timeline.set(key, (timeline.get(key) || 0) + 1);
  }

  for (const session of sorted) {
    session.tags = unique(session.tags);
  }

  return { sessions: sorted, risks, timeline };
}
