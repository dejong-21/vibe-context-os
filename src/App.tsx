import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Archive,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Fingerprint,
  GitBranch,
  Layers3,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TerminalSquare
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  analyzeWorkspace,
  exportArtifacts,
  exportPublicBundle,
  generateTaskPack,
  getApplyPlan,
  getArtifactAudit,
  getConfigDoctor,
  getMcpAudit,
  getPrivacyAudit,
  getPublishCheck,
  getStatus,
  getTrace,
  writeConfigFixPack
} from "./api";
import type {
  AnalysisResult,
  ApplyTarget,
  ArtifactAuditReport,
  ConfigDoctorReport,
  ConfigFixPackResult,
  ContextItem,
  ExportResult,
  McpAuditReport,
  PublishReport,
  PrivacyAuditReport,
  RiskSeverity,
  StatusReport,
  TraceReport,
  WorkflowStage
} from "./types";

type View = "overview" | "pack" | "config" | "trace" | "drift" | "sessions" | "sources" | "risks" | "exports";
type Locale = "en" | "zh";

const navItems: Array<{ id: View; icon: typeof Activity }> = [
  { id: "overview", icon: Activity },
  { id: "pack", icon: TerminalSquare },
  { id: "config", icon: ClipboardCheck },
  { id: "trace", icon: GitBranch },
  { id: "drift", icon: AlertTriangle },
  { id: "sessions", icon: BrainCircuit },
  { id: "sources", icon: FileText },
  { id: "risks", icon: Lock },
  { id: "exports", icon: Archive }
];

const copy = {
  en: {
    nav: {
      overview: "Overview",
      pack: "Task Pack",
      config: "Config",
      trace: "Trace",
      drift: "Drift",
      sessions: "Sessions",
      sources: "Sources",
      risks: "Privacy",
      exports: "Exports"
    },
    brandSubtitle: "Local context compiler",
    topbar: "Local-first agent context",
    workspace: "Workspace",
    pendingScan: "Pending scan",
    rescan: "Rescan",
    scanning: "Scanning",
    loading: "Scanning local context",
    language: "Language",
    common: {
      overall: "Overall",
      status: "Status",
      score: "Score",
      findings: "findings",
      sessions: "sessions",
      servers: "servers",
      files: "files",
      blockers: "blockers",
      warnings: "warnings",
      low: "Low",
      medium: "Medium",
      high: "High",
      userTurns: "user turns",
      assistantTurns: "assistant turns",
      noTags: "no tags",
      pending: "Pending",
      primaryNav: "Primary navigation",
      workspaceMetrics: "Workspace metrics",
      statusLabels: {
        ready: "Ready",
        review: "Review",
        blocked: "Blocked",
        pass: "Pass",
        fail: "Fail",
        warn: "Warn",
        clean: "Clean",
        risky: "Risky",
        healthy: "Healthy",
        empty: "Empty",
        present: "Present",
        missing: "Missing",
        critical: "Critical",
        warning: "Warning",
        info: "Info",
        block: "Block",
        low: "Low",
        medium: "Medium",
        high: "High"
      }
    },
    overview: {
      sources: "Sources",
      sessions: "Sessions",
      rules: "Rules",
      risks: "Risks",
      tokens: "Tokens",
      publish: "Publish",
      privacy: "Privacy",
      contextSignal: "Context Signal",
      contextSignalDesc: "Detected work patterns across rules, docs, code, and sessions.",
      workflowStages: "Workflow Stages",
      workflowStagesDesc: "Capture, structure, execute, verify, publish.",
      recommendations: "Recommendations",
      recommendationsDesc: "Next product moves from the current scan.",
      contextItems: "Context Items",
      contextItemsDesc: "Rules, workflows, risks, and opportunities extracted locally.",
      recentSessions: "Recent Sessions",
      recentSessionsDesc: "Latest imported local AI coding work."
    },
    config: {
      title: "Config Doctor",
      desc: "Cross-agent rule coverage for AI coding tools.",
      coverage: "Coverage",
      coverageDesc: "How consistently rules repeat the important boundaries.",
      agentSurfaces: "Agent Surfaces",
      targets: "targets",
      findings: "Findings",
      fixPack: "Fix Pack",
      suggestions: "suggestions",
      noFixes: "No config fixes are suggested.",
      writeFixPack: "Write Fix Pack",
      writingFixPack: "Writing Fix Pack",
      writtenFixPack: "Written",
      recommendationsDesc: "Keep all coding agents aligned around the same workflow.",
      present: "Present",
      noFindings: "No config coverage findings were detected.",
      safety: "Safety",
      noSafety: "No safety",
      verification: "Verification",
      verify: "Verify",
      noVerify: "No verify",
      context: "Context",
      handoff: "Handoff",
      tools: "Tools",
      cli: "CLI"
    },
    trace: {
      posture: "Trace Posture",
      postureDesc: "Session pressure, continuation loops, and verification signals.",
      pressureMix: "Pressure Mix",
      pressureMixDesc: "Long sessions are where context drift usually appears first.",
      findings: "Trace Findings",
      sessionPressure: "Session Pressure",
      recommendations: "Trace Recommendations",
      recommendationsDesc: "Practical actions for long-running AI coding work.",
      continuations: "Continuations",
      highPressure: "High pressure",
      messages: "Messages",
      noFindings: "No trace findings were detected.",
      noSessions: "No sessions were imported for trace diagnostics."
    },
    pack: {
      title: "Task Context Pack",
      desc: "Generate one compact handoff for Codex, Claude Code, Cursor, Gemini CLI, Aider, or Cline.",
      task: "Task",
      generate: "Generate pack",
      generating: "Generating",
      output: "Output",
      preview: "Pack Preview",
      notGenerated: "Not generated yet",
      empty: "Generate a task pack to preview the agent handoff prompt."
    },
    exports: {
      title: "Export Bundle",
      desc: "Generated files stay isolated until reviewed.",
      generate: "Generate exports",
      writing: "Writing",
      publicBundle: "Public-safe bundle",
      latest: "Latest Export",
      applyPlan: "Apply Plan",
      applyPlanDesc: "Dry-run targets for real agent rule files. Review first; this tool does not overwrite them.",
      portfolio: "Portfolio Signal",
      expected: "expected",
      ready: "ready",
      releaseGates: "Release Gates",
      releaseGatesDesc: "Public sharing checks before GitHub or portfolio use.",
      publishCheck: "Publish check",
      artifactAudit: "Artifact audit",
      reviewDiff: "review diff",
      createAfterReview: "create after review",
      portfolioDesc: "Scanned sessions and sources can become public engineering evidence after review.",
      gateFindings: "Gate findings",
      noGateFindings: "No release-gate blockers or warnings were detected.",
      audited: "audited",
      noSessionExport: "No export has run in this browser session. Existing artifacts are still covered by the audit above."
    },
    sessionsPage: {
      title: "Session Ledger",
      userTurns: "user turns"
    },
    sourcesPage: {
      inventory: "Inventory",
      inventoryDesc: "File kinds found in the approved workspace root.",
      sourceFiles: "Source Files",
      redactions: "redactions"
    },
    driftPage: {
      title: "Context Drift",
      desc: "Rules, tool policies, and generated context that may be stale or incomplete.",
      critical: "Critical",
      warnings: "Warnings",
      info: "Info",
      releaseGate: "Release gate",
      findings: "Findings",
      noFindings: "No context drift findings were detected."
    },
    risksPage: {
      privacyPosture: "Privacy Posture",
      privacyPostureDesc: "All scanning is local. Redactions happen before indexing and export.",
      backendBind: "Backend bind",
      writePolicy: "Write policy",
      writePolicyValue: "Exports folder only",
      modelCalls: "Model calls",
      modelCallsValue: "Disabled by default",
      secretFindings: "Secret findings",
      privacyAudit: "Privacy audit",
      mcpSafety: "MCP safety",
      redactionFindings: "Redaction Findings",
      noSecrets: "No secret-like values were detected in this scan.",
      privacyAuditPending: "Privacy audit has not run yet.",
      privacyAuditClean: "No publish-blocking private paths, secrets, session logs, or environment files were detected.",
      mcpAuditPending: "MCP safety audit has not run yet.",
      mcpAuditClean: "No MCP server configs were detected in this workspace.",
      envKeys: "env keys"
    }
  },
  zh: {
    nav: {
      overview: "总览",
      pack: "任务包",
      config: "配置体检",
      trace: "会话追踪",
      drift: "漂移",
      sessions: "会话",
      sources: "来源",
      risks: "隐私",
      exports: "导出"
    },
    brandSubtitle: "本地上下文编译器",
    topbar: "本地优先的智能体上下文",
    workspace: "工作区",
    pendingScan: "等待扫描",
    rescan: "重新扫描",
    scanning: "扫描中",
    loading: "正在扫描本地上下文",
    language: "语言",
    common: {
      overall: "整体",
      status: "状态",
      score: "评分",
      findings: "条发现",
      sessions: "个会话",
      servers: "个服务",
      files: "个文件",
      blockers: "个阻断项",
      warnings: "个警告",
      low: "低",
      medium: "中",
      high: "高",
      userTurns: "轮用户消息",
      assistantTurns: "轮助手消息",
      noTags: "无标签",
      pending: "待处理",
      primaryNav: "主导航",
      workspaceMetrics: "工作区指标",
      statusLabels: {
        ready: "就绪",
        review: "需审查",
        blocked: "已阻断",
        pass: "通过",
        fail: "失败",
        warn: "警告",
        clean: "干净",
        risky: "有风险",
        healthy: "健康",
        empty: "无数据",
        present: "已存在",
        missing: "缺失",
        critical: "严重",
        warning: "警告",
        info: "信息",
        block: "阻断",
        low: "低",
        medium: "中",
        high: "高"
      }
    },
    overview: {
      sources: "来源",
      sessions: "会话",
      rules: "规则",
      risks: "风险",
      tokens: "Token",
      publish: "发布",
      privacy: "隐私",
      contextSignal: "上下文信号",
      contextSignalDesc: "从规则、文档、代码和会话中识别工作模式。",
      workflowStages: "工作流阶段",
      workflowStagesDesc: "捕获、结构化、执行、验证、发布。",
      recommendations: "建议",
      recommendationsDesc: "基于当前扫描得到的下一步产品动作。",
      contextItems: "上下文条目",
      contextItemsDesc: "本地提取的规则、工作流、风险和机会。",
      recentSessions: "最近会话",
      recentSessionsDesc: "最近导入的本地 AI 编程工作。"
    },
    config: {
      title: "配置体检",
      desc: "检查各类 AI 编程工具的规则覆盖情况。",
      coverage: "覆盖情况",
      coverageDesc: "安全、验证、工具边界等规则是否在各入口保持一致。",
      agentSurfaces: "智能体配置面",
      targets: "个目标",
      findings: "发现",
      fixPack: "修复建议包",
      suggestions: "条建议",
      noFixes: "暂无配置修复建议。",
      writeFixPack: "写入修复建议包",
      writingFixPack: "写入中",
      writtenFixPack: "已写入",
      recommendationsDesc: "让所有编程智能体遵循同一套工作流。",
      present: "已存在",
      noFindings: "未发现配置覆盖问题。",
      safety: "安全",
      noSafety: "无安全规则",
      verification: "验证",
      verify: "有验证",
      noVerify: "无验证",
      context: "上下文",
      handoff: "交接",
      tools: "工具",
      cli: "命令"
    },
    trace: {
      posture: "追踪状态",
      postureDesc: "会话压力、连续续跑和验证信号。",
      pressureMix: "压力分布",
      pressureMixDesc: "长会话通常最容易首先出现上下文漂移。",
      findings: "追踪发现",
      sessionPressure: "会话压力",
      recommendations: "追踪建议",
      recommendationsDesc: "面向长时间 AI 编程工作的实际建议。",
      continuations: "续跑",
      highPressure: "高压力",
      messages: "消息",
      noFindings: "未发现会话追踪问题。",
      noSessions: "尚未导入可用于追踪诊断的会话。"
    },
    pack: {
      title: "任务上下文包",
      desc: "为 Codex、Claude Code、Cursor、Gemini CLI、Aider 或 Cline 生成一份紧凑交接包。",
      task: "任务",
      generate: "生成任务包",
      generating: "生成中",
      output: "输出",
      preview: "任务包预览",
      notGenerated: "尚未生成",
      empty: "生成任务包后可在这里预览智能体交接提示。"
    },
    exports: {
      title: "导出包",
      desc: "生成文件会保持隔离，等待人工审查。",
      generate: "生成导出",
      writing: "写入中",
      publicBundle: "公开安全包",
      latest: "最近导出",
      applyPlan: "应用计划",
      applyPlanDesc: "真实智能体规则文件的 dry-run 目标。先审查；本工具不会覆盖它们。",
      portfolio: "作品集信号",
      expected: "预期",
      ready: "已生成",
      releaseGates: "发布门禁",
      releaseGatesDesc: "公开到 GitHub 或作品集前需要通过的检查。",
      publishCheck: "发布检查",
      artifactAudit: "产物审计",
      reviewDiff: "审查差异",
      createAfterReview: "审查后创建",
      portfolioDesc: "扫描到的会话和来源经过审查后，可以转化为公开工程履历证据。",
      gateFindings: "门禁发现",
      noGateFindings: "未发现发布门禁阻断项或警告。",
      audited: "已审计",
      noSessionExport: "当前浏览器会话尚未生成导出；上方审计仍覆盖已有产物。"
    },
    sessionsPage: {
      title: "会话账本",
      userTurns: "轮用户消息"
    },
    sourcesPage: {
      inventory: "来源清单",
      inventoryDesc: "在授权工作区根目录中发现的文件类型。",
      sourceFiles: "来源文件",
      redactions: "处脱敏"
    },
    driftPage: {
      title: "上下文漂移",
      desc: "可能已经过期或不完整的规则、工具策略和生成上下文。",
      critical: "严重",
      warnings: "警告",
      info: "信息",
      releaseGate: "发布门禁",
      findings: "发现",
      noFindings: "未发现上下文漂移问题。"
    },
    risksPage: {
      privacyPosture: "隐私状态",
      privacyPostureDesc: "所有扫描都在本地完成。索引和导出前会先脱敏。",
      backendBind: "后端绑定",
      writePolicy: "写入策略",
      writePolicyValue: "仅写入导出目录",
      modelCalls: "模型调用",
      modelCallsValue: "默认关闭",
      secretFindings: "疑似密钥发现",
      privacyAudit: "隐私审计",
      mcpSafety: "MCP 安全",
      redactionFindings: "脱敏发现",
      noSecrets: "本次扫描未发现疑似密钥值。",
      privacyAuditPending: "隐私审计尚未运行。",
      privacyAuditClean: "未发现会阻止发布的私有路径、密钥、会话日志或环境文件。",
      mcpAuditPending: "MCP 安全审计尚未运行。",
      mcpAuditClean: "当前工作区未发现 MCP 服务配置。",
      envKeys: "个环境变量键"
    }
  }
} as const;

type Copy = (typeof copy)[Locale];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function compactPath(value: string, depth = 3): string {
  if (!value) return "";
  const parts = value.split(/[\\/]+/).filter(Boolean);
  if (parts.length <= depth) return value.replace(/\\/g, "/");
  return `.../${parts.slice(-depth).join("/")}`;
}

function statusLabel(value: string | undefined, t: Copy): string {
  if (!value) return t.common.pending;
  const labels = t.common.statusLabels as Record<string, string>;
  return labels[value] || value;
}

function severityLabel(severity: RiskSeverity, t: Copy): string {
  return statusLabel(severity, t);
}

function stageClass(stage: WorkflowStage["status"]): string {
  return `stage stage-${stage}`;
}

function priorityClass(item: ContextItem): string {
  return `priority priority-${item.priority}`;
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem("vibe-context-os:locale") === "zh" ? "zh" : "en";
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <motion.div className={`stat stat-${tone}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.div>
  );
}

function AppShell({
  view,
  setView,
  children,
  analysis,
  onRefresh,
  loading,
  locale,
  setLocale,
  t
}: {
  view: View;
  setView: (view: View) => void;
  children: React.ReactNode;
  analysis: AnalysisResult | null;
  onRefresh: () => void;
  loading: boolean;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Copy;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <Layers3 size={22} aria-hidden="true" />
          </div>
          <div>
            <h1>Vibe Context OS</h1>
            <p>{t.brandSubtitle}</p>
          </div>
        </div>

        <nav className="nav-list" aria-label={t.common.primaryNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
                <Icon size={18} aria-hidden="true" />
                <span>{t.nav[item.id]}</span>
              </button>
            );
          })}
        </nav>

        <div className="scope-block">
          <span>{t.workspace}</span>
          <strong>{analysis ? compactPath(analysis.workspaceRoot, 1) : t.pendingScan}</strong>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">{t.topbar}</span>
            <h2>{t.nav[view]}</h2>
          </div>
          <div className="topbar-actions">
            <div className="language-toggle" role="group" aria-label={t.language}>
              <button type="button" className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>
                EN
              </button>
              <button type="button" className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")}>
                中文
              </button>
            </div>
            <button className="primary-action" onClick={onRefresh} disabled={loading}>
              <RefreshCw size={18} className={loading ? "spin" : ""} aria-hidden="true" />
              <span>{loading ? t.scanning : t.rescan}</span>
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Overview({
  analysis,
  privacyAudit,
  statusReport,
  traceReport,
  configDoctor,
  t
}: {
  analysis: AnalysisResult;
  privacyAudit: PrivacyAuditReport | null;
  statusReport: StatusReport | null;
  traceReport: TraceReport | null;
  configDoctor: ConfigDoctorReport | null;
  t: Copy;
}) {
  const topSessions = analysis.sessions.slice(0, 8);
  const chartData = analysis.categories.filter((item) => item.count > 0).slice(0, 8);
  const privacyStatus = statusReport?.privacy.status || privacyAudit?.status || "pending";
  const publishStatus = statusReport?.publish.status || analysis.publish?.status || "n/a";
  const tokenBudget = statusReport?.budget.totalEstimatedTokens || analysis.budget?.totalEstimatedTokens;

  return (
    <div className="view-grid">
      <section className="metrics-row" aria-label={t.common.workspaceMetrics}>
        <Stat
          label={t.common.overall}
          value={statusLabel(statusReport?.overall.status, t)}
          icon={Activity}
          tone={!statusReport || statusReport.overall.status === "ready" ? "good" : "warn"}
        />
        <Stat label={t.overview.sources} value={analysis.summary.sources} icon={FileText} />
        <Stat label={t.overview.sessions} value={analysis.summary.sessions} icon={BrainCircuit} />
        <Stat label={t.overview.rules} value={analysis.summary.ruleFiles} icon={ClipboardCheck} tone="good" />
        <Stat label={t.overview.risks} value={analysis.summary.risks} icon={AlertTriangle} tone={analysis.summary.risks > 0 ? "warn" : "good"} />
        <Stat label={t.overview.tokens} value={tokenBudget ? `~${tokenBudget}` : "n/a"} icon={Layers3} />
        <Stat
          label={t.nav.trace}
          value={statusLabel(traceReport?.status, t)}
          icon={GitBranch}
          tone={!traceReport || traceReport.status === "healthy" || traceReport.status === "empty" ? "good" : "warn"}
        />
        <Stat
          label={t.nav.config}
          value={configDoctor ? `${configDoctor.score}` : t.common.pending}
          icon={ClipboardCheck}
          tone={!configDoctor || configDoctor.status === "ready" ? "good" : "warn"}
        />
        <Stat
          label={t.overview.publish}
          value={statusLabel(publishStatus, t)}
          icon={ShieldCheck}
          tone={publishStatus === "ready" ? "good" : "warn"}
        />
        <Stat
          label={t.overview.privacy}
          value={statusLabel(privacyStatus, t)}
          icon={Lock}
          tone={privacyStatus === "pass" || privacyStatus === "pending" ? "good" : "warn"}
        />
      </section>

      {statusReport && (
        <section className={`status-banner status-${statusReport.overall.status}`}>
          <div>
            <strong>{statusLabel(statusReport.overall.status, t)}</strong>
            <span>{statusReport.overall.message}</span>
          </div>
          <div>
            <span>{statusReport.overall.blockers} {t.common.blockers}</span>
            <span>{statusReport.overall.warnings} {t.common.warnings}</span>
          </div>
        </section>
      )}

      <section className="panel panel-large">
        <div className="panel-heading">
          <div>
            <h3>{t.overview.contextSignal}</h3>
            <p>{t.overview.contextSignalDesc}</p>
          </div>
          <Sparkles size={20} aria-hidden="true" />
        </div>
        <div className="signal-chart">
          {chartData.map((item) => (
            <div key={item.name} className="signal-row">
              <span>{item.name}</span>
              <div>
                <i style={{ width: `${item.weight}%` }} />
              </div>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.overview.workflowStages}</h3>
            <p>{t.overview.workflowStagesDesc}</p>
          </div>
          <GitBranch size={20} aria-hidden="true" />
        </div>
        <div className="stage-list">
          {analysis.workflowStages.map((stage) => (
            <div key={stage.name} className={stageClass(stage.status)}>
              <span>{stage.name}</span>
              <strong>{statusLabel(stage.status, t)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.overview.recommendations}</h3>
            <p>{t.overview.recommendationsDesc}</p>
          </div>
          <CheckCircle2 size={20} aria-hidden="true" />
        </div>
        <div className="recommendation-list">
          {analysis.recommendations.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>

      <section className="panel panel-wide">
        <div className="panel-heading">
          <div>
            <h3>{t.overview.contextItems}</h3>
            <p>{t.overview.contextItemsDesc}</p>
          </div>
          <Fingerprint size={20} aria-hidden="true" />
        </div>
        <div className="context-list">
          {analysis.contextItems.slice(0, 16).map((item) => (
            <article key={item.id} className="context-item">
              <div>
                <span className={priorityClass(item)}>{item.priority}</span>
                <span className="type-label">{item.type}</span>
              </div>
              <h4>{item.title}</h4>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.overview.recentSessions}</h3>
            <p>{t.overview.recentSessionsDesc}</p>
          </div>
          <TerminalSquare size={20} aria-hidden="true" />
        </div>
        <div className="compact-list">
          {topSessions.map((session) => (
            <article key={session.id}>
              <strong>{session.title}</strong>
              <span>{formatDate(session.updatedAt)}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ConfigDoctor({
  report,
  t,
  onWriteFixPack,
  writingFixPack,
  fixPackResult
}: {
  report: ConfigDoctorReport | null;
  t: Copy;
  onWriteFixPack: () => void;
  writingFixPack: boolean;
  fixPackResult: ConfigFixPackResult | null;
}) {
  if (!report) {
    return <p className="empty-state">{t.pendingScan}</p>;
  }

  return (
    <div className="split-view">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.config.title}</h3>
            <p>{t.config.desc}</p>
          </div>
          <ClipboardCheck size={20} aria-hidden="true" />
        </div>
        <div className="privacy-stack">
          <div>
            <strong>{t.common.status}</strong>
            <span>{statusLabel(report.status, t)}</span>
          </div>
          <div>
            <strong>{t.common.score}</strong>
            <span>{report.score}/100</span>
          </div>
          <div>
            <strong>{t.config.present}</strong>
            <span>
              {report.totals.present}/{report.totals.surfaces}
            </span>
          </div>
          <div>
            <strong>{t.config.safety}</strong>
            <span>{report.totals.safetyCovered}</span>
          </div>
          <div>
            <strong>{t.config.verification}</strong>
            <span>{report.totals.verificationCovered}</span>
          </div>
          <div>
            <strong>{t.config.cli}</strong>
            <span>npm run vibe -- config-doctor</span>
          </div>
        </div>
        <button className="secondary-action full-width" onClick={onWriteFixPack} disabled={writingFixPack}>
          <FileText size={18} aria-hidden="true" />
          <span>{writingFixPack ? t.config.writingFixPack : t.config.writeFixPack}</span>
        </button>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.config.coverage}</h3>
            <p>{t.config.coverageDesc}</p>
          </div>
          <Activity size={20} aria-hidden="true" />
        </div>
        <div className="stage-list">
          <div className="stage stage-strong">
            <span>{t.config.context}</span>
            <strong>{report.totals.contextCovered}</strong>
          </div>
          <div className="stage stage-strong">
            <span>{t.config.handoff}</span>
            <strong>{report.totals.handoffCovered}</strong>
          </div>
          <div className="stage stage-partial">
            <span>{t.config.tools}</span>
            <strong>{report.totals.toolsCovered}</strong>
          </div>
        </div>
      </section>

      <section className="table-panel panel-wide">
        <div className="section-heading">
          <h3>{t.config.agentSurfaces}</h3>
          <span>{report.surfaces.length} {t.config.targets}</span>
        </div>
        <div className="source-list">
          {report.surfaces.map((surface) => (
            <article key={surface.id} className={`source-row config-${surface.status}`}>
              <div>
                <strong>{surface.label}</strong>
                <span>{surface.target}</span>
              </div>
              <aside>
                <span>{statusLabel(surface.status, t)}</span>
                <code>{surface.signals.safety ? t.config.safety : t.config.noSafety}</code>
                <code>{surface.signals.verification ? t.config.verify : t.config.noVerify}</code>
              </aside>
            </article>
          ))}
        </div>
      </section>

      <section className="table-panel panel-wide">
        <div className="section-heading">
          <h3>{t.config.findings}</h3>
          <span>{report.findings.length} {t.common.findings}</span>
        </div>
        <div className="drift-list">
          {report.findings.length === 0 ? (
            <p className="empty-state">{t.config.noFindings}</p>
          ) : (
            report.findings.map((finding) => (
              <article key={finding.id} className={`drift-row config-finding-${finding.severity}`}>
                <div>
                  <span>{statusLabel(finding.severity, t)}</span>
                  <h4>{finding.title}</h4>
                  <p>{finding.detail}</p>
                  <strong>{finding.action}</strong>
                </div>
                <aside>
                  {finding.evidence.slice(0, 4).map((item) => (
                    <code key={item}>{item}</code>
                  ))}
                </aside>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="table-panel panel-wide">
        <div className="section-heading">
          <h3>{t.config.fixPack}</h3>
          <span>
            {fixPackResult ? `${t.config.writtenFixPack} ${compactPath(fixPackResult.path)}` : `${report.fixes.length} ${t.config.suggestions}`}
          </span>
        </div>
        <div className="source-list">
          {report.fixes.length === 0 ? (
            <p className="empty-state">{t.config.noFixes}</p>
          ) : (
            report.fixes.slice(0, 80).map((fix) => (
              <article key={fix.id} className="source-row config-present">
                <div>
                  <strong>{fix.title}</strong>
                  <span>{fix.target}</span>
                  <p>{fix.detail}</p>
                </div>
                <aside>
                  <span>{fix.kind}</span>
                  <code>{fix.artifact}</code>
                </aside>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel panel-wide">
        <div className="panel-heading">
          <div>
            <h3>{t.overview.recommendations}</h3>
            <p>{t.config.recommendationsDesc}</p>
          </div>
          <CheckCircle2 size={20} aria-hidden="true" />
        </div>
        <div className="recommendation-list">
          {report.recommendations.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function TraceInspector({ traceReport, t }: { traceReport: TraceReport | null; t: Copy }) {
  if (!traceReport) {
    return <p className="empty-state">{t.pendingScan}</p>;
  }

  const pressureCounts = traceReport.sessions.reduce(
    (acc, session) => {
      acc[session.pressure] += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  return (
    <div className="split-view">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.trace.posture}</h3>
            <p>{t.trace.postureDesc}</p>
          </div>
          <GitBranch size={20} aria-hidden="true" />
        </div>
        <div className="privacy-stack">
          <div>
            <strong>{t.common.status}</strong>
            <span>{statusLabel(traceReport.status, t)}</span>
          </div>
          <div>
            <strong>{t.overview.sessions}</strong>
            <span>{traceReport.totals.sessions}</span>
          </div>
          <div>
            <strong>{t.trace.messages}</strong>
            <span>{traceReport.totals.messages}</span>
          </div>
          <div>
            <strong>{t.trace.continuations}</strong>
            <span>{traceReport.totals.continuationSessions}</span>
          </div>
          <div>
            <strong>{t.trace.highPressure}</strong>
            <span>{traceReport.totals.highPressureSessions}</span>
          </div>
          <div>
            <strong>CLI</strong>
            <span>npm run vibe -- trace</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.trace.pressureMix}</h3>
            <p>{t.trace.pressureMixDesc}</p>
          </div>
          <Activity size={20} aria-hidden="true" />
        </div>
        <div className="stage-list">
          <div className="stage stage-strong">
            <span>{t.common.low}</span>
            <strong>{pressureCounts.low}</strong>
          </div>
          <div className="stage stage-partial">
            <span>{t.common.medium}</span>
            <strong>{pressureCounts.medium}</strong>
          </div>
          <div className="stage stage-missing">
            <span>{t.common.high}</span>
            <strong>{pressureCounts.high}</strong>
          </div>
        </div>
      </section>

      <section className="table-panel panel-wide">
        <div className="section-heading">
          <h3>{t.trace.findings}</h3>
          <span>{traceReport.findings.length} {t.common.findings}</span>
        </div>
        <div className="drift-list">
          {traceReport.findings.length === 0 ? (
            <p className="empty-state">{t.trace.noFindings}</p>
          ) : (
            traceReport.findings.map((finding) => (
              <article key={finding.id} className={`drift-row trace-${finding.severity}`}>
                <div>
                  <span>{statusLabel(finding.severity, t)}</span>
                  <h4>{finding.title}</h4>
                  <p>{finding.detail}</p>
                  <strong>{finding.action}</strong>
                </div>
                <aside>
                  {finding.evidence.slice(0, 4).map((item) => (
                    <code key={item}>{item}</code>
                  ))}
                </aside>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="table-panel panel-wide">
        <div className="section-heading">
          <h3>{t.trace.sessionPressure}</h3>
          <span>{traceReport.sessions.length} {t.common.sessions}</span>
        </div>
        <div className="session-grid">
          {traceReport.sessions.length === 0 ? (
            <p className="empty-state">{t.trace.noSessions}</p>
          ) : (
            traceReport.sessions.slice(0, 120).map((session) => (
              <article key={session.id} className={`session-row session-pressure-${session.pressure}`}>
                <div>
                  <h4>{session.title}</h4>
                  <p>
                    {session.messageCount} {t.trace.messages}, {session.userTurns} {t.common.userTurns}, {session.assistantTurns} {t.common.assistantTurns}
                  </p>
                  <div className="tag-row">
                    <span>{statusLabel(session.pressure, t)}</span>
                    {session.signals.map((signal) => (
                      <span key={signal}>{signal}</span>
                    ))}
                  </div>
                </div>
                <aside>
                  <strong>{session.provider}</strong>
                  <span>{formatDate(session.updatedAt)}</span>
                  <span>{session.tags.slice(0, 3).join(", ") || t.common.noTags}</span>
                </aside>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel panel-wide">
        <div className="panel-heading">
          <div>
            <h3>{t.trace.recommendations}</h3>
            <p>{t.trace.recommendationsDesc}</p>
          </div>
          <CheckCircle2 size={20} aria-hidden="true" />
        </div>
        <div className="recommendation-list">
          {traceReport.recommendations.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function Sessions({ analysis, t }: { analysis: AnalysisResult; t: Copy }) {
  return (
    <section className="table-panel">
      <div className="section-heading">
        <h3>{t.sessionsPage.title}</h3>
        <span>{analysis.sessions.length} {t.common.sessions}</span>
      </div>
      <div className="session-grid">
        {analysis.sessions.map((session) => (
          <article key={session.id} className="session-row">
            <div>
              <h4>{session.title}</h4>
              <p>{session.summary}</p>
              <div className="tag-row">
                {session.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <aside>
              <strong>{session.provider}</strong>
              <span>{formatDate(session.updatedAt)}</span>
              <span>{session.userTurns} {t.sessionsPage.userTurns}</span>
            </aside>
          </article>
        ))}
      </div>
    </section>
  );
}

function Sources({ analysis, t }: { analysis: AnalysisResult; t: Copy }) {
  const grouped = useMemo(() => {
    const groups = new Map<string, number>();
    for (const source of analysis.sources) {
      groups.set(source.kind, (groups.get(source.kind) || 0) + 1);
    }
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [analysis.sources]);

  return (
    <div className="split-view">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.sourcesPage.inventory}</h3>
            <p>{t.sourcesPage.inventoryDesc}</p>
          </div>
          <FileText size={20} aria-hidden="true" />
        </div>
        <div className="kind-list">
          {grouped.map(([kind, count]) => (
            <div key={kind}>
              <span>{kind}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="table-panel">
        <div className="section-heading">
          <h3>{t.sourcesPage.sourceFiles}</h3>
          <span>{analysis.sources.length} {t.common.files}</span>
        </div>
        <div className="source-list">
          {analysis.sources.slice(0, 160).map((source) => (
            <article key={source.id} className="source-row">
              <div>
                <strong>{source.relativePath}</strong>
                <span>{source.kind}</span>
              </div>
              <aside>
                <span>{Math.ceil(source.size / 1024)} KB</span>
                {source.redactionCount > 0 && <mark>{source.redactionCount} {t.sourcesPage.redactions}</mark>}
              </aside>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Drift({ analysis, t }: { analysis: AnalysisResult; t: Copy }) {
  const counts = useMemo(() => {
    return analysis.driftFindings.reduce(
      (acc, finding) => {
        acc[finding.severity] += 1;
        return acc;
      },
      { critical: 0, warning: 0, info: 0 }
    );
  }, [analysis.driftFindings]);

  return (
    <div className="split-view">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.driftPage.title}</h3>
            <p>{t.driftPage.desc}</p>
          </div>
          <AlertTriangle size={20} aria-hidden="true" />
        </div>
        <div className="privacy-stack">
          <div>
            <strong>{t.driftPage.critical}</strong>
            <span>{counts.critical}</span>
          </div>
          <div>
            <strong>{t.driftPage.warnings}</strong>
            <span>{counts.warning}</span>
          </div>
          <div>
            <strong>{t.driftPage.info}</strong>
            <span>{counts.info}</span>
          </div>
          <div>
            <strong>CLI</strong>
            <span>npm run vibe -- drift</span>
          </div>
          <div>
            <strong>{t.driftPage.releaseGate}</strong>
            <span>npm run vibe -- publish-check</span>
          </div>
        </div>
      </section>

      <section className="table-panel">
        <div className="section-heading">
          <h3>{t.driftPage.findings}</h3>
          <span>{analysis.driftFindings.length} {t.common.findings}</span>
        </div>
        <div className="drift-list">
          {analysis.driftFindings.length === 0 ? (
            <p className="empty-state">{t.driftPage.noFindings}</p>
          ) : (
            analysis.driftFindings.map((finding) => (
              <article key={finding.id} className={`drift-row drift-${finding.severity}`}>
                <div>
                  <span>{statusLabel(finding.severity, t)}</span>
                  <h4>{finding.title}</h4>
                  <p>{finding.detail}</p>
                  <strong>{finding.recommendation}</strong>
                </div>
                <aside>
                  {finding.evidence.slice(0, 4).map((item) => (
                    <code key={item}>{item}</code>
                  ))}
                </aside>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Risks({
  analysis,
  privacyAudit,
  mcpAudit,
  t
}: {
  analysis: AnalysisResult;
  privacyAudit: PrivacyAuditReport | null;
  mcpAudit: McpAuditReport | null;
  t: Copy;
}) {
  return (
    <div className="split-view">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.risksPage.privacyPosture}</h3>
            <p>{t.risksPage.privacyPostureDesc}</p>
          </div>
          <ShieldCheck size={20} aria-hidden="true" />
        </div>
        <div className="privacy-stack">
          <div>
            <strong>{t.risksPage.backendBind}</strong>
            <span>127.0.0.1 only</span>
          </div>
          <div>
            <strong>{t.risksPage.writePolicy}</strong>
            <span>{t.risksPage.writePolicyValue}</span>
          </div>
          <div>
            <strong>{t.risksPage.modelCalls}</strong>
            <span>{t.risksPage.modelCallsValue}</span>
          </div>
          <div>
            <strong>{t.risksPage.secretFindings}</strong>
            <span>{analysis.risks.length}</span>
          </div>
          <div>
            <strong>{t.risksPage.privacyAudit}</strong>
            <span>{privacyAudit ? `${statusLabel(privacyAudit.status, t)} / ${privacyAudit.checkedFiles} ${t.common.files}` : t.common.pending}</span>
          </div>
          <div>
            <strong>{t.risksPage.mcpSafety}</strong>
            <span>{mcpAudit ? `${statusLabel(mcpAudit.status, t)} / ${mcpAudit.servers.length} ${t.common.servers}` : t.common.pending}</span>
          </div>
        </div>
      </section>

      <section className="table-panel">
        <div className="section-heading">
          <h3>{t.risksPage.redactionFindings}</h3>
          <span>{analysis.risks.length} {t.common.findings}</span>
        </div>
        <div className="risk-list">
          {analysis.risks.length === 0 ? (
            <p className="empty-state">{t.risksPage.noSecrets}</p>
          ) : (
            analysis.risks.slice(0, 120).map((risk) => (
              <article key={risk.id} className={`risk-row risk-${risk.severity}`}>
                <div>
                  <strong>{risk.label}</strong>
                  <span>{risk.sourcePath}</span>
                </div>
                <aside>
                  <span>{severityLabel(risk.severity, t)}</span>
                  <code>{risk.fingerprint}</code>
                </aside>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="table-panel panel-wide">
        <div className="section-heading">
          <h3>{t.risksPage.privacyAudit}</h3>
          <span>{privacyAudit ? `${privacyAudit.findings.length} ${t.common.findings}` : t.common.pending}</span>
        </div>
        <div className="risk-list">
          {!privacyAudit ? (
            <p className="empty-state">{t.risksPage.privacyAuditPending}</p>
          ) : privacyAudit.findings.length === 0 ? (
            <p className="empty-state">{t.risksPage.privacyAuditClean}</p>
          ) : (
            privacyAudit.findings.map((finding) => (
              <article key={finding.id} className={`risk-row risk-${finding.severity === "block" ? "high" : "medium"}`}>
                <div>
                  <strong>{finding.title}</strong>
                  <span>{finding.file}</span>
                  <p>{finding.detail}</p>
                </div>
                <aside>
                  <span>{statusLabel(finding.severity, t)}</span>
                  <code>{finding.action}</code>
                </aside>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="table-panel panel-wide">
        <div className="section-heading">
          <h3>{t.risksPage.mcpSafety}</h3>
          <span>{mcpAudit ? `${mcpAudit.findings.length} ${t.common.findings} / ${mcpAudit.checkedFiles} ${t.common.files}` : t.common.pending}</span>
        </div>
        <div className="risk-list">
          {!mcpAudit ? (
            <p className="empty-state">{t.risksPage.mcpAuditPending}</p>
          ) : mcpAudit.servers.length === 0 ? (
            <p className="empty-state">{t.risksPage.mcpAuditClean}</p>
          ) : (
            mcpAudit.servers.map((server) => (
              <article key={`${server.file}:${server.name}`} className="risk-row risk-low">
                <div>
                  <strong>{server.name}</strong>
                  <span>{server.file}</span>
                  <p>{[server.command, ...server.args].filter(Boolean).join(" ") || "remote/non-stdio"}</p>
                </div>
                <aside>
                  <span>{server.envKeys.length} {t.risksPage.envKeys}</span>
                  {server.envKeys.slice(0, 4).map((key) => (
                    <code key={key}>{key}</code>
                  ))}
                </aside>
              </article>
            ))
          )}
          {mcpAudit?.findings.map((finding) => (
            <article key={finding.id} className={`risk-row risk-${finding.severity === "block" ? "high" : finding.severity === "warn" ? "medium" : "low"}`}>
              <div>
                <strong>{finding.title}</strong>
                <span>{finding.server ? `${finding.file} / ${finding.server}` : finding.file}</span>
                <p>{finding.detail}</p>
              </div>
              <aside>
                <span>{statusLabel(finding.severity, t)}</span>
                <code>{finding.action}</code>
              </aside>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TaskPack({
  analysis,
  task,
  setTask,
  packText,
  packPath,
  onGenerate,
  packing,
  t
}: {
  analysis: AnalysisResult;
  task: string;
  setTask: (value: string) => void;
  packText: string;
  packPath: string;
  onGenerate: () => void;
  packing: boolean;
  t: Copy;
}) {
  return (
    <div className="split-view">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.pack.title}</h3>
            <p>{t.pack.desc}</p>
          </div>
          <TerminalSquare size={20} aria-hidden="true" />
        </div>
        <label className="task-input">
          <span>{t.pack.task}</span>
          <textarea value={task} onChange={(event) => setTask(event.target.value)} rows={6} />
        </label>
        <button className="primary-action full-width" onClick={onGenerate} disabled={packing || task.trim().length === 0}>
          <Sparkles size={18} aria-hidden="true" />
          <span>{packing ? t.pack.generating : t.pack.generate}</span>
        </button>
        <div className="privacy-stack">
          <div>
            <strong>{t.overview.sources}</strong>
            <span>{analysis.summary.sources}</span>
          </div>
          <div>
            <strong>{t.overview.sessions}</strong>
            <span>{analysis.summary.sessions}</span>
          </div>
          <div>
            <strong>{t.pack.output}</strong>
            <span>exports/latest/TASK_PACK.md</span>
          </div>
        </div>
      </section>

      <section className="table-panel">
        <div className="section-heading">
          <h3>{t.pack.preview}</h3>
          <span>{packPath ? compactPath(packPath) : t.pack.notGenerated}</span>
        </div>
        {packText ? <pre className="pack-preview">{packText}</pre> : <p className="empty-state">{t.pack.empty}</p>}
      </section>
    </div>
  );
}

function Exports({
  analysis,
  applyTargets,
  exportResult,
  statusReport,
  privacyAudit,
  mcpAudit,
  publishReport,
  artifactAudit,
  onExport,
  onPublicBundle,
  exporting,
  t
}: {
  analysis: AnalysisResult;
  applyTargets: ApplyTarget[];
  exportResult: ExportResult | null;
  statusReport: StatusReport | null;
  privacyAudit: PrivacyAuditReport | null;
  mcpAudit: McpAuditReport | null;
  publishReport: PublishReport | null;
  artifactAudit: ArtifactAuditReport | null;
  onExport: () => void;
  onPublicBundle: () => void;
  exporting: boolean;
  t: Copy;
}) {
  const expected = [
    "AGENTS.generated.md",
    ".cursor/rules/vibe-context.generated.mdc",
    "CLAUDE.generated.md",
    "GEMINI.generated.md",
    ".clinerules.generated.md",
    ".continue/vibe-context-check.md",
    ".github/copilot-instructions.md",
    ".claude/skills/vibe-context-os/SKILL.md",
    "MCP_TOOL_POLICY.md",
    "TRACE_REPORT.md",
    "CONFIG_DOCTOR_REPORT.md",
    "CONFIG_FIX_PACK.md",
    "claude-hooks.example.json",
    "CONTEXT_DRIFT_REPORT.md",
    "CONTEXT_BUDGET_REPORT.md",
    "PUBLISH_CHECK_REPORT.md",
    "PUBLIC_RELEASE_CHECKLIST.md",
    "RELEASE_PLAN.md",
    "APPLY_PLAN.md",
    ".github/workflows/vibe-context-check.yml",
    "mcp.vibe-context.example.json",
    ".mcp.vibe-context.example.json",
    "PROJECT_BRIEF.md",
    "REVIEW_CHECKLIST.md",
    "GITHUB_PROFILE_SNIPPET.md",
    "context-map.json",
    "analysis-summary.md"
  ];
  const generatedPaths = exportResult?.files.map((file) => file.path.replace(/\\/g, "/")) || [];
  const wasGenerated = (expectedPath: string) => generatedPaths.some((filePath) => filePath.endsWith(`/${expectedPath}`));
  const latestCountLabel = exportResult
    ? `${exportResult.files.length} ${t.common.files}`
    : artifactAudit
      ? `${artifactAudit.checkedFiles} ${t.common.files} ${t.exports.audited}`
      : `0 ${t.common.files}`;
  const gateFindings = [
    ...(publishReport?.checks
      .filter((check) => check.severity !== "pass")
      .map((check) => ({
        id: `publish:${check.id}`,
        source: t.exports.publishCheck,
        severity: check.severity,
        title: check.title,
        detail: check.detail,
        action: check.action
      })) || []),
    ...(privacyAudit?.findings.map((finding) => ({
      id: `privacy:${finding.id}`,
      source: t.risksPage.privacyAudit,
      severity: finding.severity,
      title: finding.title,
      detail: finding.detail,
      action: finding.action
    })) || []),
    ...(artifactAudit?.findings.map((finding) => ({
      id: `artifact:${finding.id}`,
      source: t.exports.artifactAudit,
      severity: finding.severity,
      title: finding.title,
      detail: finding.detail,
      action: finding.action
    })) || []),
    ...(mcpAudit?.findings
      .filter((finding) => finding.severity !== "info")
      .map((finding) => ({
        id: `mcp:${finding.id}`,
        source: t.risksPage.mcpSafety,
        severity: finding.severity,
        title: finding.title,
        detail: finding.detail,
        action: finding.action
      })) || [])
  ].slice(0, 6);

  return (
    <div className="split-view">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{t.exports.title}</h3>
            <p>{t.exports.desc}</p>
          </div>
          <Download size={20} aria-hidden="true" />
        </div>
        <button className="primary-action full-width" onClick={onExport} disabled={exporting}>
          <Download size={18} aria-hidden="true" />
          <span>{exporting ? t.exports.writing : t.exports.generate}</span>
        </button>
        <button className="secondary-action full-width" onClick={onPublicBundle} disabled={exporting}>
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{t.exports.publicBundle}</span>
        </button>
        <div className="release-gate-block">
          <div className="section-mini-heading">
            <strong>{t.exports.releaseGates}</strong>
            <span>{t.exports.releaseGatesDesc}</span>
          </div>
          <div className="privacy-stack">
            <div>
              <strong>{t.exports.publishCheck}</strong>
              <span>{statusLabel(publishReport?.status || statusReport?.publish.status, t)}</span>
            </div>
            <div>
              <strong>{t.risksPage.privacyAudit}</strong>
              <span>{privacyAudit ? `${statusLabel(privacyAudit.status, t)} / ${privacyAudit.checkedFiles} ${t.common.files}` : t.common.pending}</span>
            </div>
            <div>
              <strong>{t.exports.artifactAudit}</strong>
              <span>{artifactAudit ? `${statusLabel(artifactAudit.status, t)} / ${artifactAudit.checkedFiles} ${t.common.files}` : t.common.pending}</span>
            </div>
            <div>
              <strong>{t.risksPage.mcpSafety}</strong>
              <span>{mcpAudit ? `${statusLabel(mcpAudit.status, t)} / ${mcpAudit.servers.length} ${t.common.servers}` : t.common.pending}</span>
            </div>
          </div>
          <div className="gate-finding-list">
            <div className="section-mini-heading">
              <strong>{t.exports.gateFindings}</strong>
            </div>
            {gateFindings.length === 0 ? (
              <p>{t.exports.noGateFindings}</p>
            ) : (
              gateFindings.map((finding) => (
                <article key={finding.id} className={`gate-finding gate-${finding.severity}`}>
                  <div>
                    <span>{finding.source}</span>
                    <strong>{finding.title}</strong>
                    <p>{finding.detail}</p>
                  </div>
                  <aside>
                    <mark>{statusLabel(finding.severity, t)}</mark>
                    <p>{finding.action}</p>
                  </aside>
                </article>
              ))
            )}
          </div>
        </div>
        <div className="export-plan">
          {expected.map((file) => (
            <div key={file}>
              <span>{file}</span>
              <strong>{wasGenerated(file) ? t.exports.ready : t.exports.expected}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="table-panel">
        <div className="section-heading">
          <h3>{t.exports.latest}</h3>
          <span>{latestCountLabel}</span>
        </div>
        {exportResult ? (
          <div className="source-list">
            <div className="export-root">{compactPath(exportResult.exportRoot)}</div>
            {exportResult.files.map((file) => (
              <article key={file.path} className="source-row">
                <div>
                  <strong>{file.name}</strong>
                  <span>{file.description}</span>
                </div>
                <aside>
                  <span>{Math.ceil(file.bytes / 1024)} KB</span>
                </aside>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">{t.exports.noSessionExport}</p>
        )}
      </section>

      <section className="panel panel-wide">
        <div className="panel-heading">
          <div>
            <h3>{t.exports.applyPlan}</h3>
            <p>{t.exports.applyPlanDesc}</p>
          </div>
          <ClipboardCheck size={20} aria-hidden="true" />
        </div>
        <div className="apply-plan-list">
          {applyTargets.map((target) => (
            <article key={target.target} className={target.targetExists ? "apply-row apply-existing" : "apply-row"}>
              <div>
                <strong>{target.target}</strong>
                <span>{target.artifact}</span>
              </div>
              <aside>
                <mark>{target.targetExists ? t.exports.reviewDiff : t.exports.createAfterReview}</mark>
                <p>{target.advice}</p>
              </aside>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panel-wide">
        <div className="panel-heading">
          <div>
            <h3>{t.exports.portfolio}</h3>
            <p>{t.exports.portfolioDesc}</p>
          </div>
          <Sparkles size={20} aria-hidden="true" />
        </div>
        <pre className="snippet-preview">{`Vibe Coding Context OS: local-first context engineering for AI-assisted development.
Signals: ${analysis.categories
          .filter((category) => category.count > 0)
          .slice(0, 4)
          .map((category) => category.name)
          .join(" / ")}
Exports: AGENTS.md, Cursor rules, CLAUDE.md, GEMINI.md, Cline/Roo rules, Continue check, MCP policy, drift report.`}</pre>
      </section>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<View>("overview");
  const [locale, setLocale] = useState<Locale>(readInitialLocale);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [applyTargets, setApplyTargets] = useState<ApplyTarget[]>([]);
  const [privacyAudit, setPrivacyAudit] = useState<PrivacyAuditReport | null>(null);
  const [publishReport, setPublishReport] = useState<PublishReport | null>(null);
  const [artifactAudit, setArtifactAudit] = useState<ArtifactAuditReport | null>(null);
  const [mcpAudit, setMcpAudit] = useState<McpAuditReport | null>(null);
  const [statusReport, setStatusReport] = useState<StatusReport | null>(null);
  const [traceReport, setTraceReport] = useState<TraceReport | null>(null);
  const [configDoctor, setConfigDoctor] = useState<ConfigDoctorReport | null>(null);
  const [configFixPackResult, setConfigFixPackResult] = useState<ConfigFixPackResult | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [task, setTask] = useState("make AI coding agents share one safe context layer");
  const [packText, setPackText] = useState("");
  const [packPath, setPackPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [packing, setPacking] = useState(false);
  const [writingFixPack, setWritingFixPack] = useState(false);
  const t = copy[locale];

  async function loadAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const [
        nextAnalysis,
        nextApplyPlan,
        nextPrivacyAudit,
        nextPublishReport,
        nextArtifactAudit,
        nextMcpAudit,
        nextStatus,
        nextTrace,
        nextConfigDoctor
      ] = await Promise.all([
        analyzeWorkspace(),
        getApplyPlan(),
        getPrivacyAudit(),
        getPublishCheck(),
        getArtifactAudit(),
        getMcpAudit(),
        getStatus(),
        getTrace(),
        getConfigDoctor()
      ]);
      setAnalysis(nextAnalysis);
      setApplyTargets(nextApplyPlan.targets);
      setPrivacyAudit(nextPrivacyAudit);
      setPublishReport(nextPublishReport);
      setArtifactAudit(nextArtifactAudit);
      setMcpAudit(nextMcpAudit);
      setStatusReport(nextStatus);
      setTraceReport(nextTrace);
      setConfigDoctor(nextConfigDoctor);
      setConfigFixPackResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze workspace");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      setExportResult(await exportArtifacts());
      setArtifactAudit(await getArtifactAudit());
      setView("exports");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export artifacts");
    } finally {
      setExporting(false);
    }
  }

  async function handlePublicBundle() {
    setExporting(true);
    setError(null);
    try {
      setExportResult(await exportPublicBundle());
      setArtifactAudit(await getArtifactAudit());
      setView("exports");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export public bundle");
    } finally {
      setExporting(false);
    }
  }

  async function handlePack() {
    setPacking(true);
    setError(null);
    try {
      const result = await generateTaskPack(task);
      setPackText(result.content);
      setPackPath(result.path);
      setView("pack");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate task pack");
    } finally {
      setPacking(false);
    }
  }

  async function handleConfigFixPack() {
    setWritingFixPack(true);
    setError(null);
    try {
      setConfigFixPackResult(await writeConfigFixPack());
      setConfigDoctor(await getConfigDoctor());
      setView("config");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to write config fix pack");
    } finally {
      setWritingFixPack(false);
    }
  }

  useEffect(() => {
    void loadAnalysis();
  }, []);

  useEffect(() => {
    window.localStorage.setItem("vibe-context-os:locale", locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  return (
    <AppShell
      view={view}
      setView={setView}
      analysis={analysis}
      onRefresh={loadAnalysis}
      loading={loading}
      locale={locale}
      setLocale={setLocale}
      t={t}
    >
      <AnimatePresence mode="wait">
        {error && (
          <motion.div className="error-banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error}</span>
          </motion.div>
        )}

        {loading && !analysis ? (
          <motion.div key="loading" className="loading-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RefreshCw size={24} className="spin" aria-hidden="true" />
            <strong>{t.loading}</strong>
          </motion.div>
        ) : analysis ? (
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {view === "overview" && (
              <Overview
                analysis={analysis}
                privacyAudit={privacyAudit}
                statusReport={statusReport}
                traceReport={traceReport}
                configDoctor={configDoctor}
                t={t}
              />
            )}
            {view === "pack" && (
              <TaskPack
                analysis={analysis}
                task={task}
                setTask={setTask}
                packText={packText}
                packPath={packPath}
                onGenerate={handlePack}
                packing={packing}
                t={t}
              />
            )}
            {view === "sessions" && <Sessions analysis={analysis} t={t} />}
            {view === "config" && (
              <ConfigDoctor
                report={configDoctor}
                t={t}
                onWriteFixPack={handleConfigFixPack}
                writingFixPack={writingFixPack}
                fixPackResult={configFixPackResult}
              />
            )}
            {view === "trace" && <TraceInspector traceReport={traceReport} t={t} />}
            {view === "sources" && <Sources analysis={analysis} t={t} />}
            {view === "drift" && <Drift analysis={analysis} t={t} />}
            {view === "risks" && <Risks analysis={analysis} privacyAudit={privacyAudit} mcpAudit={mcpAudit} t={t} />}
            {view === "exports" && (
              <Exports
                analysis={analysis}
                applyTargets={applyTargets}
                exportResult={exportResult}
                statusReport={statusReport}
                privacyAudit={privacyAudit}
                mcpAudit={mcpAudit}
                publishReport={publishReport}
                artifactAudit={artifactAudit}
                onExport={handleExport}
                onPublicBundle={handlePublicBundle}
                exporting={exporting}
                t={t}
              />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}
