import type {
  AnalysisResult,
  ApplyTarget,
  ArtifactAuditReport,
  ConfigDoctorReport,
  ConfigFixPackResult,
  ExportResult,
  McpAuditReport,
  PublishReport,
  PrivacyAuditReport,
  StatusReport,
  TraceReport
} from "./types";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function analyzeWorkspace(): Promise<AnalysisResult> {
  return jsonRequest<AnalysisResult>("/api/analyze");
}

export function getStatus(): Promise<StatusReport> {
  return jsonRequest<StatusReport>("/api/status");
}

export function exportArtifacts(): Promise<ExportResult> {
  return jsonRequest<ExportResult>("/api/export", { method: "POST" });
}

export function exportPublicBundle(): Promise<ExportResult> {
  return jsonRequest<ExportResult>("/api/public-bundle", { method: "POST" });
}

export function getApplyPlan(): Promise<{ targets: ApplyTarget[] }> {
  return jsonRequest<{ targets: ApplyTarget[] }>("/api/apply-plan");
}

export function getPrivacyAudit(): Promise<PrivacyAuditReport> {
  return jsonRequest<PrivacyAuditReport>("/api/privacy-audit");
}

export function getPublishCheck(): Promise<PublishReport> {
  return jsonRequest<PublishReport>("/api/publish-check");
}

export function getArtifactAudit(): Promise<ArtifactAuditReport> {
  return jsonRequest<ArtifactAuditReport>("/api/artifact-audit");
}

export function getMcpAudit(): Promise<McpAuditReport> {
  return jsonRequest<McpAuditReport>("/api/mcp-audit");
}

export function getTrace(): Promise<TraceReport> {
  return jsonRequest<TraceReport>("/api/trace");
}

export function getConfigDoctor(): Promise<ConfigDoctorReport> {
  return jsonRequest<ConfigDoctorReport>("/api/config-doctor");
}

export function writeConfigFixPack(): Promise<ConfigFixPackResult> {
  return jsonRequest<ConfigFixPackResult>("/api/config-fix-pack", { method: "POST" });
}

export function generateTaskPack(task: string): Promise<{ content: string; path: string; bytes: number }> {
  return jsonRequest<{ content: string; path: string; bytes: number }>("/api/pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task })
  });
}
