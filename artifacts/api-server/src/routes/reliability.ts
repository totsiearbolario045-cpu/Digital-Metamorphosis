import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  sql,
} from "drizzle-orm";
import {
  ApproveReliabilityRunbookBody,
  ApproveReliabilityRunbookResponse,
  CaptureReliabilityEventBody,
  GetReliabilityOverviewResponse,
  ListReliabilityIncidentsQueryParams,
  ListReliabilityIncidentsResponse,
  ListReliabilitySyntheticTestsResponse,
  RunReliabilitySyntheticTestBody,
} from "@workspace/api-zod";
import {
  controlPlaneJobsTable,
  db,
  reliabilityApprovalsTable,
  reliabilityEventsTable,
  reliabilityIncidentsTable,
  reliabilityRunbookExecutionsTable,
  reliabilitySyntheticTestsTable,
} from "@workspace/db";
import { getAgentSecret } from "../lib/agent-secrets";

const router: IRouter = Router();
const MAX_EVENT_BYTES = 12_000;
const OPERATOR_HEADER = "x-digital-metamorphosis-operator-token";
const SENSITIVE_METADATA_KEYS = /password|passwd|cookie|token|secret|authorization|credential|body|payload|query|api[-_]?key/i;

type ReliabilityEvent = {
  eventType: "browser.error" | "browser.rejection" | "network.error" | "recovery.success";
  message: string;
  fingerprint?: string;
  incidentFingerprint?: string;
  stack?: string;
  route?: string;
  browser?: string;
  release?: string;
  requestUrl?: string;
  statusCode?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

function safeDate(value: Date | null | undefined) {
  return value ?? undefined;
}

function hashFingerprint(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 48);
}

function normalizeMessage(message: string) {
  return message.trim().replace(/\s+/g, " ").slice(0, 180);
}

function sanitizeMetadata(value: unknown, depth = 0): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 2) return {};
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_METADATA_KEYS.test(key)) continue;
    if (typeof entry === "string") result[key.slice(0, 80)] = entry.slice(0, 240);
    else if (typeof entry === "number" && Number.isFinite(entry)) result[key.slice(0, 80)] = entry;
    else if (typeof entry === "boolean") result[key.slice(0, 80)] = entry;
    else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      result[key.slice(0, 80)] = sanitizeMetadata(entry, depth + 1);
    }
  }
  return result;
}

function hasOperatorAccess(req: Request): boolean {
  const configuredToken = getAgentSecret("reliabilityOperator");
  const received = req.header(OPERATOR_HEADER);
  if (!configuredToken || !received) return false;
  const expectedBuffer = Buffer.from(configuredToken);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function requireOperatorAccess(req: Request, res: Response): boolean {
  if (!getAgentSecret("reliabilityOperator")) {
    res.status(503).json({ error: "Reliability operator approval is not configured." });
    return false;
  }
  if (!hasOperatorAccess(req)) {
    res.status(401).json({ error: "Operator authentication failed." });
    return false;
  }
  return true;
}

const DEFAULT_SYNTHETIC_TESTS = [
  {
    name: "Browser API timeout and retry",
    scenario: "Simulate an authorized API timeout, retry once, and verify recovery telemetry.",
    target: "internal-control-plane",
  },
  {
    name: "Stale client state revalidation",
    scenario: "Simulate stale browser state and verify a bounded revalidation path.",
    target: "browser-reliability",
  },
  {
    name: "Authorized fallback readiness",
    scenario: "Verify that an approved fallback path can be evaluated without provider ownership claims.",
    target: "authorized-fallback",
  },
] as const;

export async function ensureDefaultSyntheticTests() {
  for (const test of DEFAULT_SYNTHETIC_TESTS) {
    const [existing] = await db
      .select({ id: reliabilitySyntheticTestsTable.id })
      .from(reliabilitySyntheticTestsTable)
      .where(eq(reliabilitySyntheticTestsTable.name, test.name))
      .limit(1);
    if (!existing) {
      await db.insert(reliabilitySyntheticTestsTable).values(test);
    }
  }
}

function categoryFor(event: ReliabilityEvent) {
  if (event.eventType === "network.error") return "network";
  if (event.eventType === "recovery.success") return "recovery";
  return "browser";
}

function severityFor(event: ReliabilityEvent) {
  if ((event.statusCode ?? 0) >= 500) return "critical" as const;
  if (event.eventType === "network.error" || (event.statusCode ?? 0) >= 400) return "warning" as const;
  return "info" as const;
}

function runbookFor(event: ReliabilityEvent) {
  if (event.eventType === "recovery.success") return null;
  if (event.metadata?.requiresApproval === true) {
    return {
      runbookId: "authorized-fallback-readiness",
      action: "Verify authorized fallback readiness",
      requiresApproval: true,
    };
  }
  if (event.eventType === "network.error" || (event.statusCode ?? 0) >= 500) {
    return {
      runbookId: "network.retry-fallback",
      action: "Retry request and verify internal fallback readiness",
      requiresApproval: false,
    };
  }
  return {
    runbookId: "browser.rehydrate",
    action: "Revalidate client state and verify API health",
    requiresApproval: false,
  };
}

function mapIncident(
  incident: typeof reliabilityIncidentsTable.$inferSelect,
  execution?: typeof reliabilityRunbookExecutionsTable.$inferSelect,
) {
  const recoveryStatus = execution?.status === "pending"
    ? "queued"
    : execution?.status;
  return {
    id: String(incident.id),
    fingerprint: incident.fingerprint,
    title: incident.title,
    category: incident.category,
    severity: incident.severity as "info" | "warning" | "critical",
    status: incident.status as "open" | "recovering" | "recovered" | "awaiting_approval" | "ignored",
    route: incident.route ?? undefined,
    latestMessage: incident.latestMessage,
    occurrenceCount: incident.occurrenceCount,
    recoveredCount: incident.recoveredCount,
    firstSeenAt: incident.firstSeenAt,
    lastSeenAt: incident.lastSeenAt,
    recoveredAt: safeDate(incident.recoveredAt),
    activeRunbook: execution?.runbookId,
    recoveryStatus: execution
      ? recoveryStatus as "none" | "queued" | "running" | "completed" | "awaiting_approval" | "failed"
      : "none" as const,
  };
}

function mapApproval(approval: typeof reliabilityApprovalsTable.$inferSelect) {
  return {
    id: String(approval.id),
    incidentId: String(approval.incidentId),
    executionId: String(approval.executionId),
    runbookId: approval.runbookId,
    action: approval.action,
    status: approval.status as "pending" | "approved" | "rejected",
    requestedBy: approval.requestedBy,
    reviewedBy: approval.reviewedBy ?? undefined,
    reason: approval.reason ?? undefined,
    requestedAt: approval.requestedAt,
    reviewedAt: safeDate(approval.reviewedAt),
  };
}

function mapSyntheticTest(test: typeof reliabilitySyntheticTestsTable.$inferSelect) {
  return {
    id: String(test.id),
    name: test.name,
    scenario: test.scenario,
    target: test.target,
    status: test.status as "queued" | "running" | "passed" | "failed",
    totalRuns: test.totalRuns,
    passedRuns: test.passedRuns,
    recoveredRuns: test.recoveredRuns,
    recoveryRate: test.totalRuns > 0 ? test.recoveredRuns / test.totalRuns : 0,
    lastResult: (test.lastResult as Record<string, unknown> | null) ?? undefined,
    lastRunAt: safeDate(test.lastRunAt),
  };
}

async function findActiveExecution(incidentId: number) {
  const [execution] = await db
    .select()
    .from(reliabilityRunbookExecutionsTable)
    .where(
      and(
        eq(reliabilityRunbookExecutionsTable.incidentId, incidentId),
        inArray(reliabilityRunbookExecutionsTable.status, ["pending", "running", "awaiting_approval"]),
      ),
    )
    .orderBy(desc(reliabilityRunbookExecutionsTable.createdAt))
    .limit(1);
  return execution;
}

async function queueRunbook(
  incident: typeof reliabilityIncidentsTable.$inferSelect,
  runbook: NonNullable<ReturnType<typeof runbookFor>>,
) {
  const activeExecution = await findActiveExecution(incident.id);
  if (activeExecution) {
    return { execution: activeExecution, queued: false };
  }

  const [execution] = await db
    .insert(reliabilityRunbookExecutionsTable)
    .values({
      incidentId: incident.id,
      runbookId: runbook.runbookId,
      action: runbook.action,
      status: runbook.requiresApproval ? "awaiting_approval" : "pending",
    })
    .returning();

  if (runbook.requiresApproval) {
    await db.insert(reliabilityApprovalsTable).values({
      incidentId: incident.id,
      executionId: execution.id,
      runbookId: runbook.runbookId,
      action: runbook.action,
    });
    await db
      .update(reliabilityIncidentsTable)
      .set({ status: "awaiting_approval" })
      .where(eq(reliabilityIncidentsTable.id, incident.id));
    return { execution, queued: false };
  }

  await db.insert(controlPlaneJobsTable).values({
    type: "reliability.runbook",
    priority: 10,
    payload: { executionId: execution.id, incidentId: incident.id },
    maxAttempts: 3,
  });
  await db
    .update(reliabilityIncidentsTable)
    .set({ status: "recovering" })
    .where(eq(reliabilityIncidentsTable.id, incident.id));
  return { execution, queued: true };
}

router.post("/reliability/events", async (req, res): Promise<void> => {
  const contentLength = Number(req.get("content-length") ?? 0);
  if (contentLength > MAX_EVENT_BYTES) {
    res.status(413).json({ error: "Reliability event is too large." });
    return;
  }

  const parsed = CaptureReliabilityEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Buffer.byteLength(JSON.stringify(parsed.data), "utf8") > MAX_EVENT_BYTES) {
    res.status(413).json({ error: "Reliability event is too large." });
    return;
  }
  const event = parsed.data as ReliabilityEvent;
  const message = normalizeMessage(event.message);
  const route = event.route?.split("?")[0].slice(0, 300);
  const fingerprint = hashFingerprint(
    event.incidentFingerprint?.trim()
      || `${event.eventType}|${route ?? ""}|${event.statusCode ?? ""}|${message.toLowerCase()}`,
  );
  const now = new Date();

  const [incident] = await db
    .insert(reliabilityIncidentsTable)
    .values({
      fingerprint,
      title: message.slice(0, 120),
      category: categoryFor(event),
      severity: severityFor(event),
      status: event.eventType === "recovery.success" ? "recovered" : "open",
      route,
      latestMessage: message,
      occurrenceCount: 1,
      recoveredCount: event.eventType === "recovery.success" ? 1 : 0,
      firstSeenAt: now,
      lastSeenAt: now,
      recoveredAt: event.eventType === "recovery.success" ? now : undefined,
    })
    .onConflictDoUpdate({
      target: reliabilityIncidentsTable.fingerprint,
      set: {
        status: event.eventType === "recovery.success" ? "recovered" : "open",
        latestMessage: message,
        route,
        occurrenceCount: sql`${reliabilityIncidentsTable.occurrenceCount} + 1`,
        recoveredCount: event.eventType === "recovery.success"
          ? sql`${reliabilityIncidentsTable.recoveredCount} + 1`
          : reliabilityIncidentsTable.recoveredCount,
        lastSeenAt: now,
        recoveredAt: event.eventType === "recovery.success" ? now : null,
      },
    })
    .returning();

  await db.insert(reliabilityEventsTable).values({
    incidentId: incident.id,
    eventType: event.eventType,
    fingerprint: event.fingerprint?.slice(0, 160) ?? fingerprint,
    message,
    stack: event.stack?.slice(0, 4000),
    route,
    browser: event.browser?.slice(0, 120),
    release: event.release?.slice(0, 120),
    requestUrl: event.requestUrl?.split("?")[0].slice(0, 500),
    statusCode: event.statusCode,
    durationMs: event.durationMs,
    metadata: sanitizeMetadata(event.metadata),
    occurredAt: now,
  });

  const runbook = runbookFor(event);
  if (!runbook) {
    res.status(202).json({
      incident: mapIncident(incident),
      grouped: incident.occurrenceCount > 1,
      workerAction: "Recovery confirmation recorded.",
      workerActionStatus: "not_required",
    });
    return;
  }

  const queued = await queueRunbook(incident, runbook);
  const refreshedIncident = {
    ...incident,
    status: runbook.requiresApproval ? "awaiting_approval" : "recovering",
  };
  res.status(202).json({
    incident: mapIncident(refreshedIncident, queued.execution),
    grouped: incident.occurrenceCount > 1,
    workerAction: runbook.action,
    workerActionStatus: runbook.requiresApproval
      ? "awaiting_approval"
      : "queued",
  });
});

router.get("/reliability/overview", async (_req, res): Promise<void> => {
  await ensureDefaultSyntheticTests();
  const dayCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [incidents, tests, eventCount, recoveredCount, pendingApprovals, recoveryExecutions] = await Promise.all([
    db.select().from(reliabilityIncidentsTable).orderBy(desc(reliabilityIncidentsTable.lastSeenAt)).limit(12),
    db.select().from(reliabilitySyntheticTestsTable).orderBy(asc(reliabilitySyntheticTestsTable.name)),
    db.select({ count: count() }).from(reliabilityEventsTable).where(gte(reliabilityEventsTable.occurredAt, dayCutoff)),
    db.select({ count: count() }).from(reliabilityIncidentsTable).where(
      and(
        eq(reliabilityIncidentsTable.status, "recovered"),
        gte(reliabilityIncidentsTable.recoveredAt, dayCutoff),
      ),
    ),
    db.select({ count: count() }).from(reliabilityApprovalsTable).where(eq(reliabilityApprovalsTable.status, "pending")),
    db.select({ count: count() }).from(reliabilityRunbookExecutionsTable).where(
      and(
        eq(reliabilityRunbookExecutionsTable.status, "completed"),
        gte(reliabilityRunbookExecutionsTable.completedAt, dayCutoff),
      ),
    ),
  ]);
  const activeIncidents = incidents.filter((incident) => ["open", "recovering", "awaiting_approval"].includes(incident.status));
  const eventTotal = Number(eventCount[0]?.count ?? 0);
  const recoveredTotal = Number(recoveredCount[0]?.count ?? 0);
  const executionTotal = Number(recoveryExecutions[0]?.count ?? 0);
  const incidentResponses = await Promise.all(
    incidents.map(async (incident) => mapIncident(incident, await findActiveExecution(incident.id))),
  );

  res.json(GetReliabilityOverviewResponse.parse({
    activeIncidents: activeIncidents.length,
    recoveringIncidents: incidents.filter((incident) => incident.status === "recovering").length,
    recoveredIncidents24h: recoveredTotal,
    events24h: eventTotal,
    recoveryRate24h: eventTotal > 0 ? recoveredTotal / eventTotal : 0,
    autoRecovered24h: executionTotal,
    pendingApprovals: Number(pendingApprovals[0]?.count ?? 0),
     syntheticPassRate: tests.reduce((total, test) => total + test.totalRuns, 0) > 0
      ? tests.reduce((total, test) => total + test.passedRuns, 0) / tests.reduce((total, test) => total + test.totalRuns, 0)
      : 0,
     operatorApprovalConfigured: Boolean(getAgentSecret("reliabilityOperator")),
     approvalMode: getAgentSecret("reliabilityOperator") ? "configured" : "locked",
    incidents: incidentResponses,
    syntheticTests: tests.map(mapSyntheticTest),
  }));
});

router.get("/reliability/incidents", async (req, res): Promise<void> => {
  const parsed = ListReliabilityIncidentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const incidents = await db
    .select()
    .from(reliabilityIncidentsTable)
    .where(parsed.data.status ? eq(reliabilityIncidentsTable.status, parsed.data.status) : undefined)
    .orderBy(desc(reliabilityIncidentsTable.lastSeenAt))
    .limit(100);
  const mapped = await Promise.all(
    incidents.map(async (incident) => mapIncident(incident, await findActiveExecution(incident.id))),
  );
  res.json(ListReliabilityIncidentsResponse.parse(mapped));
});

router.post("/reliability/incidents/:id/approve", async (req, res): Promise<void> => {
  if (!requireOperatorAccess(req, res)) return;
  const incidentId = Number(req.params.id);
  const parsed = ApproveReliabilityRunbookBody.safeParse(req.body);
  if (!parsed.success || !Number.isInteger(incidentId)) {
    res.status(400).json({ error: parsed.success ? "Invalid incident ID." : parsed.error.message });
    return;
  }
  const [approval] = await db
    .select()
    .from(reliabilityApprovalsTable)
    .where(
      and(
        eq(reliabilityApprovalsTable.incidentId, incidentId),
        eq(reliabilityApprovalsTable.status, "pending"),
      ),
    )
    .orderBy(desc(reliabilityApprovalsTable.requestedAt))
    .limit(1);
  if (!approval) {
    res.status(404).json({ error: "Pending approval not found." });
    return;
  }

  const reviewedAt = new Date();
  const [updated] = await db
    .update(reliabilityApprovalsTable)
    .set({
      status: parsed.data.decision === "approve" ? "approved" : "rejected",
      reviewedBy: parsed.data.reviewedBy,
      reason: parsed.data.reason,
      reviewedAt,
    })
    .where(eq(reliabilityApprovalsTable.id, approval.id))
    .returning();

  if (parsed.data.decision === "approve") {
    await db
      .update(reliabilityRunbookExecutionsTable)
      .set({ status: "pending" })
      .where(eq(reliabilityRunbookExecutionsTable.id, approval.executionId));
    await db
      .update(reliabilityIncidentsTable)
      .set({ status: "recovering" })
      .where(eq(reliabilityIncidentsTable.id, incidentId));
    await db.insert(controlPlaneJobsTable).values({
      type: "reliability.runbook",
      priority: 5,
      payload: { executionId: approval.executionId, incidentId },
      maxAttempts: 3,
    });
  } else {
    await db
      .update(reliabilityRunbookExecutionsTable)
      .set({ status: "failed", error: "Rejected by operator.", completedAt: reviewedAt })
      .where(eq(reliabilityRunbookExecutionsTable.id, approval.executionId));
    await db
      .update(reliabilityIncidentsTable)
      .set({ status: "ignored" })
      .where(eq(reliabilityIncidentsTable.id, incidentId));
  }

  res.json(ApproveReliabilityRunbookResponse.parse(mapApproval(updated)));
});

router.get("/reliability/synthetic-tests", async (_req, res): Promise<void> => {
  await ensureDefaultSyntheticTests();
  const tests = await db
    .select()
    .from(reliabilitySyntheticTestsTable)
    .orderBy(asc(reliabilitySyntheticTestsTable.name));
  res.json(ListReliabilitySyntheticTestsResponse.parse(tests.map(mapSyntheticTest)));
});

router.post("/reliability/synthetic-tests/:id/run", async (req, res): Promise<void> => {
  await ensureDefaultSyntheticTests();
  const testId = Number(req.params.id);
  const parsed = RunReliabilitySyntheticTestBody.safeParse(req.body ?? {});
  if (!parsed.success || !Number.isInteger(testId)) {
    res.status(400).json({ error: parsed.success ? "Invalid synthetic test ID." : parsed.error.message });
    return;
  }
  const [test] = await db
    .update(reliabilitySyntheticTestsTable)
    .set({ status: "queued" })
    .where(eq(reliabilitySyntheticTestsTable.id, testId))
    .returning();
  if (!test) {
    res.status(404).json({ error: "Synthetic test not found." });
    return;
  }
  await db.insert(controlPlaneJobsTable).values({
    type: "reliability.synthetic",
    priority: 20,
    payload: { testId, requestedBy: parsed.data.requestedBy ?? "operations-console" },
    maxAttempts: 2,
  });
  res.status(202).json(mapSyntheticTest(test));
});

export default router;