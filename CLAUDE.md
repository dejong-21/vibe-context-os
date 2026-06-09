# CLAUDE.md

## Project Context

Vibe Coding Context OS is a local-first context compiler for AI-assisted development. It scans approved project context, optionally scans Codex sessions, and generates reviewable agent rules, task packs, publish checks, and public-safe summaries.

## Working Rules

- Preserve privacy by default. Do not expose raw sessions, secrets, `.env` values, screenshots, or private absolute paths.
- Keep generated files in `exports/latest` or `exports/public` until a human reviews and applies them.
- Prefer small TypeScript/React/Express changes that fit existing modules.
- Use `.vibe/config.json` for scan scope and session opt-in behavior.
- Keep the web UI dense and operational rather than marketing-focused.

## Verification

Run these before finishing relevant code changes:

```bash
npm run lint
npm test
npm run build
npm run smoke
```

For export or release changes, also review:

```bash
npm run vibe -- apply-plan
npm run vibe -- drift
npm run vibe -- publish-check
```
