import { Router, type IRouter } from "express";
import { db, servicesTable } from "@workspace/db";
import {
  ListServicesQueryParams,
  ListServicesResponse,
  GetFeaturedServicesResponse,
  GetServiceBySlugParams,
  GetServiceBySlugResponse,
} from "@workspace/api-zod";
import { eq, ilike, and, or, type SQL } from "drizzle-orm";

const router: IRouter = Router();

function mapService(s: typeof servicesTable.$inferSelect) {
  return {
    id: String(s.id),
    slug: s.slug,
    name: s.name,
    description: s.description,
    categoryId: s.categoryId ?? undefined,
    categoryName: s.categoryName ?? undefined,
    provider: s.provider,
    region: s.region,
    status: s.status as "active" | "inactive" | "maintenance" | "deprecated",
    pricing: s.pricing ?? undefined,
    pricingDetails: s.pricingDetails ?? undefined,
    tags: s.tags ?? [],
    featured: s.featured,
    isFeatured: s.featured,
    createdAt: s.createdAt,
  };
}

router.get("/services/featured", async (req, res): Promise<void> => {
  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.featured, true));

  res.json(GetFeaturedServicesResponse.parse(services.map(mapService)));
});

router.get("/services", async (req, res): Promise<void> => {
  const parsed = ListServicesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, search, status, region } = parsed.data;
  const conditions: SQL[] = [];

  if (category) {
    conditions.push(
      or(
        eq(servicesTable.categoryName, category),
        eq(servicesTable.categoryId, category),
        ilike(servicesTable.slug, `${category}-%`),
      )!,
    );
  }
  if (status) conditions.push(eq(servicesTable.status, status));
  if (region) conditions.push(eq(servicesTable.region, region));
  if (search) conditions.push(ilike(servicesTable.name, `%${search}%`));

  const services = await db
    .select()
    .from(servicesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(ListServicesResponse.parse(services.map(mapService)));
});

router.get("/services/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const params = GetServiceBySlugParams.safeParse({ slug: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.slug, params.data.slug));

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.json(GetServiceBySlugResponse.parse(mapService(service)));
});

export default router;
