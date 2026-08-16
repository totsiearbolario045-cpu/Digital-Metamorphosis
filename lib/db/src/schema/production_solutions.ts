import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productionSolutionsTable = pgTable("production_solutions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("ready"),
  readiness: integer("readiness").notNull().default(0),
  impact: text("impact").notNull().default("Operational"),
  icon: text("icon").notNull().default("sparkles"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductionSolutionSchema = createInsertSchema(productionSolutionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertProductionSolution = z.infer<typeof insertProductionSolutionSchema>;
export type ProductionSolution = typeof productionSolutionsTable.$inferSelect;