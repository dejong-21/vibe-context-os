export type SourceKind =
  | "agent-rule"
  | "cursor-rule"
  | "claude-rule"
  | "github-instruction"
  | "manifest"
  | "doc"
  | "config"
  | "code"
  | "session"
  | "other";

export type RiskSeverity = "low" | "medium" | "high";

export interface RedactionFinding {
  id: string;
  sourcePath: string;
  severity: RiskSeverity;
  label: string;
  fingerprint: string;
  preview: string;
}

export interface SourceFile {
  id: string;
  kind: SourceKind;
  absolutePath: string;
  relativePath: string;
  size: number;
  mtimeMs: number;
  sha256: string;
  snippet: string;
  redactionCount: number;
}

export interface CodingSession {
  id: string;
  title: string;
  provider: "codex" | "workspace" | "unknown";
  sourcePath: string;
  updatedAt: string;
  messageCount: number;
  userTurns: number;
  assistantTurns: number;
  sample: Array<{ role: string; text: string; timestamp?: string }>;
  tags: string[];
  summary: string;
}

export interface CategoryCount {
  name: string;
  count: number;
  weight: number;
}

export interface TimelineBucket {
  month: string;
  sessions: number;
}

export interface ContextItem {
  id: string;
  type: "rule" | "decision" | "workflow" | "risk" | "opportunity" | "command";
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  evidence: string[];
}

export interface WorkflowStage {
  name: string;
  status: "strong" | "partial" | "missing";
  description: string;
  evidence: string[];
}

export interface DriftFinding {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  recommendation: string;
  evidence: string[];
}

export interface AnalysisResult {
  generatedAt: string;
  workspaceRoot: string;
  codexHome: string;
  lookbackDays: number;
  summary: {
    sources: number;
    sessions: number;
    risks: number;
    ruleFiles: number;
    docs: number;
    manifests: number;
    codeFiles: number;
  };
  budget?: {
    totalEstimatedTokens: number;
    warnings: string[];
  };
  publish?: {
    status: "ready" | "review" | "blocked";
    blocked: number;
    warnings: number;
  };
  categories: CategoryCount[];
  timeline: TimelineBucket[];
  sources: SourceFile[];
  sessions: CodingSession[];
  contextItems: ContextItem[];
  workflowStages: WorkflowStage[];
  driftFindings: DriftFinding[];
  recommendations: string[];
  risks: RedactionFinding[];
}

export interface ExportResult {
  exportRoot: string;
  files: Array<{
    name: string;
    path: string;
    bytes: number;
    description: string;
  }>;
}

export interface StatusReport {
  generatedAt: string;
  workspaceRoot: string;
  summary: AnalysisResult["summary"];
  overall: {
    status: "ready" | "review" | "blocked";
    blockers: number;
    warnings: number;
    message: string;
  };
  drift: {
    status: "clean" | "review" | "critical";
    findings: number;
    critical: number;
  };
  publish: {
    status: "ready" | "review" | "blocked";
    blocked: number;
    warnings: number;
  };
  privacy: {
    status: "pass" | "warn" | "block";
    checkedFiles: number;
    findings: number;
  };
  budget: {
    totalEstimatedTokens: number;
    warnings: string[];
  };
  recommendations: string[];
}

export interface ApplyTarget {
  artifact: string;
  target: string;
  targetExists: boolean;
  advice: string;
}

export interface PrivacyAuditFinding {
  id: string;
  severity: "warn" | "block";
  title: string;
  file: string;
  detail: string;
  action: string;
}

export interface PrivacyAuditReport {
  status: "pass" | "warn" | "block";
  checkedFiles: number;
  findings: PrivacyAuditFinding[];
}

export interface ArtifactAuditFinding {
  id: string;
  severity: "warn" | "block";
  title: string;
  file: string;
  detail: string;
  action: string;
}

export interface ArtifactAuditReport {
  status: "pass" | "warn" | "block";
  exportRoot: string;
  checkedFiles: number;
  findings: ArtifactAuditFinding[];
}

export interface PublishCheck {
  id: string;
  severity: "pass" | "warn" | "block";
  title: string;
  detail: string;
  action: string;
}

export interface PublishReport {
  status: "ready" | "review" | "blocked";
  checks: PublishCheck[];
}

export interface McpServerSummary {
  name: string;
  file: string;
  command?: string;
  args: string[];
  envKeys: string[];
}

export interface McpRiskFinding {
  id: string;
  severity: "info" | "warn" | "block";
  title: string;
  file: string;
  server?: string;
  detail: string;
  action: string;
}

export interface McpAuditReport {
  status: "pass" | "review" | "block";
  checkedFiles: number;
  servers: McpServerSummary[];
  findings: McpRiskFinding[];
}

export interface TraceSessionSummary {
  id: string;
  title: string;
  provider: "codex" | "workspace" | "unknown";
  updatedAt: string;
  messageCount: number;
  userTurns: number;
  assistantTurns: number;
  tags: string[];
  pressure: "low" | "medium" | "high";
  signals: string[];
}

export interface TraceFinding {
  id: string;
  severity: "info" | "warn" | "risk";
  title: string;
  detail: string;
  action: string;
  evidence: string[];
}

export interface TraceReport {
  generatedAt: string;
  status: "empty" | "healthy" | "review" | "risk";
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

export interface ConfigSurface {
  id: string;
  label: string;
  target: string;
  artifact: string;
  status: "present" | "missing";
  signals: {
    safety: boolean;
    verification: boolean;
    context: boolean;
    tools: boolean;
    handoff: boolean;
  };
  evidence: string[];
}

export interface ConfigDoctorFinding {
  id: string;
  severity: "info" | "warn" | "block";
  title: string;
  detail: string;
  action: string;
  evidence: string[];
}

export interface ConfigDoctorFix {
  id: string;
  kind: "create-target" | "append-safety" | "append-verification" | "append-context" | "append-tool-policy" | "append-handoff";
  target: string;
  artifact: string;
  title: string;
  detail: string;
  action: string;
  snippet?: string;
}

export interface ConfigDoctorReport {
  generatedAt: string;
  status: "ready" | "review" | "missing";
  score: number;
  totals: {
    surfaces: number;
    present: number;
    missing: number;
    safetyCovered: number;
    verificationCovered: number;
    contextCovered: number;
    toolsCovered: number;
    handoffCovered: number;
  };
  surfaces: ConfigSurface[];
  findings: ConfigDoctorFinding[];
  fixes: ConfigDoctorFix[];
  recommendations: string[];
}

export interface ConfigFixPackResult {
  path: string;
  fixes: number;
  bytes: number;
}
