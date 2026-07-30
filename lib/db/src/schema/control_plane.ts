import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const controlPlaneWorkersTable = pgTable("control_plane_workers", {
  id: serial("id").primaryKey(),
  workerId: text("worker_id").notNull().unique(),
  name: text("name").notNull(),
  version: text("version"),
  status: text("status").notNull().default("offline"),
  capabilities: text("capabilities").array(),
  metadata: jsonb("metadata"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
});

export const controlPlaneJobsTable = pgTable("control_plane_jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  priority: integer("priority").notNull().default(100),
  payload: jsonb("payload"),
  result: jsonb("result"),
  workerId: text("worker_id"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const controlPlaneTelemetryTable = pgTable("control_plane_telemetry", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull().default("info"),
  message: text("message").notNull(),
  workerId: text("worker_id"),
  metrics: jsonb("metrics"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertControlPlaneWorkerSchema = createInsertSchema(controlPlaneWorkersTable).omit({ id: true, registeredAt: true });
export const insertControlPlaneJobSchema = createInsertSchema(controlPlaneJobsTable).omit({ id: true, createdAt: true });
export const insertControlPlaneTelemetrySchema = createInsertSchema(controlPlaneTelemetryTable).omit({ id: true, recordedAt: true });

export type InsertControlPlaneWorker = z.infer<typeof insertControlPlaneWorkerSchema>;
export type InsertControlPlaneJob = z.infer<typeof insertControlPlaneJobSchema>;
export type InsertControlPlaneTelemetry = z.infer<typeof insertControlPlaneTelemetrySchema>;
export type ControlPlaneWorker = typeof controlPlaneWorkersTable.$inferSelect;
export type ControlPlaneJob = typeof controlPlaneJobsTable.$inferSelect;
export type ControlPlaneTelemetry = typeof controlPlaneTelemetryTable.$inferSelect;