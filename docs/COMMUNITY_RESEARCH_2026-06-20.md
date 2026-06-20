# Community Research: 2026-06-20

This snapshot summarizes the AI coding agent ecosystem signals that shaped the next Vibe Context OS iteration.

## What Is Hot

### 1. Coding Agents Are Crowded

Large, well-funded terminal coding agents already dominate attention. GitHub search on 2026-06-20 surfaced projects such as:

- [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code): terminal coding agent, 25k+ stars.
- [opencode-ai/opencode](https://github.com/opencode-ai/opencode): terminal coding agent, 13k+ stars.
- [plandex-ai/plandex](https://github.com/plandex-ai/plandex): large-project coding agent, 15k+ stars.
- [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi): terminal agent harness, 13k+ stars.

Implication: Vibe Context OS should not become another coding agent. The stronger position is the infrastructure layer around existing agents.

### 2. Rules, Skills, and Persistent Context Are Growing Fast

The strongest community signal is reusable context for agents:

- [agentsmd/agents.md](https://github.com/agentsmd/agents.md): open `AGENTS.md` format, 22k+ stars.
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills): production engineering skills, 63k+ stars.
- [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files): persistent file planning across Claude Code, Codex, Cursor, OpenCode, and others, 23k+ stars.
- [mksglu/context-mode](https://github.com/mksglu/context-mode): context window optimization for coding agents, 17k+ stars.
- [@intellectronica/ruler](https://www.npmjs.com/package/@intellectronica/ruler): npm package that applies the same rules to many coding agents.

Implication: The project should emphasize diagnosis, normalization, and cross-agent handoff rather than dashboard-first management.

### 3. Claude Code Skills Became a Distribution Format

Search results show many high-star skill-first projects:

- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman): Claude Code skill, 75k+ stars.
- [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills): large skill and agent collection, 18k+ stars.
- [trailofbits/skills](https://github.com/trailofbits/skills): security research skills, 5k+ stars.
- [virgiliojr94/book-to-skill](https://github.com/virgiliojr94/book-to-skill): converts books to skills, 6k+ stars.

Implication: Keep the Codex/Claude skill as a first-class distribution surface.

### 4. MCP Security Is No Longer Niche

MCP safety tooling has become its own subcategory:

- [slowmist/MCP-Security-Checklist](https://github.com/slowmist/MCP-Security-Checklist): checklist, 800+ stars.
- [Puliczek/awesome-mcp-security](https://github.com/Puliczek/awesome-mcp-security): curated MCP security resources, 700+ stars.
- [luckyPipewrench/pipelock](https://github.com/luckyPipewrench/pipelock): agent firewall for MCP/security traffic, 700+ stars.
- [trailofbits/mcp-context-protector](https://github.com/trailofbits/mcp-context-protector): MCP security wrapper, 200+ stars.
- npm packages such as `mcp-vulnerability-scanner`, `veilguard`, `mcp-guardian`, and `@asterworks/aster-guard`.

Implication: Vibe Context OS should keep MCP policy and audit visible in the README, Action, and release gates.

### 5. Community Tools Need Badges, CI, and One-Minute Adoption

Popular developer tools make the first action obvious: install, run one command, paste a badge or config, add a workflow. Vibe Context OS had strong internals, but needed a more public-facing adoption loop.

## Product Decision

Position Vibe Context OS as:

> Agent Context Doctor for AI coding workflows.

Do:

- Diagnose agent readiness across rules, privacy, MCP policy, and context drift.
- Generate task packs for existing agents.
- Provide a README-ready readiness badge.
- Provide a reusable GitHub Action.
- Keep Codex/Claude skills and MCP server as agent-native surfaces.

Do not:

- Build a new coding agent runtime.
- Make the Web console the main product.
- Export raw private sessions.
- Auto-apply generated agent files without human review.

## Changes Made From This Research

- Added a `badge` CLI command that emits a README-ready `agent-ready` badge.
- Added this research note to make positioning and tradeoffs explicit.
- Added an adoption playbook for CLI, GitHub Action, skills, MCP, and public release flows.
- Updated README copy around agent-native use and community positioning.
- Updated GitHub repository metadata and topics for discovery.
