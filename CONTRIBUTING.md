# Contributing

Vibe Coding Context OS is a local-first tool for AI coding context engineering. Contributions should preserve privacy-first defaults and keep generated artifacts reviewable.

## Local Setup

```bash
npm install
npm run dev
```

The web console runs at `http://127.0.0.1:5173` in development. The API runs at `http://127.0.0.1:8787`.

## Before Opening A PR

Run:

```bash
npm run lint
npm test
npm run build
npm run smoke
npm run mcp:smoke
npm run vibe -- privacy-audit
npm run vibe -- export
npm run vibe -- public-bundle
npm run vibe -- artifact-audit
npm run vibe -- mcp-audit
npm run pack:check
npm run package:smoke
```

For export or privacy changes, also run:

```bash
npm run vibe -- export
npm run vibe -- public-bundle
npm run vibe -- publish-check
npm run vibe -- artifact-audit
npm run vibe -- mcp-audit
```

`publish-check` may return `review` on a personal machine because the workspace root contains a private path. That is expected. `privacy-audit`, `artifact-audit`, and `mcp-audit` should not return `block` for publishable source and generated demo artifacts.

## Privacy Rules

- Do not commit raw sessions, `.env` files, private absolute paths, screenshots with local usernames, or generated `exports/`.
- Keep Codex session scanning opt-in.
- Keep `TASK_PACK.md`, generated exports, public bundles, and `context-map.json` free of raw snippets and real local roots.
- Treat MCP configs as executable trust boundaries; pin package versions and avoid committing private paths or secret values.
- Add or update regression tests when changing scanner, exporter, privacy, package, or MCP behavior.

## Design Rules

- Prefer CLI/API/UI consistency.
- Keep the web app an inspection console, not a marketing page.
- Keep agent-rule exports dry-run and review-first.
- Avoid adding model API dependencies to the core product.
