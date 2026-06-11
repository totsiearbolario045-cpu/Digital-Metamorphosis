import { Router, type IRouter } from "express";
import { db, resourcesTable } from "@workspace/db";
import {
  ListResourcesQueryParams,
  ListResourcesResponse,
} from "@workspace/api-zod";
import { eq, and, type SQL } from "drizzle-orm";

const router: IRouter = Router();

router.get("/resources", async (req, res): Promise<void> => {
  const parsed = ListResourcesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { region, type, priority, status } = parsed.data;
  const conditions: SQL[] = [];

  if (region) conditions.push(eq(resourcesTable.region, region));
  if (type) conditions.push(eq(resourcesTable.type, type));
  if (priority) conditions.push(eq(resourcesTable.priority, priority));
  if (status) conditions.push(eq(resourcesTable.status, status));

  const resources = await db
    .select()
    .from(resourcesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(ListResourcesResponse.parse(resources.map(r => ({
    id: String(r.id),
    location: r.location,
    status: r.status,
    priority: r.priority,
    region: r.region,
    type: r.type as "CPU" | "GPU" | "HYBRID",
    quantity: r.quantity,
  }))));
});

export default router;
