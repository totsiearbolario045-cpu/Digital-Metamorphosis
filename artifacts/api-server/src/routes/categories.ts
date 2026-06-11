import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { ListCategoriesResponse } from "@workspace/api-zod";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.name));

  res.json(ListCategoriesResponse.parse(categories.map(c => ({
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    description: c.description ?? undefined,
    icon: c.icon ?? undefined,
    serviceCount: c.serviceCount,
  }))));
});

export default router;
