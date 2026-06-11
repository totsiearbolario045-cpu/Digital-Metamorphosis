import { Router, type IRouter } from "express";
import { db, serviceRequestsTable } from "@workspace/db";
import {
  SubmitServiceRequestBody,
  ListServiceRequestsResponse,
} from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

function mapRequest(r: typeof serviceRequestsTable.$inferSelect) {
  return {
    id: String(r.id),
    serviceId: r.serviceId ?? undefined,
    serviceName: r.serviceName,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone ?? undefined,
    organization: r.organization ?? undefined,
    notes: r.notes ?? undefined,
    status: r.status as "pending" | "in_review" | "approved" | "rejected",
    createdAt: r.createdAt,
  };
}

router.post("/requests", async (req, res): Promise<void> => {
  const parsed = SubmitServiceRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [request] = await db
    .insert(serviceRequestsTable)
    .values({
      serviceId: parsed.data.serviceId,
      serviceName: parsed.data.serviceName,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      contactPhone: parsed.data.contactPhone,
      organization: parsed.data.organization,
      notes: parsed.data.notes,
      status: "pending",
    })
    .returning();

  res.status(201).json(mapRequest(request));
});

router.get("/requests", async (req, res): Promise<void> => {
  const requests = await db
    .select()
    .from(serviceRequestsTable)
    .orderBy(desc(serviceRequestsTable.createdAt));

  res.json(ListServiceRequestsResponse.parse(requests.map(mapRequest)));
});

export default router;
