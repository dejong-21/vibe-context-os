# Roadmap

Vibe Context OS is moving toward a small, agent-native doctor for AI coding workflows. The goal is not to replace Codex, Claude Code, Cursor, OpenCode, Gemini CLI, or Cline. The goal is to help those agents receive cleaner context, safer tool policy, and reviewable handoff material.

## v0.1.x: Community Packaging

- Publish an npm package with `npx vibe-context-os doctor`.
- Ship the reusable GitHub Action in `action.yml`.
- Keep the Web console as an optional inspection surface, not the primary workflow.
- Keep public-safe demo outputs in `docs/examples`.
- Add short terminal demos for `doctor`, `pack`, and `publish-check`.

## v0.2.x: Agent Rules Doctor

- Score `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, GitHub Copilot instructions, Gemini rules, Cline/Roo rules, and Continue prompts for overlap, drift, and missing verification guidance.
- Add clearer suggested patches for rule files while keeping all writes review-only.
- Add a compact agent-readiness badge payload for README use.
- Improve MCP policy checks for pinned package versions, environment exposure, and broad shell commands.

## v0.3.x: CI and Pull Request Review

- Add a first-class PR comment mode for GitHub Actions.
- Upload generated reports as workflow artifacts.
- Support monorepos with per-package context packs.
- Add baseline comparison so teams can see whether agent readiness improved or regressed.

## v0.4.x: Ecosystem Integrations

- Add templates for Codex, Claude Code, OpenCode, Gemini CLI, Cursor, Cline/Roo, Continue, Aider, and GitHub Copilot in one normalized export surface.
- Add MCP registry metadata and a more guided MCP client setup flow.
- Add optional local trace importers for other agent tools when their export formats are public and stable.

## Design Constraints

- Local-first by default.
- No raw private sessions in public bundles.
- Review-only generated changes unless a human applies them.
- Useful without an LLM API key.
- Agent-native first: CLI, skill, MCP, and GitHub Action before dashboard features.
