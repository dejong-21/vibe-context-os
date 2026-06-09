# Showcase Guide

Use this page as the source for GitHub repository highlights, personal homepage copy, and resume project bullets.

## One-Line Pitch

Vibe Coding Context OS is a local-first DevTools layer for AI coding agents. It turns scattered repo rules, AI coding sessions, privacy checks, MCP configs, and repeated workflows into reusable task packs, agent instructions, safety audits, MCP tools, and public-safe portfolio artifacts.

## Why It Matters

AI coding tools are strongest when they receive the right context and weakest when they receive raw, stale, or private context. This project focuses on the missing layer between the developer and the coding agent:

- Capture local rules, docs, code, and optional Codex sessions.
- Structure them into compact context maps and task packs.
- Verify drift, privacy, context budget, and publish readiness.
- Check whether Codex, Claude, Cursor, Gemini, Cline/Roo, Continue, Copilot, and MCP configs stay aligned.
- Inspect trace pressure, continuation loops, verification gaps, and private-path signals from session summaries.
- Audit generated exports and MCP configs before sharing them.
- Review publish, privacy, artifact, and MCP release gates from the web console.
- Export agent-specific files for Codex, Claude Code, Cursor, Gemini CLI, Cline/Roo, Continue, GitHub Copilot, and MCP clients.
- Keep private data local by default.

## Demo Script

Run the clean demo workspace:

```bash
npm install
npm run vibe -- demo
npm run vibe -- demo --export
npm run vibe -- demo --public-bundle
npm run vibe -- demo --privacy-audit
```

Then run the full app:

```bash
npm run build
npm start
```

Open `http://127.0.0.1:8787` and show:

1. Overview: context signal, workflow stages, publish status, privacy status.
2. Task Pack: generate a focused handoff for a coding task.
3. Drift: stale or incomplete agent context checks.
4. Config: cross-agent config coverage, missing surfaces, verification coverage, and the review-only Fix Pack write action.
5. Trace: session pressure, continuation loops, verification gaps, and recommendations.
6. Privacy and Exports: source/MCP audits, release gates, generated agent files, public bundle, config doctor, trace report, and dry-run apply plan.
7. Language toggle: switch the inspection console to Chinese and show that navigation, core pages, and export controls localize without changing generated artifacts.

## What To Screenshot

- Overview with Privacy `pass` and Publish status visible.
- Task Pack preview with `<workspace-root>` placeholder instead of a private path.
- Config page showing cross-agent coverage score, missing surfaces, and review-only Fix Pack generation.
- Trace page showing session pressure and verification recommendations without raw session text.
- Exports page showing GitHub Copilot, Claude Project Skill, MCP config, and Apply Plan.
- Chinese UI toggle showing localized navigation, Config, Trace, and Exports pages.
- Privacy page showing the audit status and no findings.
- MCP Safety section showing server count and no blocking findings.

Do not publish screenshots that contain private absolute paths, raw session text, secrets, or local usernames. Use the demo workspace when preparing public images.

## Included Public-Safe Screenshots

These screenshots were captured from the bundled demo workspace and are safe to reuse in the README, GitHub social previews, or a personal homepage.

![Overview scan](assets/overview-en.png)

![Chinese Config Doctor](assets/config-zh.png)

![Chinese export bundle](assets/exports-ready-zh.png)

## Included Public-Safe Outputs

Use [docs/examples](examples/README.md) when you want visitors to inspect the product output without running the app. The examples include a task context pack, public context summary, config doctor report, MCP tool policy, release checklist, and GitHub profile snippet generated from `demo-workspace/`.

## Engineering Signals

This project demonstrates:

- TypeScript/Node/React product engineering.
- Local-first LLM application architecture.
- Context engineering for AI coding agents.
- Agent-native workflow design through Codex skills, Claude Code command templates, CLI, and MCP.
- MCP stdio tool server implementation.
- Cross-agent config doctor for Codex, Claude Code, Cursor, Gemini CLI, Cline/Roo, Continue, GitHub Copilot, and MCP.
- Privacy-first scanning and source audit gates.
- Trace Inspector for session pressure, continuation workflows, and verification gaps.
- Optional Chinese UI for the web inspection console while preserving stable English reports for GitHub, CLI, and MCP workflows.
- Generated artifact audit for placeholder-safe GitHub exports.
- MCP config safety audit for AI coding toolchains.
- Multi-agent workflow export across Codex, Claude Code, Cursor, Gemini CLI, Cline/Roo, Continue, and GitHub Copilot.
- CI quality gates, regression tests, package smoke tests, and public-safe artifact generation.

## Resume Bullets

- Built a local-first AI coding context OS that scans repository rules, docs, code, and optional Codex sessions to generate task packs, agent rules, trace reports, drift reports, and publish-safe artifacts.
- Implemented a stdio MCP server exposing scan, drift, budget, status, publish, privacy, artifact audit, MCP audit, config doctor, trace, pack, export, and public-bundle tools for MCP-capable AI coding clients.
- Added a cross-agent config doctor that scores rule coverage and detects missing safety, tool, handoff, and verification guidance across AI coding clients.
- Built review-only config fix pack generation across CLI, MCP, API, exports, and the web console, producing actionable agent-rule suggestions without overwriting user files.
- Designed privacy gates that detect secret-like values, `.env` files, JSONL session logs, private absolute paths, unsafe generated exports, and risky MCP configs before GitHub publication.
- Added end-to-end quality gates including TypeScript checks, regression tests, production smoke tests, MCP smoke tests, npm pack dry-run, and installed-package smoke tests.

## Roadmap

- Expand Trace Inspector from summary-level pressure diagnostics into tool-call timelines, file-read maps, and failure pattern clustering.
- Add stricter MCP Safety Center checks for permission scope, package trust, remote endpoints, and registry metadata.
- Add auto-fix suggestions for config doctor findings without overwriting existing agent files.
- Add eval harness for skills/task packs that scores whether agents follow the intended workflow and safety boundary.
- Add a curated library of evaluated workflow packs for RAG apps, MCP servers, agent evals, observability, React/Vite tools, and FastAPI services.
