import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { servicesTable, categoriesTable, cloudComponentsTable, agentEnvironmentsTable, serviceRequestsTable, resourcesTable } from "@workspace/db";
import { GetCatalogStatsResponse } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (req, res): Promise<void> => {
  const [
    servicesCount,
    categoriesCount,
    cloudComponentsCount,
    agentEnvsCount,
    requestsCount,
    resourcesCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(servicesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(categoriesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(cloudComponentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(agentEnvironmentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(serviceRequestsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(resourcesTable),
  ]);

  const stats = {
    totalServices: servicesCount[0]?.count ?? 0,
    totalCategories: categoriesCount[0]?.count ?? 0,
    totalCloudComponents: cloudComponentsCount[0]?.count ?? 0,
    totalAgentEnvironments: agentEnvsCount[0]?.count ?? 0,
    totalRequests: requestsCount[0]?.count ?? 0,
    totalResources: resourcesCount[0]?.count ?? 0,
  };

  res.json(GetCatalogStatsResponse.parse(stats));
});

export default router;
