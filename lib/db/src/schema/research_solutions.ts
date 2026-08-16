import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const researchSolutionsTable = pgTable("research_solutions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("ready"),
  readiness: integer("readiness").notNull().default(0),
  impact: text("impact").notNull().default("Discovery"),
  icon: text("icon").notNull().default("flask-conical"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResearchSolutionSchema = createInsertSchema(researchSolutionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertResearchSolution = z.infer<typeof insertResearchSolutionSchema>;
export type ResearchSolution = typeof researchSolutionsTable.$inferSelect;