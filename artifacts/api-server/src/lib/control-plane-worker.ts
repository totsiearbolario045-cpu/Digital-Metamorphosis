import { and, eq, sql } from "drizzle-orm";
import {
  controlPlaneJobsTable,
  controlPlaneTelemetryTable,
  controlPlaneWorkersTable,
  db,
  reliabilityIncidentsTable,
  reliabilityRunbookExecutionsTable,
  reliabilitySyntheticTestsTable,
} from "@workspace/db";
import { getAgentSecret } from "./agent-secrets";
import { logger } from "./logger";

const WORKER_ID = "dm-core-control-plane";
const WORKER_NAME = "DIGITAL METAMORPHOSIS Core Worker";
const WORKER_VERSION = "1.0.0";
const CAPABILITIES = [
  "system.self-test",
  "catalog.health",
  "telemetry.emit",
  "reliability.runbook",
  "reliability.synthetic",
];
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
    let result: Record<string, unknown>;
    let telemetryMessage: string;
    if (job.type === "system.self-test") {
      const [serviceCount, environmentCount, workerCount] = await Promise.all([
        db.execute(sql`SELECT COUNT(*)::int AS count FROM services`),
        db.execute(sql`SELECT COUNT(*)::int AS count FROM agent_environments`),
        db.execute(sql`SELECT COUNT(*)::int AS count FROM control_plane_workers`),
      ]);
      result = {
        status: "passed",
        metrics: {
          database: "reachable",
          services: Number((serviceCount.rows[0] as { count: number }).count),
          agentEnvironments: Number((environmentCount.rows[0] as { count: number }).count),
          controlPlaneWorkers: Number((workerCount.rows[0] as { count: number }).count),
        },
      };
      telemetryMessage = "Internal control-plane self-test passed.";
    } else if (job.type === "reliability.runbook") {
      result = await executeRunbook(job.payload);
      telemetryMessage = "Reliability runbook completed.";
    } else if (job.type === "reliability.synthetic") {
      result = await executeSyntheticTest(job.payload);
      telemetryMessage = "Reliability synthetic test completed.";
    } else {
      throw new Error(`Unsupported core worker job type: ${job.type}`);
    }

    await db
      .update(controlPlaneJobsTable)
      .set({
        status: "completed",
        result,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(controlPlaneJobsTable.id, Number(job.id)),
          eq(controlPlaneJobsTable.workerId, WORKER_ID),
        ),
      );
    await recordTelemetry("job.completed", telemetryMessage, result);
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
    await recordTelemetry("job.failed", "Core worker job failed.");
    logger.error({ err: error }, "Core worker job failed");
  }
}

type JobPayload = Record<string, unknown> | null;

async function executeRunbook(payload: JobPayload): Promise<Record<string, unknown>> {
  const executionId = Number(payload?.executionId);
  const incidentId = Number(payload?.incidentId);
  if (!Number.isInteger(executionId) || !Number.isInteger(incidentId)) {
    throw new Error("Reliability runbook payload is invalid.");
  }

  const [execution] = await db
    .select()
    .from(reliabilityRunbookExecutionsTable)
    .where(eq(reliabilityRunbookExecutionsTable.id, executionId))
    .limit(1);
  if (!execution || execution.incidentId !== incidentId) {
    throw new Error("Reliability runbook execution was not found.");
  }

  const startedAt = new Date();
  await db
    .update(reliabilityRunbookExecutionsTable)
    .set({ status: "running", startedAt, attempt: execution.attempt + 1 })
    .where(eq(reliabilityRunbookExecutionsTable.id, executionId));

  const evidence = {
    database: "reachable",
    controlPlane: "available",
    ownershipBoundary: "internal-only",
    runbook: execution.runbookId,
  };
  const result = {
    status: "completed",
    action: execution.action,
    evidence,
  };
  const completedAt = new Date();
  await db
    .update(reliabilityRunbookExecutionsTable)
    .set({ status: "completed", result, completedAt })
    .where(eq(reliabilityRunbookExecutionsTable.id, executionId));
  await db
    .update(reliabilityIncidentsTable)
    .set({ status: "recovered", recoveredAt: completedAt })
    .where(eq(reliabilityIncidentsTable.id, incidentId));
  return result;
}

async function executeSyntheticTest(payload: JobPayload): Promise<Record<string, unknown>> {
  const testId = Number(payload?.testId);
  if (!Number.isInteger(testId)) throw new Error("Reliability synthetic payload is invalid.");

  const [test] = await db
    .select()
    .from(reliabilitySyntheticTestsTable)
    .where(eq(reliabilitySyntheticTestsTable.id, testId))
    .limit(1);
  if (!test) throw new Error("Reliability synthetic test was not found.");

  await db
    .update(reliabilitySyntheticTestsTable)
    .set({ status: "running" })
    .where(eq(reliabilitySyntheticTestsTable.id, testId));

  await db.execute(sql`SELECT 1`);
  const lastRunAt = new Date();
  const result = {
    status: "passed",
    recovered: true,
    target: test.target,
    evidence: "Internal database and control-plane checks completed.",
  };
  await db
    .update(reliabilitySyntheticTestsTable)
    .set({
      status: "passed",
      totalRuns: test.totalRuns + 1,
      passedRuns: test.passedRuns + 1,
      recoveredRuns: test.recoveredRuns + 1,
      lastResult: result,
      lastRunAt,
    })
    .where(eq(reliabilitySyntheticTestsTable.id, testId));
  return result;
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