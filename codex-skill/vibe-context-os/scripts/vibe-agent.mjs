#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const mode = args[0] || "help";

function valueOf(name, fallback) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  return `Vibe Context OS agent helper

Usage:
  node scripts/vibe-agent.mjs preflight --workspace <path>
  node scripts/vibe-agent.mjs pack --workspace <path> --task "task"
  node scripts/vibe-agent.mjs publish --workspace <path>
  node scripts/vibe-agent.mjs config --workspace <path>
  node scripts/vibe-agent.mjs trace --workspace <path>

Options:
  --workspace <path>   Approved workspace root. Defaults to current directory.
  --task <text>        Task for pack mode.
  --json               Forward JSON output when supported.
`;
}

function findUp(start, predicate) {
  let current = path.resolve(start);
  while (true) {
    if (predicate(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function isVibeSourceRepo(dir) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    return parsed.name === "vibe-context-os" && fs.existsSync(path.join(dir, "server", "cli.ts"));
  } catch {
    return false;
  }
}

function executableExists(file) {
  return fs.existsSync(file) || (process.platform === "win32" && fs.existsSync(`${file}.cmd`));
}

function localBin(start) {
  const root = findUp(start, (dir) => executableExists(path.join(dir, "node_modules", ".bin", "vibe-context")));
  if (!root) return undefined;
  const base = path.join(root, "node_modules", ".bin", "vibe-context");
  return process.platform === "win32" && fs.existsSync(`${base}.cmd`) ? `${base}.cmd` : base;
}

function sourceCommand(workspace) {
  const envHome = process.env.VIBE_CONTEXT_OS_HOME;
  const sourceRoot = envHome && isVibeSourceRepo(envHome) ? path.resolve(envHome) : findUp(process.cwd(), isVibeSourceRepo);
  if (!sourceRoot) return undefined;
  if (process.platform === "win32") {
    const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    return { command: process.execPath, prefix: [npmCli, "run", "vibe", "--"], cwd: sourceRoot, workspace };
  }
  return { command: "npm", prefix: ["run", "vibe", "--"], cwd: sourceRoot, workspace };
}

function resolveRunner(workspace) {
  if (process.env.VIBE_CONTEXT_CLI) {
    return { command: process.env.VIBE_CONTEXT_CLI, prefix: [], cwd: process.cwd(), workspace };
  }
  const source = sourceCommand(workspace);
  if (source) return source;
  const local = localBin(workspace);
  if (local) return { command: local, prefix: [], cwd: workspace, workspace };
  return { command: process.platform === "win32" ? "vibe-context.cmd" : "vibe-context", prefix: [], cwd: workspace, workspace };
}

function runVibe(runner, commandArgs, options = {}) {
  const fullArgs = [...runner.prefix, ...commandArgs, "--workspace", runner.workspace];
  const result = spawnSync(runner.command, fullArgs, {
    cwd: runner.cwd,
    env: process.env,
    encoding: "utf8",
    shell: false
  });
  if (result.error) {
    console.error(`Unable to run ${runner.command}. Install vibe-context-os, run from its source repo, or set VIBE_CONTEXT_CLI/VIBE_CONTEXT_OS_HOME.`);
    console.error(result.error.message);
    process.exit(1);
  }
  const label = commandArgs.join(" ");
  if (!options.quiet) {
    console.log(`\n## ${label}\n`);
    if (result.stdout.trim()) console.log(result.stdout.trim());
    if (result.stderr.trim()) console.error(result.stderr.trim());
  }
  return result.status || 0;
}

function main() {
  if (mode === "help" || hasFlag("--help")) {
    console.log(usage());
    return;
  }

  const workspace = path.resolve(valueOf("--workspace", process.cwd()));
  const task = valueOf("--task", "");
  const json = hasFlag("--json");
  const runner = resolveRunner(workspace);
  const jsonFlag = json ? ["--json"] : [];
  let exitCode = 0;

  if (mode === "preflight") {
    for (const commandArgs of [["status", ...jsonFlag], ["drift"], ["privacy-audit", ...jsonFlag], ["config-doctor", ...jsonFlag], ["trace", ...jsonFlag]]) {
      exitCode = Math.max(exitCode, runVibe(runner, commandArgs));
    }
  } else if (mode === "pack") {
    if (!task.trim()) {
      console.error("pack mode requires --task.");
      process.exit(1);
    }
    exitCode = runVibe(runner, ["pack", "--task", task, ...jsonFlag]);
  } else if (mode === "publish") {
    for (const commandArgs of [
      ["publish-check", ...jsonFlag],
      ["privacy-audit", ...jsonFlag],
      ["public-bundle", ...jsonFlag],
      ["artifact-audit", ...jsonFlag],
      ["mcp-audit", ...jsonFlag]
    ]) {
      exitCode = Math.max(exitCode, runVibe(runner, commandArgs));
    }
  } else if (mode === "config") {
    for (const commandArgs of [["config-doctor", ...jsonFlag], ["config-fix-pack", ...jsonFlag], ["apply-plan", ...jsonFlag]]) {
      exitCode = Math.max(exitCode, runVibe(runner, commandArgs));
    }
  } else if (mode === "trace") {
    exitCode = runVibe(runner, ["trace", ...jsonFlag]);
  } else {
    console.error(`Unknown mode: ${mode}\n`);
    console.error(usage());
    process.exit(1);
  }

  process.exitCode = exitCode;
}

main();
