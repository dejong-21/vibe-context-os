import path from "node:path";
import type {
  AnalysisResult,
  CategoryCount,
  CodingSession,
  ContextItem,
  RedactionFinding,
  SourceFile,
  WorkflowStage
} from "./types.js";
import { config } from "./config.js";
import { scanWorkspace } from "./scanner.js";
import { scanSessions } from "./codexSessions.js";
import { firstSentences, scoreText, shortHash } from "./utils.js";
import { isProbablyPromptInjection } from "./security.js";
import { detectDrift } from "./drift.js";
import { buildBudgetReport } from "./budget.js";
import { buildPublishReport } from "./publish.js";
import { loadWorkspaceConfig } from "./workspaceConfig.js";

const categoryKeywords: Record<string, string[]> = {
  "Context Engineering": ["agents.md", "claude.md", "cursor", "rule", "context", "prompt", "skill", "mcp"],
  "AI Coding Tools": ["codex", "claude code", "opencode", "aider", "coding agent", "vibe", "workflow"],
  "Research Engineering": ["论文", "科研", "复现", "experiment", "bonai", "loft", "building", "remote sensing"],
  "Infra And Remote Runs": ["autodl", "4090", "ssh", "server", "服务器", "docker", "deploy", "部署"],
  "Debugging And QA": ["bug", "fix", "debug", "test", "报错", "排查", "review", "risk"],
  "Docs And Knowledge": ["readme", "docs", "pdf", "docx", "ppt", "文档", "slides", "literature"],
  Automation: ["playwright", "browser", "chrome", "automation", "自动化", "hook", "script"],
  "Portfolio And Product": ["github", "homepage", "简历", "个人主页", "product", "portfolio"]
};

function buildCategoryCounts(sources: SourceFile[], sessions: CodingSession[]): CategoryCount[] {
  return Object.entries(categoryKeywords)
    .map(([name, keywords]) => {
      const sourceScore = sources.reduce((sum, source) => sum + scoreText(`${source.relativePath}\n${source.snippet}`, keywords), 0);
      const sessionScore = sessions.reduce(
        (sum, session) => sum + scoreText(`${session.title}\n${session.summary}\n${session.tags.join(" ")}`, keywords),
        0
      );
      const count = sourceScore + sessionScore;
      return { name, count, weight: Math.max(8, Math.min(100, count * 7)) };
    })
    .sort((left, right) => right.count - left.count);
}

function extractRules(sources: SourceFile[]): ContextItem[] {
  const items: ContextItem[] = [];
  const ruleSources = sources.filter((source) =>
    ["agent-rule", "cursor-rule", "claude-rule", "github-instruction"].includes(source.kind)
  );
  const ruleLinePattern = /^\s*(?:[-*]\s+|\d+\.\s+)?(must|never|always|prefer|avoid|do not|use|默认|禁止|必须|优先|不要)\b(.{12,220})/i;

  for (const source of ruleSources) {
    const lines = source.snippet.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(ruleLinePattern);
      if (!match) continue;
      const detail = line.replace(/^\s*[-*]?\s*/, "").trim();
      items.push({
        id: shortHash(`${source.relativePath}:${detail}`),
        type: "rule",
        title: firstSentences(detail, 80),
        detail,
        priority: /never|must|always|禁止|必须|do not/i.test(detail) ? "high" : "medium",
        evidence: [source.relativePath]
      });
      if (items.length >= 18) break;
    }
  }
  return items;
}

function buildContextItems(sources: SourceFile[], sessions: CodingSession[], risks: RedactionFinding[]): ContextItem[] {
  const items: ContextItem[] = [...extractRules(sources)];
  const byTag = new Map<string, CodingSession[]>();
  for (const session of sessions) {
    for (const tag of session.tags) {
      const list = byTag.get(tag) || [];
      list.push(session);
      byTag.set(tag, list);
    }
  }

  for (const [tag, taggedSessions] of byTag.entries()) {
    if (taggedSessions.length < 3) continue;
    items.push({
      id: shortHash(`workflow:${tag}:${taggedSessions.length}`),
      type: "workflow",
      title: `${tag.replace(/-/g, " ")} is a repeated workflow`,
      detail: `${taggedSessions.length} recent sessions point to this as a recurring work pattern. Turn it into a reusable rule, checklist, or command.`,
      priority: taggedSessions.length > 12 ? "high" : "medium",
      evidence: taggedSessions.slice(0, 5).map((session) => session.title)
    });
  }

  const promptInjectionSources = sources.filter((source) => isProbablyPromptInjection(source.snippet));
  for (const source of promptInjectionSources.slice(0, 6)) {
    items.push({
      id: shortHash(`prompt-injection:${source.relativePath}`),
      type: "risk",
      title: "Prompt injection-like text found",
      detail: "Treat this file as untrusted context. Do not paste it into an agent without quoting and scoping.",
      priority: "high",
      evidence: [source.relativePath]
    });
  }

  if (risks.length > 0) {
    items.push({
      id: "secret-risk-summary",
      type: "risk",
      title: "Secrets need review before model calls",
      detail: `${risks.length} secret-like values were redacted. Keep the default local-only mode until these are reviewed.`,
      priority: "high",
      evidence: risks.slice(0, 5).map((risk) => `${risk.label} in ${risk.sourcePath}`)
    });
  }

  items.push({
    id: "portfolio-opportunity",
    type: "opportunity",
    title: "Export AI coding work into a portfolio signal",
    detail:
      "The strongest public artifact is not another chat bot. It is a system that turns sessions, rules, specs, reviews, and guardrails into reusable engineering assets.",
    priority: "high",
    evidence: ["session trends", "rule sources", "export bundle"]
  });

  return items.slice(0, 40);
}

function stageStatus(hasEvidence: boolean, count: number): WorkflowStage["status"] {
  if (hasEvidence && count >= 4) return "strong";
  if (hasEvidence || count > 0) return "partial";
  return "missing";
}

function buildWorkflowStages(sources: SourceFile[], sessions: CodingSession[], risks: RedactionFinding[]): WorkflowStage[] {
  const text = `${sources.map((source) => `${source.relativePath}\n${source.snippet}`).join("\n")}\n${sessions
    .map((session) => `${session.title}\n${session.summary}\n${session.tags.join(" ")}`)
    .join("\n")}`;
  const stages = [
    {
      name: "Capture",
      keywords: ["session", "codex", "claude", "cursor", "log", "history"],
      description: "Collect AI coding sessions and source context into a local inventory."
    },
    {
      name: "Structure",
      keywords: ["agents.md", "rule", "spec", "readme", "context"],
      description: "Convert scattered instructions into project rules and spec-ready context."
    },
    {
      name: "Execute",
      keywords: ["script", "command", "workflow", "deploy", "train", "test"],
      description: "Preserve commands, workflows, and implementation paths that agents can reuse."
    },
    {
      name: "Verify",
      keywords: ["test", "review", "eval", "risk", "checklist", "sanity"],
      description: "Keep review, test, and risk checks close to generated AI work."
    },
    {
      name: "Publish",
      keywords: ["github", "readme", "portfolio", "homepage", "export"],
      description: "Export clean artifacts for GitHub, documentation, and personal positioning."
    }
  ];
  return stages.map((stage) => {
    const count = scoreText(text, stage.keywords);
    const evidence = [
      ...sources
        .filter((source) => scoreText(`${source.relativePath}\n${source.snippet}`, stage.keywords) > 0)
        .slice(0, 3)
        .map((source) => source.relativePath),
      ...sessions
        .filter((session) => scoreText(`${session.title}\n${session.summary}`, stage.keywords) > 0)
        .slice(0, 3)
        .map((session) => session.title)
    ];
    const hasEvidence = evidence.length > 0 || (stage.name === "Verify" && risks.length > 0);
    return {
      name: stage.name,
      status: stageStatus(hasEvidence, count),
      description: stage.description,
      evidence: evidence.slice(0, 5)
    };
  });
}

function buildRecommendations(
  categories: CategoryCount[],
  risks: RedactionFinding[],
  sources: SourceFile[],
  sessions: CodingSession[],
  criticalDriftCount: number
): string[] {
  const recommendations: string[] = [];
  const hasRules = sources.some((source) => ["agent-rule", "cursor-rule", "claude-rule"].includes(source.kind));
  const topCategory = categories[0]?.name || "Context Engineering";

  recommendations.push(`Lead with ${topCategory}. It is the strongest signal in the current context map.`);
  if (!hasRules) recommendations.push("Create a generated rules package first: AGENTS.md, Cursor rules, CLAUDE.md, and review checklist.");
  if (risks.length > 0) recommendations.push("Review redacted secrets before sending any workspace context to a cloud model.");
  if (criticalDriftCount > 0) recommendations.push(`Fix ${criticalDriftCount} critical context drift findings before publishing generated artifacts.`);
  if (sessions.length > 20) recommendations.push("Turn repeated session patterns into reusable slash commands and issue templates.");
  if (!sources.some((source) => source.relativePath.toLowerCase().includes("readme"))) {
    recommendations.push("Add a product README with screenshots, quick start, architecture, and privacy model.");
  }
  recommendations.push("Keep exports separate from source files; apply generated rules manually after review.");
  return recommendations;
}

export async function analyze(): Promise<AnalysisResult> {
  const workspaceConfig = await loadWorkspaceConfig();
  const sessionLookbackDays = workspaceConfig.scan?.sessionLookbackDays || config.lookbackDays;
  const [workspaceScan, sessionScan] = await Promise.all([
    scanWorkspace(),
    scanSessions({
      includeCodexSessions: workspaceConfig.scan?.includeCodexSessions,
      lookbackDays: sessionLookbackDays
    })
  ]);
  const sources = workspaceScan.sources;
  const sessions = sessionScan.sessions;
  const risks = [...workspaceScan.risks, ...sessionScan.risks];
  const categories = buildCategoryCounts(sources, sessions);
  const timeline = [...sessionScan.timeline.entries()]
    .map(([month, count]) => ({ month, sessions: count }))
    .sort((left, right) => left.month.localeCompare(right.month));
  const contextItems = buildContextItems(sources, sessions, risks);
  const workflowStages = buildWorkflowStages(sources, sessions, risks);
  const driftFindings = detectDrift(sources, risks);
  const criticalDriftCount = driftFindings.filter((finding) => finding.severity === "critical").length;

  const result: AnalysisResult = {
    generatedAt: new Date().toISOString(),
    workspaceRoot: config.workspaceRoot,
    codexHome: config.codexHome,
    lookbackDays: sessionLookbackDays,
    summary: {
      sources: sources.length,
      sessions: sessions.length,
      risks: risks.length,
      ruleFiles: sources.filter((source) => ["agent-rule", "cursor-rule", "claude-rule", "github-instruction"].includes(source.kind)).length,
      docs: sources.filter((source) => source.kind === "doc").length,
      manifests: sources.filter((source) => source.kind === "manifest").length,
      codeFiles: sources.filter((source) => source.kind === "code").length
    },
    categories,
    timeline,
    sources,
    sessions,
    contextItems,
    workflowStages,
    driftFindings,
    recommendations: buildRecommendations(categories, risks, sources, sessions, criticalDriftCount),
    risks
  };

  const budget = buildBudgetReport(result);
  const publish = buildPublishReport(result, budget);
  result.budget = {
    totalEstimatedTokens: budget.totalEstimatedTokens,
    warnings: budget.warnings
  };
  result.publish = {
    status: publish.status,
    blocked: publish.checks.filter((item) => item.severity === "block").length,
    warnings: publish.checks.filter((item) => item.severity === "warn").length
  };

  return result;
}

export function displayRootName(root: string): string {
  return path.basename(root) || root;
}
