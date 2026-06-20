# Changelog

## 0.1.0

Initial launch-ready beta.

- Repositioned the project as an Agent Context Doctor for AI coding workflows.
- Added `vibe-context-os` and `agent-context-doctor` package binary aliases.
- Changed `doctor` into a quick diagnosis command backed by the shared status report.
- Added `badge` for README-ready agent-readiness badges.
- Added reusable GitHub Action metadata in `action.yml` for CI agent-readiness checks.
- Added `ROADMAP.md` with the community packaging, rules doctor, CI, and ecosystem integration path.
- Added community research and adoption playbook docs for the 2026-06-20 ecosystem snapshot.
- Updated English and Chinese README first screens around `npx`, agent-native usage, and GitHub Actions.
- Local-first scanner for project rules, docs, manifests, code, and optional Codex sessions.
- Agent-native Codex/Claude skill workflow, helper script, and Claude Code command templates.
- Safe installer for Codex and Claude Code agent-native surfaces.
- Context analysis, workflow classification, drift checks, context budget, and publish checks.
- Privacy audit for secret-like values, `.env` files, JSONL session logs, and private absolute paths.
- Generated artifact audit for private paths, raw session logs, and secret-like values in `exports/`.
- Web release-gate panel for publish, privacy, generated artifact, and MCP readiness before GitHub sharing.
- Release gate finding summaries in the web console, plus drift and publish-check coverage in CI and local release checks.
- MCP safety audit for runtime package installs, unpinned servers, sensitive env keys, broad commands, and private paths.
- Shared status report across CLI, MCP, API, and the web console.
- Cross-Agent Config Doctor across CLI, MCP, API, exports, and the web console for rule coverage and consistency.
- Review-only Config Fix Pack generation from CLI, MCP, exports, public bundle, and the web console.
- Trace Inspector across CLI, MCP, API, exports, and the web console for session pressure, continuation loops, verification gaps, and private-path signals.
- Task pack generation with public-safe workspace placeholders.
- Full placeholder-safe export bundle for Codex, Claude Code, Cursor, Gemini CLI, Cline/Roo, Continue, GitHub Copilot, Claude project skills, MCP policy, and MCP client config.
- Public-safe bundle for GitHub demos and portfolio material.
- Web inspection console with overview, task pack, config, trace, drift, sessions, sources, privacy, exports views, and optional Chinese UI labels.
- Chinese README, architecture-at-a-glance overview, and GitHub-facing documentation for bilingual showcase use.
- Public-safe example outputs, FAQ, and release checklist for GitHub visitors and maintainers.
- `examples:refresh` script for regenerating docs examples from the bundled demo workspace.
- Mobile navigation polish for the bilingual web inspection console.
- Stdio MCP server with scan, drift, budget, status, publish, privacy, artifact audit, MCP audit, config doctor, trace, pack, export, and public-bundle tools.
- CI checks for lint, regression, build, smoke, MCP smoke, privacy audit, export/public-bundle generation, artifact audit, MCP audit, config doctor, trace, pack dry-run, and installed-package smoke.
