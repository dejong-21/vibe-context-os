## Summary

- 

## Verification

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
npm run vibe -- config-doctor
npm run vibe -- config-fix-pack
npm run vibe -- trace
npm run pack:check
npm run package:smoke
```

## Context and Privacy

- [ ] Generated artifacts stay under `exports/` unless intentionally reviewed and applied.
- [ ] No raw sessions, secrets, `.env` values, or private absolute paths were added.
- [ ] `npm run vibe -- publish-check`, `artifact-audit`, `mcp-audit`, `config-doctor`, `config-fix-pack`, and `trace` were reviewed when the change affects exports, scans, agent config, MCP config, sessions, or public docs.
