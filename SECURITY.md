# Security Policy

## Supported Versions

Vibe Coding Context OS is currently pre-1.0. Security fixes target the latest `main` branch and the latest published package version once releases begin.

## Reporting A Vulnerability

Do not open public issues containing secrets, session logs, private paths, tokens, screenshots with local usernames, or exploitable payloads.

When the GitHub repository is public, prefer GitHub Security Advisories for private reports. If private advisories are not enabled yet, open a minimal public issue that says a private security report is available without including sensitive details.

Useful report details:

- Version or commit.
- Operating system and Node.js version.
- Minimal command sequence.
- Whether `WORKSPACE_ROOT`, `CODEX_HOME`, or `.vibe/config.json` were customized.
- Redacted output from `vibe-context doctor`, `vibe-context privacy-audit --json`, `vibe-context artifact-audit --json`, `vibe-context mcp-audit --json`, and `vibe-context publish-check --json`.

## Security Boundaries

- The API binds to `127.0.0.1`.
- No model API calls are required for core functionality.
- Codex home session scanning is opt-in.
- Generated files are written under `exports/` unless a human manually applies them.
- Generated exports replace private workspace and Codex home paths with placeholders by default.
- Public bundles exclude `context-map.json` and raw session content.
- MCP configs are treated as executable trust boundaries and should be reviewed before sharing or enabling.

## Non-Goals

The redaction engine is a release guard, not a cryptographic guarantee. Review generated artifacts, screenshots, and copied reports before publishing.
