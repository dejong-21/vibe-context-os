import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "codex-skill/vibe-context-os/SKILL.md",
  "codex-skill/vibe-context-os/references/agent-native.md",
  "codex-skill/vibe-context-os/scripts/vibe-agent.mjs",
  "codex-skill/vibe-context-os/agents/openai.yaml",
  "agent-kit/claude-code/commands/vibe-preflight.md",
  "agent-kit/claude-code/commands/vibe-pack.md",
  "agent-kit/claude-code/commands/vibe-publish.md",
  "docs/AGENT_NATIVE.md"
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function readRequired(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  try {
    return await fs.readFile(absolutePath, "utf8");
  } catch {
    fail(`Missing required agent-native file: ${relativePath}`);
  }
}

function expectText(file, text, snippets) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      fail(`${file} is missing required text: ${snippet}`);
    }
  }
}

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    stdio: "inherit"
  });
  if (result.error) fail(`${label} failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} exited with code ${result.status}`);
}

for (const file of requiredFiles) {
  await readRequired(file);
}

const skill = await readRequired("codex-skill/vibe-context-os/SKILL.md");
expectText("codex-skill/vibe-context-os/SKILL.md", skill, [
  "Vibe Context OS",
  "preflight",
  "pack",
  "publish"
]);

const reference = await readRequired("codex-skill/vibe-context-os/references/agent-native.md");
expectText("codex-skill/vibe-context-os/references/agent-native.md", reference, [
  "Codex",
  "Claude Code",
  "vibe-agent.mjs"
]);

for (const commandFile of [
  "agent-kit/claude-code/commands/vibe-preflight.md",
  "agent-kit/claude-code/commands/vibe-pack.md",
  "agent-kit/claude-code/commands/vibe-publish.md"
]) {
  const text = await readRequired(commandFile);
  expectText(commandFile, text, ["vibe-agent.mjs"]);
}

run("agent helper help", process.execPath, ["codex-skill/vibe-context-os/scripts/vibe-agent.mjs", "help"]);
run("codex install dry-run", process.execPath, ["scripts/install-agent-native.mjs", "--dry-run", "--codex"]);
run("claude project install dry-run", process.execPath, [
  "scripts/install-agent-native.mjs",
  "--dry-run",
  "--claude-project",
  "demo-workspace"
]);
run("agent preflight", process.execPath, [
  "codex-skill/vibe-context-os/scripts/vibe-agent.mjs",
  "preflight",
  "--workspace",
  "demo-workspace"
]);
run("agent pack", process.execPath, [
  "codex-skill/vibe-context-os/scripts/vibe-agent.mjs",
  "pack",
  "--workspace",
  "demo-workspace",
  "--task",
  "agent-native release check"
]);

console.log("Agent-native checks passed.");
