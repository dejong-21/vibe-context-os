# Cross-Agent Config Doctor

Status: missing
Score: 52/100
Generated at: `<generated-at>`

## Totals

- Surfaces: 9
- Present: 1
- Missing: 8
- Safety covered: 1
- Verification covered: 1
- Context covered: 1
- Tool policy covered: 1
- Handoff covered: 1

## Surfaces

- AGENTS.md: present, safety yes, verification yes, context yes, tools yes
- CLAUDE.md: missing, safety no, verification no, context no, tools no
- GEMINI.md: missing, safety no, verification no, context no, tools no
- .cursor/rules/vibe-context.mdc: missing, safety no, verification no, context no, tools no
- .clinerules: missing, safety no, verification no, context no, tools no
- .continue/vibe-context-check.md: missing, safety no, verification no, context no, tools no
- .github/copilot-instructions.md: missing, safety no, verification no, context no, tools no
- .claude/skills/vibe-context-os/SKILL.md: missing, safety no, verification no, context no, tools no
- .mcp.json: missing, safety no, verification no, context no, tools no

## Findings

## [warn] Missing agent config surfaces

8 expected agent configuration targets are not present in the workspace.

Action: Review APPLY_PLAN.md and create the missing targets only after checking generated content.

Evidence:
- CLAUDE.md
- GEMINI.md
- .cursor/rules/vibe-context.mdc
- .clinerules
- .continue/vibe-context-check.md
- .github/copilot-instructions.md
- .claude/skills/vibe-context-os/SKILL.md
- .mcp.json


## Suggested Fixes

- [create-target] CLAUDE.md: Create Claude Code config after review
- [create-target] GEMINI.md: Create Gemini CLI config after review
- [create-target] .cursor/rules/vibe-context.mdc: Create Cursor config after review
- [create-target] .clinerules: Create Cline / Roo config after review
- [create-target] .continue/vibe-context-check.md: Create Continue config after review
- [create-target] .github/copilot-instructions.md: Create GitHub Copilot config after review
- [create-target] .claude/skills/vibe-context-os/SKILL.md: Create Claude Code skill config after review
- [create-target] .mcp.json: Create MCP client config after review

## Recommendations

- Keep one safety boundary repeated across every active coding-agent surface.
- Make lint, test, build, smoke, and release checks visible in agent rules.
- Use APPLY_PLAN.md as a manual review map before copying generated files into real configs.
- Regenerate exports after changing rules, package scripts, MCP configs, or public release docs.
