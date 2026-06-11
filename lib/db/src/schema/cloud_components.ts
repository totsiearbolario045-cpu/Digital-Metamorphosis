import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cloudComponentsTable = pgTable("cloud_components", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  provider: text("provider").notNull(),
  region: text("region").notNull(),
  status: text("status").notNull().default("active"),
  version: text("version"),
  uptime: text("uptime"),
  latency: text("latency"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCloudComponentSchema = createInsertSchema(cloudComponentsTable).omit({ id: true, createdAt: true });
export type InsertCloudComponent = z.infer<typeof insertCloudComponentSchema>;
export type CloudComponent = typeof cloudComponentsTable.$inferSelect;
