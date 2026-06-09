import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

export interface WorkspaceConfig {
  scan?: {
    includeCodexSessions?: boolean;
    sessionLookbackDays?: number;
    include?: string[];
    exclude?: string[];
    maxFiles?: number;
    maxFileBytes?: number;
  };
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

export async function loadWorkspaceConfig(): Promise<WorkspaceConfig> {
  const target = path.join(config.workspaceRoot, ".vibe", "config.json");
  try {
    const raw = await fs.readFile(target, "utf8");
    const parsed = JSON.parse(raw) as { scan?: Record<string, unknown> };
    return {
          scan: parsed.scan
        ? {
            includeCodexSessions:
              typeof parsed.scan.includeCodexSessions === "boolean" ? parsed.scan.includeCodexSessions : undefined,
            sessionLookbackDays: positiveInteger(parsed.scan.sessionLookbackDays),
            include: stringArray(parsed.scan.include),
            exclude: stringArray(parsed.scan.exclude),
            maxFiles: positiveInteger(parsed.scan.maxFiles),
            maxFileBytes: positiveInteger(parsed.scan.maxFileBytes)
          }
        : undefined
    };
  } catch {
    return {};
  }
}
