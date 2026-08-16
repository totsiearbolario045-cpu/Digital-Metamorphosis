import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  agentEnvironmentsTable,
  db,
  productionSolutionsTable,
} from "@workspace/db";
import {
  GetAgentEnvironmentParams,
  GetAgentEnvironmentResponse,
  GetProductionEnvironmentDashboardResponse,
  GetAgentRuntimeStatusResponse,
  ListAgentEnvironmentsResponse,
} from "@workspace/api-zod";
import { getAgentRuntimeStatus } from "../lib/agent-secrets";

const router: IRouter = Router();

const PRODUCTION_SOLUTIONS = [
  ["release-orchestration", "Release Orchestration", "Coordinate safe releases across services with staged rollout visibility.", "Delivery", "workflow", "Execution"],
  ["deployment-guardrails", "Deployment Guardrails", "Validate production changes against policy, health, and rollback requirements.", "Delivery", "shield-check", "Risk reduction"],
  ["rollback-coordination", "Rollback Coordination", "Bring approved rollback playbooks together when a release needs to be reversed.", "Delivery", "undo-2", "Recovery"],
  ["change-impact-analysis", "Change Impact Analysis", "Map likely service and workflow impact before production changes are activated.", "Delivery", "git-compare", "Clarity"],
  ["incident-command", "Incident Command", "Create a shared operating picture for incidents, owners, actions, and next decisions.", "Reliability", "siren", "Response"],
  ["browser-reliability", "Browser Reliability", "Capture, group, and recover from client-side errors and network failures.", "Reliability", "monitor-check", "Continuity"],
  ["synthetic-readiness", "Synthetic Readiness", "Exercise bounded failure scenarios and verify recovery evidence.", "Reliability", "flask-conical", "Confidence"],
  ["service-health-watch", "Service Health Watch", "Track internal service signals and surface operational drift early.", "Reliability", "heart-pulse", "Awareness"],
  ["capacity-planning", "Capacity Planning", "Turn workload signals into practical production capacity decisions.", "Operations", "chart-no-axes-combined", "Efficiency"],
  ["queue-control", "Queue Control", "Prioritize and govern durable work across the internal execution plane.", "Operations", "list-ordered", "Throughput"],
  ["worker-fleet", "Worker Fleet", "Register, observe, and coordinate authenticated execution workers.", "Operations", "server-cog", "Control"],
  ["telemetry-operations", "Telemetry Operations", "Collect safe operational evidence without exposing credentials or payloads.", "Operations", "activity", "Visibility"],
  ["data-quality", "Data Quality", "Detect incomplete, stale, and inconsistent production records before they spread.", "Governance", "database-zap", "Trust"],
  ["access-governance", "Access Governance", "Keep production actions inside explicit capability and approval boundaries.", "Governance", "key-round", "Security"],
  ["audit-readiness", "Audit Readiness", "Assemble durable evidence for operational decisions and change history.", "Governance", "clipboard-check", "Accountability"],
  ["policy-enforcement", "Policy Enforcement", "Apply organization rules consistently across production workflows.", "Governance", "gavel", "Consistency"],
  ["customer-journey-watch", "Customer Journey Watch", "Connect production signals to the customer journeys they can affect.", "Experience", "route", "Outcomes"],
  ["support-escalation", "Support Escalation", "Route complex customer-impacting issues to the right operational owner.", "Experience", "messages-square", "Responsiveness"],
  ["experience-recovery", "Experience Recovery", "Coordinate user-facing recovery paths while preserving evidence and boundaries.", "Experience", "sparkles", "Continuity"],
  ["service-request-intake", "Service Request Intake", "Turn service needs into traceable requests for production review.", "Experience", "inbox", "Momentum"],
  ["model-release-readiness", "Model Release Readiness", "Check model changes against production environment constraints before rollout.", "AI Operations", "brain-circuit", "Safety"],
  ["prompt-policy-control", "Prompt Policy Control", "Keep production prompt behavior aligned with approved operating policies.", "AI Operations", "file-check-2", "Governance"],
  ["agent-runtime-watch", "Agent Runtime Watch", "Monitor AI environment readiness and capability signals.", "AI Operations", "bot", "Reliability"],
  ["human-approval-routing", "Human Approval Routing", "Pause high-impact actions until an authorized operator reviews them.", "AI Operations", "user-round-check", "Safety"],
  ["cost-visibility", "Cost Visibility", "Make production resource usage easier to understand and act on.", "Optimization", "wallet-cards", "Leverage"],
  ["latency-optimization", "Latency Optimization", "Find practical opportunities to improve response time across workflows.", "Optimization", "gauge", "Speed"],
  ["automation-opportunity", "Automation Opportunity", "Identify repeatable production work that can be safely automated.", "Optimization", "wand-sparkles", "Scale"],
  ["outcome-reporting", "Outcome Reporting", "Translate operational activity into business-facing progress and results.", "Optimization", "presentation", "Value"],
  ["fallback-readiness", "Fallback Readiness", "Verify authorized fallback paths without claiming ownership of external infrastructure.", "Resilience", "layers-2", "Resilience"],
  ["dependency-awareness", "Dependency Awareness", "Keep optional external resources visible without making them core dependencies.", "Resilience", "network", "Independence"],
  ["recovery-evidence", "Recovery Evidence", "Confirm that recovery actions produced measurable, durable results.", "Resilience", "badge-check", "Proof"],
  ["production-command-center", "Production Command Center", "Bring environment health, solutions, and decisions into one operating view.", "Resilience", "panels-top-left", "Coordination"],
] as const;

async function ensureProductionData() {
  let [environment] = await db
    .select()
    .from(agentEnvironmentsTable)
    .where(eq(agentEnvironmentsTable.slug, "production"))
    .limit(1);

  if (!environment) {
    [environment] = await db
      .insert(agentEnvironmentsTable)
      .values({
        name: "Production AI Environment",
        slug: "production",
        description: "A standalone operating environment for reliable AI-powered production execution.",
        type: "production",
        status: "active",
        agentCount: 32,
        activeAgents: 0,
        agents: [],
      })
      .returning();
  } else {
    [environment] = await db
      .update(agentEnvironmentsTable)
      .set({
        name: "Production AI Environment",
        description: "Mission-critical agent deployment with full redundancy, zero-downtime rollouts, and enterprise SLA coverage. AI agents operate on hardened, PCI-compliant infrastructure.",
        type: "production",
        status: "active",
      })
      .where(eq(agentEnvironmentsTable.id, environment.id))
      .returning();
  }

  for (const [index, [slug, name, description, category, icon, impact]] of PRODUCTION_SOLUTIONS.entries()) {
    await db
      .insert(productionSolutionsTable)
      .values({
        slug,
        name,
        description,
        category,
        icon,
        impact,
        readiness: 92,
        status: "ready",
        displayOrder: index + 1,
      })
      .onConflictDoNothing({ target: productionSolutionsTable.slug });
  }

  return environment;
}

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
  await ensureProductionData();
  const environments = await db.select().from(agentEnvironmentsTable);
  res.json(ListAgentEnvironmentsResponse.parse(environments.map(mapEnv)));
});

router.get("/agents/runtime", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.json(GetAgentRuntimeStatusResponse.parse(getAgentRuntimeStatus()));
});

router.get("/agents/production", async (_req, res): Promise<void> => {
  const environment = await ensureProductionData();
  const solutions = await db
    .select()
    .from(productionSolutionsTable)
    .orderBy(asc(productionSolutionsTable.displayOrder));
  const categories = [...new Set(solutions.map((solution) => solution.category))];
  const readySolutions = solutions.filter((solution) => solution.status === "ready" || solution.status === "active").length;
  const averageReadiness = solutions.length > 0
    ? solutions.reduce((total, solution) => total + solution.readiness, 0) / solutions.length
    : 0;

  res.json(GetProductionEnvironmentDashboardResponse.parse({
    environment: mapEnv(environment),
    solutionCount: solutions.length,
    readySolutions,
    averageReadiness,
    categories,
    solutions: solutions.map((solution) => ({
      id: String(solution.id),
      slug: solution.slug,
      name: solution.name,
      description: solution.description,
      category: solution.category,
      status: solution.status as "ready" | "active" | "limited" | "planned",
      readiness: solution.readiness,
      impact: solution.impact,
      icon: solution.icon,
      displayOrder: solution.displayOrder,
    })),
  }));
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
