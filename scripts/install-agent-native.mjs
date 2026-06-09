import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillSource = path.join(repoRoot, "codex-skill", "vibe-context-os");
const commandSource = path.join(repoRoot, "agent-kit", "claude-code", "commands");

function hasFlag(name) {
  return args.includes(name);
}

function valueOf(name) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : undefined;
}

function usage() {
  return `Install Vibe Context OS agent-native surfaces

Usage:
  node scripts/install-agent-native.mjs --codex
  node scripts/install-agent-native.mjs --claude-user
  node scripts/install-agent-native.mjs --claude-project <workspace>

Options:
  --force      Replace existing target folders.
  --dry-run    Print planned writes without copying files.
`;
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(source, target, { force, dryRun }) {
  if (await exists(target)) {
    if (!force) {
      throw new Error(`${target} already exists. Re-run with --force after reviewing the existing files.`);
    }
    if (!dryRun) await fs.rm(target, { recursive: true, force: true });
  }
  if (dryRun) {
    console.log(`[dry-run] copy ${source} -> ${target}`);
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
  console.log(`Installed ${target}`);
}

async function main() {
  if (hasFlag("--help") || args.length === 0) {
    console.log(usage());
    return;
  }

  const force = hasFlag("--force");
  const dryRun = hasFlag("--dry-run");
  const installs = [];

  if (hasFlag("--codex")) {
    const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
    installs.push({ source: skillSource, target: path.join(codexHome, "skills", "vibe-context-os") });
  }

  if (hasFlag("--claude-user")) {
    installs.push({ source: skillSource, target: path.join(os.homedir(), ".claude", "skills", "vibe-context-os") });
  }

  const claudeProject = valueOf("--claude-project");
  if (claudeProject) {
    const workspace = path.resolve(claudeProject);
    installs.push({ source: skillSource, target: path.join(workspace, ".claude", "skills", "vibe-context-os") });
    installs.push({ source: commandSource, target: path.join(workspace, ".claude", "commands") });
  }

  if (installs.length === 0) {
    throw new Error("No install target selected. Use --codex, --claude-user, or --claude-project <workspace>.");
  }

  for (const install of installs) {
    await copyDir(install.source, install.target, { force, dryRun });
  }
}

await main();
