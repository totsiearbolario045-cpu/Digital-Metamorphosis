import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentEnvironmentsTable = pgTable("agent_environments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  type: text("type").notNull(),
  status: text("status").notNull().default("active"),
  agentCount: integer("agent_count").notNull().default(0),
  activeAgents: integer("active_agents").notNull().default(0),
  agents: jsonb("agents"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAgentEnvironmentSchema = createInsertSchema(agentEnvironmentsTable).omit({ id: true, createdAt: true });
export type InsertAgentEnvironment = z.infer<typeof insertAgentEnvironmentSchema>;
export type AgentEnvironment = typeof agentEnvironmentsTable.$inferSelect;
