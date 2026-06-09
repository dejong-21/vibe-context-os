# Public Release Checklist

Use this checklist before pushing Vibe-generated artifacts to GitHub.

## Safe To Publish After Review

- README.md
- Source code under `src/` and `server/`
- `codex-skill/vibe-context-os/SKILL.md`
- `PUBLIC_CONTEXT_SUMMARY.json`
- Reviewed generated rules without private paths or session content

## Do Not Publish Until Clean

- Raw session logs, screenshots, or copied context excerpts when redaction findings are non-zero
- Raw Codex/session logs
- Any file containing private absolute paths, API keys, tokens, local usernames, or unrevised experiment logs

## Current Gate

- Publish status: review
- Redaction findings: 0
- Drift findings: 4
- Estimated context tokens: 840

## Required Actions

- No redaction blocker detected.
- No critical drift blocker detected.
- Replace user-specific paths with placeholders in screenshots, docs, and JSON intended for public release.
- Prefer publishing generated rules and summaries over raw context maps.
