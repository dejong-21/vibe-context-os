# Example Outputs

These files are public-safe examples generated from the bundled `demo-workspace/`. They show what Vibe Context OS produces without requiring a reader to install the project first.

The examples intentionally use placeholders such as `<workspace-root>` and `<generated-at>`. They do not contain private paths, raw session logs, local usernames, or secrets.

## Files

- [TASK_PACK.demo.md](TASK_PACK.demo.md): compact handoff for an AI coding agent.
- [PUBLIC_CONTEXT_SUMMARY.demo.json](PUBLIC_CONTEXT_SUMMARY.demo.json): machine-readable public context summary.
- [CONFIG_DOCTOR_REPORT.demo.md](CONFIG_DOCTOR_REPORT.demo.md): cross-agent config coverage report.
- [MCP_TOOL_POLICY.demo.md](MCP_TOOL_POLICY.demo.md): generated tool safety policy for MCP and agent tools.
- [PUBLIC_RELEASE_CHECKLIST.demo.md](PUBLIC_RELEASE_CHECKLIST.demo.md): publish checklist produced from scan gates.
- [GITHUB_PROFILE_SNIPPET.demo.md](GITHUB_PROFILE_SNIPPET.demo.md): profile-ready project copy.

## Regenerate Locally

```bash
npm run examples:refresh
npm run vibe -- artifact-audit
```

Review generated files before copying them into docs. Keep examples short, public-safe, and representative.
