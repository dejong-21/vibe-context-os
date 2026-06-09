import type { AnalysisResult, CodingSession } from "./types.js";
import { firstSentences, shortHash } from "./utils.js";

export type TraceStatus = "empty" | "healthy" | "review" | "risk";
export type TraceSeverity = "info" | "warn" | "risk";
export type TracePressure = "low" | "medium" | "high";

export interface TraceSessionSummary {
  id: string;
  title: string;
  provider: CodingSession["provider"];
  updatedAt: string;
  messageCount: number;
  userTurns: number;
  assistantTurns: number;
  tags: string[];
  pressure: TracePressure;
  signals: string[];
}

export interface TraceFinding {
  id: string;
  severity: TraceSeverity;
  title: string;
  detail: string;
  action: string;
  evidence: string[];
}

export interface TraceReport {
  generatedAt: string;
  status: TraceStatus;
  totals: {
    sessions: number;
    messages: number;
    userTurns: number;
    assistantTurns: number;
    highPressureSessions: number;
    continuationSessions: number;
  };
  sessions: TraceSessionSummary[];
  findings: TraceFinding[];
  recommendations: string[];
}

const privatePathPatterns = [
  /\b[A-Z]:\\Users\\[^\\\s"')<>{}]+/gi,
  /\b[A-Z]:\/Users\/[^/\s"')<>{}]+/gi,
  /\/Users\/[^/\s"')<>{}]+/g,
  /\/home\/[^/\s"')<>{}]+/g
];

function sanitize(value: string): string {
  let text = value;
  for (const pattern of privatePathPatterns) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, "<private-path>");
  }
  return text;
}

function pressure(session: CodingSession): TracePressure {
  if (session.messageCount >= 80 || session.userTurns >= 30) return "high";
  if (session.messageCount >= 30 || session.userTurns >= 12) return "medium";
  return "low";
}

function isContinuation(session: CodingSession): boolean {
  return /继续|接着|heartbeat|continue|resume|keep going|carry on/i.test(`${session.title}\n${session.summary}`);
}

function hasVerificationSignal(session: CodingSession): boolean {
  return /\b(test|lint|build|smoke|verify|verification|pytest|vitest|jest|npm run|检查|验证|测试|构建)\b/i.test(
    `${session.title}\n${session.summary}\n${session.tags.join(" ")}`
  );
}

function hasPrivatePathSignal(session: CodingSession): boolean {
  return privatePathPatterns.some((pattern) => {
    pattern.lastIndex = 0;
    const matched = pattern.test(`${session.title}\n${session.summary}`);
    pattern.lastIndex = 0;
    return matched;
  });
}

function sessionSignals(session: CodingSession): string[] {
  const signals: string[] = [];
  if (isContinuation(session)) signals.push("continuation");
  if (hasVerificationSignal(session)) signals.push("verification");
  if (hasPrivatePathSignal(session)) signals.push("private-path");
  if (session.tags.includes("debugging")) signals.push("debugging");
  if (session.tags.includes("automation")) signals.push("automation");
  if (session.tags.includes("coding-agent")) signals.push("agent-tooling");
  return signals;
}

function finding(severity: TraceSeverity, title: string, detail: string, action: string, evidence: string[]): TraceFinding {
  return {
    id: shortHash(`${severity}:${title}:${detail}:${evidence.join("|")}`),
    severity,
    title,
    detail,
    action,
    evidence: evidence.map(sanitize).slice(0, 8)
  };
}

function topRepeatedTags(sessions: CodingSession[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    for (const tag of session.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

export function buildTraceReport(analysis: AnalysisResult): TraceReport {
  const summaries = analysis.sessions.map((session) => ({
    id: session.id,
    title: sanitize(firstSentences(session.title, 100)),
    provider: session.provider,
    updatedAt: session.updatedAt,
    messageCount: session.messageCount,
    userTurns: session.userTurns,
    assistantTurns: session.assistantTurns,
    tags: session.tags,
    pressure: pressure(session),
    signals: sessionSignals(session)
  }));

  const findings: TraceFinding[] = [];
  const highPressure = summaries.filter((session) => session.pressure === "high");
  const mediumOrHigh = summaries.filter((session) => session.pressure !== "low");
  const continuations = summaries.filter((session) => session.signals.includes("continuation"));
  const privatePathSessions = summaries.filter((session) => session.signals.includes("private-path"));
  const unverifiedLongSessions = summaries.filter(
    (session) => session.pressure !== "low" && !session.signals.includes("verification")
  );

  if (analysis.sessions.length === 0) {
    findings.push(
      finding(
        "info",
        "No sessions imported",
        "Trace diagnostics need opt-in session summaries. Source, drift, privacy, and export checks still work without sessions.",
        "Enable reviewed session scanning only for private local analysis, or keep it disabled for public demos.",
        ["scan.includeCodexSessions=false"]
      )
    );
  }

  if (highPressure.length > 0) {
    findings.push(
      finding(
        "warn",
        "High-pressure sessions",
        `${highPressure.length} sessions are large enough to risk context loss, repeated reads, or hidden assumptions.`,
        "Split future work into smaller task packs and preserve decisions in repo rules or review checklists.",
        highPressure.map((session) => session.title)
      )
    );
  } else if (mediumOrHigh.length > 0) {
    findings.push(
      finding(
        "info",
        "Medium context pressure",
        `${mediumOrHigh.length} sessions are moderately long. They are good candidates for reusable task packs.`,
        "Extract recurring commands, decisions, and verification steps into generated rules.",
        mediumOrHigh.map((session) => session.title)
      )
    );
  }

  if (continuations.length >= 3) {
    findings.push(
      finding(
        "warn",
        "Repeated continuation workflow",
        `${continuations.length} sessions look like resumed or long-running work. This often means important state is trapped in chat history.`,
        "Use `vibe-context pack` and checked-in rules before resuming multi-hour work.",
        continuations.map((session) => session.title)
      )
    );
  }

  if (unverifiedLongSessions.length > 0) {
    findings.push(
      finding(
        "warn",
        "Verification gap",
        `${unverifiedLongSessions.length} longer sessions do not expose obvious test, build, lint, or smoke signals in their summaries.`,
        "Add explicit verification commands to task packs and generated agent rules.",
        unverifiedLongSessions.map((session) => session.title)
      )
    );
  }

  if (privatePathSessions.length > 0) {
    findings.push(
      finding(
        "risk",
        "Private paths in session summaries",
        `${privatePathSessions.length} session summaries appear to mention user-specific local paths.`,
        "Keep trace reports private or regenerate after path masking. Do not publish raw screenshots.",
        privatePathSessions.map((session) => session.title)
      )
    );
  }

  const repeatedTags = topRepeatedTags(analysis.sessions).filter(([, count]) => count >= 3).slice(0, 5);
  if (repeatedTags.length > 0) {
    findings.push(
      finding(
        "info",
        "Repeated workflow tags",
        `Recurring work clusters detected: ${repeatedTags.map(([tag, count]) => `${tag} (${count})`).join(", ")}.`,
        "Turn the top clusters into reusable commands, skills, or recipe docs.",
        repeatedTags.map(([tag]) => tag)
      )
    );
  }

  const totals = {
    sessions: analysis.sessions.length,
    messages: analysis.sessions.reduce((sum, session) => sum + session.messageCount, 0),
    userTurns: analysis.sessions.reduce((sum, session) => sum + session.userTurns, 0),
    assistantTurns: analysis.sessions.reduce((sum, session) => sum + session.assistantTurns, 0),
    highPressureSessions: highPressure.length,
    continuationSessions: continuations.length
  };
  const status: TraceStatus =
    totals.sessions === 0
      ? "empty"
      : findings.some((item) => item.severity === "risk")
        ? "risk"
        : findings.some((item) => item.severity === "warn")
          ? "review"
          : "healthy";

  return {
    generatedAt: analysis.generatedAt,
    status,
    totals,
    sessions: summaries,
    findings,
    recommendations: [
      "Use task packs for multi-session work instead of relying on chat memory.",
      "Promote repeated workflows into agent rules, skills, or checklist docs.",
      "Keep trace diagnostics local when they are derived from private sessions.",
      "Make verification commands explicit in long-running agent tasks."
    ]
  };
}

export function formatTraceReport(report: TraceReport): string {
  const sessions = report.sessions.length
    ? report.sessions
        .slice(0, 20)
        .map(
          (session) =>
            `- ${session.title}: ${session.messageCount} messages, ${session.userTurns} user turns, pressure ${session.pressure}, signals ${session.signals.join(", ") || "none"}`
        )
        .join("\n")
    : "- No sessions imported.";
  const findings = report.findings.length
    ? report.findings
        .map(
          (item) => `## [${item.severity}] ${item.title}

${item.detail}

Action: ${item.action}

Evidence:
${item.evidence.map((entry) => `- ${entry}`).join("\n")}
`
        )
        .join("\n")
    : "No trace findings detected.";

  return `# Trace Inspector Report

Status: ${report.status}
Generated at: ${report.generatedAt}

## Totals

- Sessions: ${report.totals.sessions}
- Messages: ${report.totals.messages}
- User turns: ${report.totals.userTurns}
- Assistant turns: ${report.totals.assistantTurns}
- High-pressure sessions: ${report.totals.highPressureSessions}
- Continuation sessions: ${report.totals.continuationSessions}

## Session Summaries

${sessions}

## Findings

${findings}

## Recommendations

${report.recommendations.map((item) => `- ${item}`).join("\n")}
`;
}
