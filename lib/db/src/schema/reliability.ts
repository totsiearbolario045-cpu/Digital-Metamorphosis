import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reliabilityIncidentsTable = pgTable("reliability_incidents", {
  id: serial("id").primaryKey(),
  fingerprint: text("fingerprint").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull().default("warning"),
  status: text("status").notNull().default("open"),
  route: text("route"),
  latestMessage: text("latest_message").notNull(),
  occurrenceCount: integer("occurrence_count").notNull().default(1),
  recoveredCount: integer("recovered_count").notNull().default(0),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  recoveredAt: timestamp("recovered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const reliabilityEventsTable = pgTable("reliability_events", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  eventType: text("event_type").notNull(),
  fingerprint: text("fingerprint").notNull(),
  message: text("message").notNull(),
  stack: text("stack"),
  route: text("route"),
  browser: text("browser"),
  release: text("release"),
  requestUrl: text("request_url"),
  statusCode: integer("status_code"),
  durationMs: integer("duration_ms"),
  metadata: jsonb("metadata"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reliabilityRunbookExecutionsTable = pgTable("reliability_runbook_executions", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  runbookId: text("runbook_id").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull().default("pending"),
  attempt: integer("attempt").notNull().default(1),
  result: jsonb("result"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reliabilityApprovalsTable = pgTable("reliability_approvals", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  executionId: integer("execution_id").notNull(),
  runbookId: text("runbook_id").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull().default("pending"),
  requestedBy: text("requested_by").notNull().default("reliability-worker"),
  reviewedBy: text("reviewed_by"),
  reason: text("reason"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const reliabilitySyntheticTestsTable = pgTable("reliability_synthetic_tests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scenario: text("scenario").notNull(),
  target: text("target").notNull(),
  status: text("status").notNull().default("queued"),
  totalRuns: integer("total_runs").notNull().default(0),
  passedRuns: integer("passed_runs").notNull().default(0),
  recoveredRuns: integer("recovered_runs").notNull().default(0),
  lastResult: jsonb("last_result"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReliabilityIncidentSchema = createInsertSchema(reliabilityIncidentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReliabilityEventSchema = createInsertSchema(reliabilityEventsTable).omit({ id: true, createdAt: true });
export const insertReliabilityExecutionSchema = createInsertSchema(reliabilityRunbookExecutionsTable).omit({ id: true, createdAt: true });
export const insertReliabilityApprovalSchema = createInsertSchema(reliabilityApprovalsTable).omit({ id: true });
export const insertReliabilitySyntheticTestSchema = createInsertSchema(reliabilitySyntheticTestsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertReliabilityIncident = z.infer<typeof insertReliabilityIncidentSchema>;
export type InsertReliabilityEvent = z.infer<typeof insertReliabilityEventSchema>;
export type InsertReliabilityExecution = z.infer<typeof insertReliabilityExecutionSchema>;
export type InsertReliabilityApproval = z.infer<typeof insertReliabilityApprovalSchema>;
export type InsertReliabilitySyntheticTest = z.infer<typeof insertReliabilitySyntheticTestSchema>;
export type ReliabilityIncident = typeof reliabilityIncidentsTable.$inferSelect;
export type ReliabilityEvent = typeof reliabilityEventsTable.$inferSelect;
export type ReliabilityRunbookExecution = typeof reliabilityRunbookExecutionsTable.$inferSelect;
export type ReliabilityApproval = typeof reliabilityApprovalsTable.$inferSelect;
export type ReliabilitySyntheticTest = typeof reliabilitySyntheticTestsTable.$inferSelect;