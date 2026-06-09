import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

export function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function shortHash(value: string | Buffer): string {
  return sha256(value).slice(0, 12);
}

export function safeRelative(root: string, target: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes approved root: ${target}`);
  }
  return toPosixPath(relative || ".");
}

export async function ensureInside(parent: string, child: string): Promise<void> {
  const resolvedParent = path.resolve(parent);
  const resolvedChild = path.resolve(child);
  const relative = path.relative(resolvedParent, resolvedChild);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${resolvedParent}`);
  }
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function firstSentences(text: string, maxLength = 240): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function scoreText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((score, keyword) => score + (lower.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}
