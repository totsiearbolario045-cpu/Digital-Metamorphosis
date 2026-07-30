import { and, eq, sql } from "drizzle-orm";
import {
  controlPlaneJobsTable,
  controlPlaneTelemetryTable,
  controlPlaneWorkersTable,
  db,
} from "@workspace/db";
import { getAgentSecret } from "./agent-secrets";
import { logger } from "./logger";

const WORKER_ID = "dm-core-control-plane";
const WORKER_NAME = "DIGITAL METAMORPHOSIS Core Worker";
const WORKER_VERSION = "1.0.0";
const CAPABILITIES = ["system.self-test", "catalog.health", "telemetry.emit"];
const HEARTBEAT_INTERVAL_MS = 30_000;

let timer: NodeJS.Timeout | undefined;
let running = false;

async function recordTelemetry(eventType: string, message: string, metrics?: Record<string, unknown>) {
  await db.insert(controlPlaneTelemetryTable).values({
    source: "dm-core-worker",
    eventType,
    severity: "info",
    message,
    workerId: WORKER_ID,
    metrics,
  });
}

async function register() {
  await db
    .insert(controlPlaneWorkersTable)
    .values({
      workerId: WORKER_ID,
      name: WORKER_NAME,
      version: WORKER_VERSION,
      status: "online",
      capabilities: CAPABILITIES,
      metadata: {
        runtime: "api-server",
        ownership: "digital-metamorphosis",
        providerDependency: "none",
      },
      lastHeartbeatAt: new Date(),
    })
    .onConflictDoUpdate({
      target: controlPlaneWorkersTable.workerId,
      set: {
        name: WORKER_NAME,
        version: WORKER_VERSION,
        status: "online",
        capabilities: CAPABILITIES,
        lastHeartbeatAt: new Date(),
      },
    });
  await recordTelemetry("worker.registered", "Core worker registered with the internal control plane.");
}

async function heartbeat() {
  await db
    .update(controlPlaneWorkersTable)
    .set({ status: "online", lastHeartbeatAt: new Date() })
    .where(eq(controlPlaneWorkersTable.workerId, WORKER_ID));
}

async function ensureSelfTestJob() {
  const selfTestWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [existing] = await db
    .select({ id: controlPlaneJobsTable.id })
    .from(controlPlaneJobsTable)
    .where(
      sql`${controlPlaneJobsTable.type} = 'system.self-test'
        AND (
          ${controlPlaneJobsTable.status} IN ('queued', 'running')
          OR (
            ${controlPlaneJobsTable.status} = 'completed'
            AND ${controlPlaneJobsTable.completedAt} >= ${selfTestWindow}
          )
        )`,
    )
    .limit(1);
  if (existing) return;

  await db.insert(controlPlaneJobsTable).values({
    type: "system.self-test",
    priority: 1,
    payload: { initiatedBy: "core-worker", scope: "internal-control-plane" },
    maxAttempts: 3,
  });
  await recordTelemetry("job.enqueued", "Internal control-plane self-test queued.");
}

async function claimJob() {
  const capabilityPredicate = sql`type IN (${sql.join(
    CAPABILITIES.map((capability) => sql`${capability}`),
    sql`, `,
  )})`;
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
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
          worker_id = ${WORKER_ID},
          attempts = jobs.attempts + 1,
          started_at = NOW()
      FROM next_job
      WHERE jobs.id = next_job.id
      RETURNING jobs.id, jobs.type, jobs.payload
    `);
    return result.rows[0] as {
      id: number;
      type: string;
      payload: Record<string, unknown> | null;
    } | undefined;
  });
}

async function processJob() {
  const job = await claimJob();
  if (!job) return;

  try {
    if (job.type !== "system.self-test") {
      throw new Error(`Unsupported core worker job type: ${job.type}`);
    }

    const [serviceCount, environmentCount, workerCount] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS count FROM services`),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM agent_environments`),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM control_plane_workers`),
    ]);
    const metrics = {
      database: "reachable",
      services: Number((serviceCount.rows[0] as { count: number }).count),
      agentEnvironments: Number((environmentCount.rows[0] as { count: number }).count),
      controlPlaneWorkers: Number((workerCount.rows[0] as { count: number }).count),
    };
    await db
      .update(controlPlaneJobsTable)
      .set({
        status: "completed",
        result: { status: "passed", metrics },
        completedAt: new Date(),
      })
      .where(
        and(
          eq(controlPlaneJobsTable.id, Number(job.id)),
          eq(controlPlaneJobsTable.workerId, WORKER_ID),
        ),
      );
    await recordTelemetry("job.completed", "Internal control-plane self-test passed.", metrics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown core worker error";
    await db
      .update(controlPlaneJobsTable)
      .set({
        status: "failed",
        error: message,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(controlPlaneJobsTable.id, Number(job.id)),
          eq(controlPlaneJobsTable.workerId, WORKER_ID),
        ),
      );
    await recordTelemetry("job.failed", "Internal control-plane self-test failed.");
    logger.error({ err: error }, "Core worker job failed");
  }
}

async function tick() {
  if (running) return;
  running = true;
  try {
    await heartbeat();
    await ensureSelfTestJob();
    await processJob();
  } catch (error) {
    logger.error({ err: error }, "Core worker tick failed");
    try {
      await recordTelemetry("worker.error", "Core worker tick failed.");
    } catch {
      // Keep the worker loop alive if telemetry storage is unavailable.
    }
  } finally {
    running = false;
  }
}

export function startControlPlaneWorker() {
  if (!getAgentSecret("controlPlaneWorkers")) {
    logger.warn("Control-plane worker capability is not configured; core worker is offline.");
    return;
  }
  if (timer) return;

  void register()
    .then(() => tick())
    .catch((error) => logger.error({ err: error }, "Core worker failed to start"));
  timer = setInterval(() => void tick(), HEARTBEAT_INTERVAL_MS);
  timer.unref();
  logger.info({ workerId: WORKER_ID }, "Core control-plane worker started");
}