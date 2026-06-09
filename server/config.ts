import os from "node:os";
import path from "node:path";

function normalizeEnvPath(value: string | undefined, fallback: string): string {
  return path.resolve(value && value.trim().length > 0 ? value : fallback);
}

const cwd = process.cwd();
const defaultWorkspaceRoot = cwd;

export const config = {
  port: Number.parseInt(process.env.PORT || "8787", 10),
  workspaceRoot: normalizeEnvPath(process.env.WORKSPACE_ROOT, defaultWorkspaceRoot),
  codexHome: normalizeEnvPath(process.env.CODEX_HOME, path.join(os.homedir(), ".codex")),
  lookbackDays: Number.parseInt(process.env.SESSION_LOOKBACK_DAYS || "120", 10),
  exportRoot: path.join(cwd, "exports"),
  maxFiles: Number.parseInt(process.env.MAX_SCAN_FILES || "900", 10),
  maxFileBytes: Number.parseInt(process.env.MAX_FILE_BYTES || `${256 * 1024}`, 10)
};

export const defaultIgnore = [
  "**/.git/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/dist-server/**",
  "**/build/**",
  "**/.next/**",
  "**/.vite/**",
  "**/.venv/**",
  "**/venv/**",
  "**/__pycache__/**",
  "**/.pytest_cache/**",
  "**/.idea/**",
  "**/.vscode/**",
  "**/exports/**",
  "**/tmp/**",
  "**/*.png",
  "**/*.jpg",
  "**/*.jpeg",
  "**/*.gif",
  "**/*.webp",
  "**/*.mp4",
  "**/*.zip",
  "**/*.7z",
  "**/*.rar",
  "**/*.tar",
  "**/*.gz",
  "**/*.pdf",
  "**/*.doc",
  "**/*.docx",
  "**/*.ppt",
  "**/*.pptx",
  "**/*.xlsx",
  "**/*.sqlite",
  "**/*.db"
];
