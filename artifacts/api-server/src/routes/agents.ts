import { Router, type IRouter } from "express";
import { db, agentEnvironmentsTable } from "@workspace/db";
import {
  GetAgentEnvironmentParams,
  GetAgentEnvironmentResponse,
  GetAgentRuntimeStatusResponse,
  ListAgentEnvironmentsResponse,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { getAgentRuntimeStatus } from "../lib/agent-secrets";

const router: IRouter = Router();

function mapEnv(e: typeof agentEnvironmentsTable.$inferSelect) {
  return {
    id: String(e.id),
    name: e.name,
    slug: e.slug,
    description: e.description ?? undefined,
    type: e.type as "production" | "research" | "devops" | "staging",
    status: e.status as "active" | "inactive" | "maintenance",
    agentCount: e.agentCount,
    activeAgents: e.activeAgents,
    agents: (e.agents as Array<{ id: string; name: string; model?: string; status: string; role?: string }> | null) ?? [],
  };
}

router.get("/agents", async (req, res): Promise<void> => {
  const environments = await db.select().from(agentEnvironmentsTable);
  res.json(ListAgentEnvironmentsResponse.parse(environments.map(mapEnv)));
});

router.get("/agents/runtime", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.json(GetAgentRuntimeStatusResponse.parse(getAgentRuntimeStatus()));
});

router.get("/agents/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetAgentEnvironmentParams.safeParse({ id: raw });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [env] = await db
    .select()
    .from(agentEnvironmentsTable)
    .where(eq(agentEnvironmentsTable.id, Number(parsed.data.id)));

  if (!env) {
    res.status(404).json({ error: "Agent environment not found" });
    return;
  }

  res.json(GetAgentEnvironmentResponse.parse(mapEnv(env)));
});

export default router;
