import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import type { Request, Response } from "express";
import {
  asc,
  count,
  desc,
  eq,
  gte,
  sql,
} from "drizzle-orm";
import {
  HeartbeatControlPlaneWorkerBody,
  ClaimControlPlaneJobBody,
  CompleteControlPlaneJobBody,
  EnqueueControlPlaneJobBody,
  IngestControlPlaneTelemetryBody,
  RegisterControlPlaneWorkerBody,
  GetControlPlaneStatusResponse,
  HeartbeatControlPlaneWorkerResponse,
  ClaimControlPlaneJobResponse,
  CompleteControlPlaneJobResponse,
} from "@workspace/api-zod";
import {
  controlPlaneJobsTable,
  controlPlaneTelemetryTable,
  controlPlaneWorkersTable,
  db,
} from "@workspace/db";
import { getAgentSecret } from "../lib/agent-secrets";

const router: IRouter = Router();
const WORKER_HEADER = "x-digital-metamorphosis-worker-token";
const HEARTBEAT_WINDOW_MS = 90_000;

function safeDate(value: Date | null | undefined) {
  return value ?? undefined;
}

function mapWorker(worker: typeof controlPlaneWorkersTable.$inferSelect) {
  return {
    id: String(worker.id),
    workerId: worker.workerId,
    name: worker.name,
    version: worker.version ?? undefined,
    status: worker.status as "online" | "offline" | "draining" | "degraded",
    capabilities: worker.capabilities ?? [],
    registeredAt: worker.registeredAt,
    lastHeartbeatAt: safeDate(worker.lastHeartbeatAt),
  };
}

function mapJob(job: typeof controlPlaneJobsTable.$inferSelect) {
  return {
    id: String(job.id),
    type: job.type,
    status: job.status as "queued" | "running" | "completed" | "failed",
    priority: job.priority,
    payload: (job.payload as Record<string, unknown> | null) ?? undefined,
    result: (job.result as Record<string, unknown> | null) ?? undefined,
    workerId: job.workerId ?? undefined,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    error: job.error ?? undefined,
    createdAt: job.createdAt,
    startedAt: safeDate(job.startedAt),
    completedAt: safeDate(job.completedAt),
  };
}

function mapTelemetry(telemetry: typeof controlPlaneTelemetryTable.$inferSelect) {
  return {
    id: String(telemetry.id),
    source: telemetry.source,
    eventType: telemetry.eventType,
    severity: telemetry.severity,
    message: telemetry.message,
    workerId: telemetry.workerId ?? undefined,
    recordedAt: telemetry.recordedAt,
  };
}

function hasWorkerAccess(req: Request): boolean {
  const configuredToken = getAgentSecret("controlPlaneWorkers");
  if (!configuredToken) return false;

  const received = req.header(WORKER_HEADER);
  if (!received) return false;

  const expectedBuffer = Buffer.from(configuredToken);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function requireWorkerAccess(req: Request, res: Response): boolean {
  if (!getAgentSecret("controlPlaneWorkers")) {
    res.status(503).json({ error: "Control-plane workers are not configured." });
    return false;
  }
  if (!hasWorkerAccess(req)) {
    res.status(401).json({ error: "Worker authentication failed." });
    return false;
  }
  return true;
}

router.get("/control-plane/status", async (_req, res): Promise<void> => {
  const heartbeatCutoff = new Date(Date.now() - HEARTBEAT_WINDOW_MS);
  const telemetryCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [workers, queueCounts, dayCounts, lastEvent] = await Promise.all([
    db.select().from(controlPlaneWorkersTable).orderBy(asc(controlPlaneWorkersTable.name)),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'queued')::int AS queued_jobs,
        COUNT(*) FILTER (WHERE status = 'running')::int AS running_jobs
      FROM control_plane_jobs
    `),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_jobs,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_jobs
      FROM control_plane_jobs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `),
    db.select({ recordedAt: controlPlaneTelemetryTable.recordedAt })
      .from(controlPlaneTelemetryTable)
      .orderBy(desc(controlPlaneTelemetryTable.recordedAt))
      .limit(1),
  ]);

  const onlineWorkers = workers.filter(
    (worker) =>
      worker.status === "online"
      && worker.lastHeartbeatAt
      && worker.lastHeartbeatAt >= heartbeatCutoff,
  );
  const queue = (queueCounts.rows[0] ?? {}) as { queued_jobs?: number; running_jobs?: number };
  const day = (dayCounts.rows[0] ?? {}) as { completed_jobs?: number; failed_jobs?: number };
  const telemetryCount = await db
    .select({ count: count() })
    .from(controlPlaneTelemetryTable)
    .where(gte(controlPlaneTelemetryTable.recordedAt, telemetryCutoff));
  const workerCount = workers.length;
  const status = onlineWorkers.length > 0
    ? "operational"
    : workerCount > 0
      ? "degraded"
      : "offline";

  res.json(GetControlPlaneStatusResponse.parse({
    status,
    workerCount,
    onlineWorkerCount: onlineWorkers.length,
    queuedJobs: Number(queue.queued_jobs ?? 0),
    runningJobs: Number(queue.running_jobs ?? 0),
    completedJobs24h: Number(day.completed_jobs ?? 0),
    failedJobs24h: Number(day.failed_jobs ?? 0),
    telemetry24h: Number(telemetryCount[0]?.count ?? 0),
    lastEventAt: lastEvent[0]?.recordedAt ?? undefined,
    workers: workers.map((worker) => ({
      ...mapWorker(worker),
      status: onlineWorkers.some((online) => online.id === worker.id)
        ? "online"
        : worker.status === "online"
          ? "offline"
          : worker.status,
    })),
  }));
});

router.post("/control-plane/workers/register", async (req, res): Promise<void> => {
  if (!requireWorkerAccess(req, res)) return;
  const parsed = RegisterControlPlaneWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const [worker] = await db
    .insert(controlPlaneWorkersTable)
    .values({
      workerId: input.workerId,
      name: input.name,
      version: input.version,
      status: "online",
      capabilities: input.capabilities,
      metadata: input.metadata,
      lastHeartbeatAt: new Date(),
    })
    .onConflictDoUpdate({
      target: controlPlaneWorkersTable.workerId,
      set: {
        name: input.name,
        version: input.version,
        status: "online",
        capabilities: input.capabilities,
        metadata: input.metadata,
        lastHeartbeatAt: new Date(),
      },
    })
    .returning();

  res.status(201).json(HeartbeatControlPlaneWorkerResponse.parse(mapWorker(worker)));
});

router.post("/control-plane/workers/:workerId/heartbeat", async (req, res): Promise<void> => {
  if (!requireWorkerAccess(req, res)) return;
  const workerId = String(req.params.workerId);
  const parsed = HeartbeatControlPlaneWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [worker] = await db
    .update(controlPlaneWorkersTable)
    .set({
      status: parsed.data.status,
      version: parsed.data.version,
      lastHeartbeatAt: new Date(),
    })
    .where(eq(controlPlaneWorkersTable.workerId, workerId))
    .returning();
  if (!worker) {
    res.status(404).json({ error: "Worker not found." });
    return;
  }

  if (parsed.data.metrics) {
    await db.insert(controlPlaneTelemetryTable).values({
      source: "control-plane-worker",
      eventType: "worker.heartbeat",
      severity: "info",
      message: `${worker.name} heartbeat accepted`,
      workerId,
      metrics: parsed.data.metrics,
    });
  }
  res.json(HeartbeatControlPlaneWorkerResponse.parse(mapWorker(worker)));
});

router.post("/control-plane/jobs", async (req, res): Promise<void> => {
  if (!requireWorkerAccess(req, res)) return;
  const parsed = EnqueueControlPlaneJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [job] = await db
    .insert(controlPlaneJobsTable)
    .values({
      type: parsed.data.type,
      priority: parsed.data.priority ?? 100,
      payload: parsed.data.payload,
      maxAttempts: parsed.data.maxAttempts ?? 3,
    })
    .returning();
  res.status(201).json(CompleteControlPlaneJobResponse.parse(mapJob(job)));
});

router.post("/control-plane/jobs/claim", async (req, res): Promise<void> => {
  if (!requireWorkerAccess(req, res)) return;
  const parsed = ClaimControlPlaneJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const workerId = parsed.data.workerId;
  const capabilities = parsed.data.capabilities ?? [];
  const capabilityPredicate = capabilities.length > 0
    ? sql`type IN (${sql.join(capabilities.map((capability) => sql`${capability}`), sql`, `)})
        OR type = 'system.heartbeat'`
    : sql`TRUE`;
  const claimed = await db.execute(sql`
    WITH next_job AS (
      SELECT id
      FROM control_plane_jobs
      WHERE status = 'queued'
        AND attempts < max_attempts
        AND (${capabilityPredicate})
      ORDER BY priority ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE control_plane_jobs AS jobs
    SET status = 'running',
        worker_id = ${workerId},
        attempts = jobs.attempts + 1,
        started_at = NOW()
    FROM next_job
    WHERE jobs.id = next_job.id
    RETURNING jobs.*
  `);
  const row = claimed.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    res.json(ClaimControlPlaneJobResponse.parse(null));
    return;
  }

  res.json(ClaimControlPlaneJobResponse.parse(mapJob({
    id: Number(row.id),
    type: String(row.type),
    status: String(row.status),
    priority: Number(row.priority),
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    result: (row.result as Record<string, unknown> | null) ?? null,
    workerId: row.worker_id ? String(row.worker_id) : null,
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    error: row.error ? String(row.error) : null,
    createdAt: new Date(String(row.created_at)),
    startedAt: row.started_at ? new Date(String(row.started_at)) : null,
    completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
  })));
});

router.post("/control-plane/jobs/:id/complete", async (req, res): Promise<void> => {
  if (!requireWorkerAccess(req, res)) return;
  const jobId = Number(req.params.id);
  const parsed = CompleteControlPlaneJobBody.safeParse(req.body);
  if (!parsed.success || !Number.isInteger(jobId)) {
    res.status(400).json({ error: parsed.success ? "Invalid job ID." : parsed.error.message });
    return;
  }
  const [job] = await db
    .update(controlPlaneJobsTable)
    .set({
      status: parsed.data.status,
      result: parsed.data.result,
      error: parsed.data.error,
      completedAt: new Date(),
    })
    .where(
      sql`${controlPlaneJobsTable.id} = ${jobId}
        AND ${controlPlaneJobsTable.workerId} = ${parsed.data.workerId}`,
    )
    .returning();
  if (!job) {
    res.status(404).json({ error: "Job not found." });
    return;
  }
  res.json(CompleteControlPlaneJobResponse.parse(mapJob(job)));
});

router.post("/control-plane/telemetry", async (req, res): Promise<void> => {
  if (!requireWorkerAccess(req, res)) return;
  const parsed = IngestControlPlaneTelemetryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [telemetry] = await db
    .insert(controlPlaneTelemetryTable)
    .values({
      source: parsed.data.source,
      eventType: parsed.data.eventType,
      severity: parsed.data.severity ?? "info",
      message: parsed.data.message,
      workerId: parsed.data.workerId,
      metrics: parsed.data.metrics,
    })
    .returning();
  res.status(201).json(mapTelemetry(telemetry));
});

export default router;