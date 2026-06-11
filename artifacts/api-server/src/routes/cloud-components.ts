import { Router, type IRouter } from "express";
import { db, cloudComponentsTable } from "@workspace/db";
import {
  ListCloudComponentsQueryParams,
  ListCloudComponentsResponse,
} from "@workspace/api-zod";
import { eq, ilike, and, type SQL } from "drizzle-orm";

const router: IRouter = Router();

function mapComponent(c: typeof cloudComponentsTable.$inferSelect) {
  return {
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    description: c.description ?? undefined,
    provider: c.provider,
    region: c.region,
    status: c.status as "active" | "inactive" | "maintenance" | "deprecated",
    version: c.version ?? undefined,
    uptime: c.uptime ?? undefined,
    latency: c.latency ?? undefined,
    tags: c.tags ?? [],
  };
}

router.get("/cloud-components", async (req, res): Promise<void> => {
  const parsed = ListCloudComponentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { provider, region, status, search } = parsed.data;
  const conditions: SQL[] = [];

  if (provider) conditions.push(eq(cloudComponentsTable.provider, provider));
  if (region) conditions.push(eq(cloudComponentsTable.region, region));
  if (status) conditions.push(eq(cloudComponentsTable.status, status));
  if (search) conditions.push(ilike(cloudComponentsTable.name, `%${search}%`));

  const components = await db
    .select()
    .from(cloudComponentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(ListCloudComponentsResponse.parse(components.map(mapComponent)));
});

export default router;
