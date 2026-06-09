# AGENTS.md

## Project

Vibe Coding Context OS is a local-first context engineering tool for AI coding workflows. It scans approved local project context and recent coding sessions, then produces reviewable agent rules, task packs, publish checks, and public-safe portfolio artifacts.

## Operating Rules

- Treat local sessions, exports, screenshots, and absolute paths as private unless a public-safe bundle is explicitly requested.
- Keep generated artifacts in `exports/latest` or `exports/public`; do not overwrite real `AGENTS.md`, `CLAUDE.md`, Cursor rules, or other agent files without review.
- Prefer narrow changes that match the existing TypeScript, React, Express, and Vite structure.
- Use structured APIs and typed data instead of ad hoc string parsing when the codebase already provides a helper.
- Keep UI dense, calm, and tool-like; avoid marketing-page layout for the app itself.
- Before finishing code changes, run the relevant checks from the verification section.

## Verification

Use these commands from the project root:

```bash
npm run lint
npm test
npm run build
npm run smoke
```

For release-oriented changes, also run:

```bash
npm run vibe -- apply-plan
npm run vibe -- drift
npm run vibe -- publish-check
npm run vibe -- export
npm run vibe -- public-bundle
```

`npm run vibe -- publish-check` may exit non-zero when private workspace redactions or critical drift are detected. That is expected for private local scans and should block publication of session-derived material.

## Safety Boundaries

- No model or network API calls are required for the core product.
- The backend binds to `127.0.0.1` by default.
- Public demo material should come from `exports/public` and `PUBLIC_CONTEXT_SUMMARY.json`, not raw sessions.
- `context-map.json` is intended to be machine-readable and public-safe by default, but it should still be reviewed before publication.
