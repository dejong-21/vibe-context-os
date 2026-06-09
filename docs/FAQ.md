# FAQ

## Who is this for?

Developers who use AI coding tools such as Codex, Claude Code, Cursor, Gemini CLI, Cline/Roo, Continue, GitHub Copilot, or MCP clients, and want one local-first layer for context, rules, task packs, privacy checks, and publishable artifacts.

## What is it not?

Vibe Context OS is not another coding agent, prompt library, hosted session store, or automatic rule applier. It organizes and audits the context that other coding agents consume.

## Does it call an LLM API?

No. Core scan, export, privacy, trace, drift, config doctor, and MCP functions run locally without an LLM API key.

## Does it read Codex sessions?

Only when enabled in `.vibe/config.json` with `"includeCodexSessions": true`. Session-derived diagnostics are for private local analysis and should not be published as raw logs.

## Why does `publish-check` sometimes say `review`?

`review` means there is a manual publishing concern, not necessarily a blocker. A common example is working from a user-specific local path. Public artifacts should use placeholders such as `<workspace-root>` instead of absolute paths.

## Why does `config-doctor` say missing surfaces?

It checks whether common AI coding entry points exist and repeat the same safety, verification, context, handoff, and tool rules. Missing surfaces are suggestions, not files that are automatically created.

## Should I commit `exports/`?

Usually no. Commit source code, docs, screenshots from the demo workspace, and selected reviewed examples. Treat `exports/latest` as working output and `exports/public` as reviewable publish material.

## Why Node.js 22?

The package targets current Node.js runtime behavior and CI runs on Node 22. Use Node 22 or newer for local development and package smoke tests.

## What if port 8787 is already in use?

Set `PORT` before starting the server:

```bash
PORT=8790 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=8790; npm start
```

## How do I use it with an MCP client?

Build or install the package, then configure the client to run:

```bash
vibe-context mcp
```

Start from the generated `.mcp.vibe-context.example.json`, review the command and workspace path, then copy only the safe parts into your real MCP config.

## How do I make screenshots safe?

Use `demo-workspace/` for public screenshots. Do not publish images that show local usernames, absolute paths, raw sessions, secrets, `.env` files, or private repository names.
