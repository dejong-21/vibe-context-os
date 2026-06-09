# Privacy Model

Vibe Coding Context OS is local-first by design. It can be used without model API keys, cloud storage, or external services.

## Defaults

- The API binds to `127.0.0.1`.
- The scanner reads the current working directory by default.
- Codex home session scanning is disabled by default.
- Generated files are written under `exports/`.
- Public demo artifacts are written under `exports/public`.
- Full generated exports replace private workspace roots and Codex home paths with `<workspace-root>` and `<codex-home>` by default.
- Trace diagnostics use sanitized session summaries and never export raw message samples.

## Opt-In Session Scanning

Enable Codex session scanning through `.vibe/config.json`:

```json
{
  "scan": {
    "includeCodexSessions": true,
    "sessionLookbackDays": 120
  }
}
```

Keep this disabled for public demos unless you have reviewed the sessions.

## Redaction

The scanner redacts common secret-like values before snippets enter the analysis result. Redaction findings are reported with fingerprints and source locations so the user can review them without exposing the original secret value.

Redaction is a safety net, not a guarantee. Treat session-derived artifacts, screenshots, and copied context excerpts as private until reviewed.

## Public Artifacts

Prefer these for GitHub demos:

- `exports/public/PUBLIC_CONTEXT_SUMMARY.json`
- `exports/public/PUBLIC_RELEASE_CHECKLIST.md`
- `exports/public/PUBLISH_CHECK_REPORT.md`
- `exports/public/CONFIG_DOCTOR_REPORT.md`
- `exports/public/GITHUB_PROFILE_SNIPPET.md`

The public bundle excludes the machine-readable `context-map.json` and session-derived `TRACE_REPORT.md`.

`exports/latest` is also placeholder-safe by default, but it still contains more operational detail than `exports/public`. Use `exports/public` for demos and screenshots unless you have reviewed the full bundle.

## Publish Gate

Use:

```bash
npm run vibe -- publish-check
npm run vibe -- privacy-audit
npm run vibe -- artifact-audit
npm run vibe -- mcp-audit
npm run vibe -- trace
```

The command blocks when redactions or critical drift are detected. A private local path warning is expected when running on a personal machine; replace paths with placeholders before publishing screenshots or copied reports.

`privacy-audit` checks publishable source files for common secret patterns, private absolute paths, session logs, and environment files. It ignores build output, dependencies, and generated export folders.

`artifact-audit` checks generated export folders for private absolute paths, raw session logs, and secret-like values. Run it after `export` and `public-bundle`.

`mcp-audit` checks local MCP configs for risky server command surfaces such as runtime `npx` installs, unpinned packages, sensitive environment keys, shell-like commands, and private absolute paths.

`trace` checks session-summary pressure, continuation loops, verification gaps, and private-path signals. Keep Trace reports private when they are derived from personal sessions; use the demo workspace for public screenshots.

Regression tests create temporary workspaces with `.env`, `.jsonl`, private path, and fake token fixtures to verify the audit still blocks the right cases without reading real local sessions.
