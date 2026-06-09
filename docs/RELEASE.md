# Release Checklist

Use this checklist before publishing a GitHub release, npm package, or personal-homepage demo.

## Repository Metadata

- Confirm the GitHub repository URL.
- Add or update `repository`, `homepage`, `bugs`, and `author` in `package.json` once the final GitHub location is known.
- Confirm the README screenshots are from `demo-workspace/`.
- Confirm `SECURITY.md` points to the preferred private security contact or GitHub Security Advisory flow.

## Local Gate

```bash
npm run release:check
```

This runs lint, regression tests, build, smoke checks, MCP smoke, privacy audit, drift, publish-check, export/public-bundle generation, config fix pack generation, artifact audit, MCP audit, config doctor, trace, npm pack dry-run, and installed-package smoke tests.

## Public-Safety Gate

```bash
npm run vibe -- privacy-audit
npm run vibe -- public-bundle
npm run vibe -- artifact-audit
npm run vibe -- mcp-audit
```

Review these manually:

- No raw session logs.
- No `.env` files.
- No API keys, tokens, private keys, or credentials.
- No private absolute paths in docs, JSON, generated artifacts, screenshots, or examples.
- No unreviewed MCP command with broad filesystem, shell, or network reach.

## GitHub Release Prep

- Update `CHANGELOG.md`.
- Run `npm run examples:refresh` when generated outputs or docs screenshots change.
- Run `npm run agent:install -- --dry-run --codex` and `npm run agent:install -- --dry-run --claude-project demo-workspace` when agent-native kit files change.
- Verify `README.md`, `README.zh-CN.md`, `docs/SHOWCASE.md`, and `docs/examples/` match the current UI.
- Keep `exports/`, `dist/`, `dist-server/`, `node_modules/`, temporary logs, and local package tarballs out of commits unless there is a deliberate release reason.
- Tag only after CI passes on `main`.

## npm Prep

- Run `npm run pack:check`.
- Inspect the tarball contents in the command output.
- Confirm `README.zh-CN.md`, docs, demo workspace, Codex skill, and built assets are included.
- Confirm no private generated artifacts are included.

## Personal Homepage Prep

- Use the one-line pitch and resume bullets from `docs/SHOWCASE.md`.
- Prefer screenshots from `docs/assets/`.
- Link to `docs/examples/` so visitors can inspect real generated outputs without running the project.
