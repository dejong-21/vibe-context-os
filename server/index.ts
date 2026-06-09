import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { analyze } from "./analyzer.js";
import { buildArtifacts, exportArtifacts, exportPublicBundle } from "./exporter.js";
import { buildTaskPack } from "./pack.js";
import { config } from "./config.js";
import type { AnalysisResult } from "./types.js";
import { ensureInside } from "./utils.js";
import { buildApplyPlan } from "./applyPlan.js";
import { buildPrivacyAudit } from "./privacyAudit.js";
import { buildArtifactAudit } from "./artifactAudit.js";
import { buildStatusReport } from "./status.js";
import { buildMcpAudit } from "./mcpAudit.js";
import { buildTraceReport } from "./trace.js";
import { buildConfigDoctorReport, formatConfigFixPack } from "./configDoctor.js";
import { buildBudgetReport } from "./budget.js";
import { buildPublishReport } from "./publish.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
let cachedAnalysis: AnalysisResult | null = null;

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: false
  })
);

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "vibe-context-os",
    workspaceRoot: config.workspaceRoot,
    codexHome: config.codexHome,
    lookbackDays: config.lookbackDays,
    time: new Date().toISOString()
  });
});

app.get("/api/analyze", async (_request, response, next) => {
  try {
    cachedAnalysis = await analyze();
    response.json(cachedAnalysis);
  } catch (error) {
    next(error);
  }
});

app.get("/api/status", async (_request, response, next) => {
  try {
    const analysis = await analyze();
    cachedAnalysis = analysis;
    response.json(await buildStatusReport(analysis));
  } catch (error) {
    next(error);
  }
});

app.get("/api/artifacts", async (_request, response, next) => {
  try {
    const analysis = cachedAnalysis || (await analyze());
    cachedAnalysis = analysis;
    response.json((await buildArtifacts(analysis)).map(({ content: _content, ...artifact }) => artifact));
  } catch (error) {
    next(error);
  }
});

app.post("/api/export", async (_request, response, next) => {
  try {
    const analysis = cachedAnalysis || (await analyze());
    cachedAnalysis = analysis;
    response.json(await exportArtifacts(analysis));
  } catch (error) {
    next(error);
  }
});

app.post("/api/public-bundle", async (_request, response, next) => {
  try {
    const analysis = cachedAnalysis || (await analyze());
    cachedAnalysis = analysis;
    response.json(await exportPublicBundle(analysis));
  } catch (error) {
    next(error);
  }
});

app.get("/api/apply-plan", async (_request, response, next) => {
  try {
    response.json({ targets: await buildApplyPlan() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/privacy-audit", async (_request, response, next) => {
  try {
    response.json(await buildPrivacyAudit());
  } catch (error) {
    next(error);
  }
});

app.get("/api/publish-check", async (_request, response, next) => {
  try {
    const analysis = cachedAnalysis || (await analyze());
    cachedAnalysis = analysis;
    response.json(buildPublishReport(analysis, buildBudgetReport(analysis)));
  } catch (error) {
    next(error);
  }
});

app.get("/api/artifact-audit", async (_request, response, next) => {
  try {
    response.json(await buildArtifactAudit());
  } catch (error) {
    next(error);
  }
});

app.get("/api/mcp-audit", async (_request, response, next) => {
  try {
    response.json(await buildMcpAudit());
  } catch (error) {
    next(error);
  }
});

app.get("/api/config-doctor", async (_request, response, next) => {
  try {
    const analysis = cachedAnalysis || (await analyze());
    cachedAnalysis = analysis;
    response.json(await buildConfigDoctorReport(analysis));
  } catch (error) {
    next(error);
  }
});

app.post("/api/config-fix-pack", async (_request, response, next) => {
  try {
    const analysis = cachedAnalysis || (await analyze());
    cachedAnalysis = analysis;
    const report = await buildConfigDoctorReport(analysis);
    const content = formatConfigFixPack(report);
    const targetRoot = path.join(config.exportRoot, "latest");
    const target = path.join(targetRoot, "CONFIG_FIX_PACK.md");
    await ensureInside(config.exportRoot, target);
    await fs.mkdir(targetRoot, { recursive: true });
    await fs.writeFile(target, content, "utf8");
    response.json({ path: target, fixes: report.fixes.length, bytes: Buffer.byteLength(content, "utf8") });
  } catch (error) {
    next(error);
  }
});

app.get("/api/trace", async (_request, response, next) => {
  try {
    const analysis = cachedAnalysis || (await analyze());
    cachedAnalysis = analysis;
    response.json(buildTraceReport(analysis));
  } catch (error) {
    next(error);
  }
});

app.post("/api/pack", async (request, response, next) => {
  try {
    const schema = z.object({ task: z.string().min(1).max(500) });
    const { task } = schema.parse(request.body);
    const analysis = cachedAnalysis || (await analyze());
    cachedAnalysis = analysis;
    const content = buildTaskPack(analysis, { task });
    const targetRoot = path.join(config.exportRoot, "latest");
    const target = path.join(targetRoot, "TASK_PACK.md");
    await ensureInside(config.exportRoot, target);
    await fs.mkdir(targetRoot, { recursive: true });
    await fs.writeFile(target, content, "utf8");
    response.json({ content, path: target, bytes: Buffer.byteLength(content, "utf8") });
  } catch (error) {
    next(error);
  }
});

app.get("/api/export/:file", async (request, response, next) => {
  try {
    const schema = z.object({ file: z.string().regex(/^[A-Za-z0-9_.-]+$/) });
    const { file } = schema.parse(request.params);
    const filePath = path.join(config.exportRoot, "latest", file);
    const text = await fs.readFile(filePath, "utf8");
    response.type("text/plain").send(text);
  } catch (error) {
    next(error);
  }
});

const distPath = path.resolve(__dirname, "..", "..", "dist");
try {
  await fs.access(distPath);
  app.use(express.static(distPath));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(distPath, "index.html"));
  });
} catch {
  // Dev mode serves the UI through Vite.
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown server error";
  response.status(500).json({ ok: false, error: message });
});

app.listen(config.port, "127.0.0.1", () => {
  console.log(`Vibe Coding Context OS API listening on http://127.0.0.1:${config.port}`);
  console.log(`Workspace root: ${config.workspaceRoot}`);
});
