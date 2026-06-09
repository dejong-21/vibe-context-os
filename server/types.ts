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

export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool" | "other";
  text: string;
  timestamp?: string;
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
  sample: SessionMessage[];
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

export interface GeneratedArtifact {
  name: string;
  relativePath: string;
  description: string;
  content: string;
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
