import { 
  getGetControlPlaneStatusQueryKey, 
  useGetControlPlaneStatus,
  useGetReliabilityOverview,
  getGetReliabilityOverviewQueryKey,
  useApproveReliabilityRunbook,
  useRunReliabilitySyntheticTest,
  type ReliabilityIncident
} from "@workspace/api-client-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Cpu, Database, HeartPulse, Play, Radio, ShieldCheck, ShieldAlert, TriangleAlert, Workflow, Zap, AlertCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDate(value?: string) {
  if (!value) return "No events recorded";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export default function Operations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data, isLoading, isError } = useGetControlPlaneStatus({
    query: {
      queryKey: getGetControlPlaneStatusQueryKey(),
      refetchInterval: 15_000,
    },
  });

  const { data: reliabilityData, isLoading: isReliabilityLoading, isError: isReliabilityError } = useGetReliabilityOverview({
    query: {
      queryKey: getGetReliabilityOverviewQueryKey(),
      refetchInterval: 20_000,
    },
  });

  const statusLabel = data?.status === "operational"
    ? "OPERATIONAL"
    : data?.status === "degraded"
      ? "DEGRADED"
      : "OFFLINE";
  const statusClass = data?.status === "operational"
    ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
    : data?.status === "degraded"
      ? "text-amber-400 border-amber-400/30 bg-amber-400/10"
      : "text-rose-400 border-rose-400/30 bg-rose-400/10";

  return (
    <div className="flex flex-col gap-8 pb-10">
      <section className="relative overflow-hidden rounded-md border border-primary/30 bg-card p-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-[90px]" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-primary">
              <Radio className="h-4 w-4" /> Internal control plane
            </div>
            <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase md:text-4xl">
              Operations Console
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              DIGITAL METAMORPHOSIS runs its own worker, job, and telemetry layer. External hyperscalers are optional targets—not dependencies.
            </p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-sm border px-3 py-2 text-xs font-mono tracking-wider ${statusClass}`}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
            {isLoading ? "CHECKING" : isError ? "UNAVAILABLE" : statusLabel}
          </div>
        </div>
      </section>

      {isLoading || isReliabilityLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-sm" />)}
        </div>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard label="ONLINE WORKERS" value={`${data.onlineWorkerCount}/${data.workerCount}`} icon={<Cpu className="h-5 w-5 text-primary" />} />
            <MetricCard label="QUEUED JOBS" value={formatNumber(data.queuedJobs)} icon={<Clock3 className="h-5 w-5 text-amber-400" />} />
            <MetricCard label="COMPLETED / 24H" value={formatNumber(data.completedJobs24h)} icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} />
            <MetricCard label="TELEMETRY / 24H" value={formatNumber(data.telemetry24h)} icon={<Activity className="h-5 w-5 text-cyan-400" />} />
          </section>

          {reliabilityData && (
            <>
              <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <MetricCard label="ACTIVE INCIDENTS" value={formatNumber(reliabilityData.activeIncidents)} icon={<AlertTriangle className="h-5 w-5 text-rose-400" />} />
              <MetricCard label="RECOVERING" value={formatNumber(reliabilityData.recoveringIncidents)} icon={<Zap className="h-5 w-5 text-amber-400" />} />
              <MetricCard label="RECOVERY RATE / 24H" value={`${Math.round(reliabilityData.recoveryRate24h)}%`} icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />} />
              <MetricCard label="PENDING APPROVALS" value={formatNumber(reliabilityData.pendingApprovals)} icon={<ShieldAlert className="h-5 w-5 text-cyan-400" />} />
              </section>
              <div className={`flex items-center gap-2 rounded-sm border px-4 py-3 text-xs font-mono uppercase tracking-wider ${reliabilityData.approvalMode === "configured" ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-400" : "border-amber-400/30 bg-amber-400/5 text-amber-400"}`}>
                {reliabilityData.approvalMode === "configured" ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                {reliabilityData.approvalMode === "configured"
                  ? "Operator approval capability configured"
                  : "Operator approval locked — high-impact recovery remains deny-by-default"}
              </div>
            </>
          )}

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-sm border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-5">
                <div>
                  <h2 className="font-mono text-lg font-bold uppercase text-foreground">Worker Fleet</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Authenticated internal execution nodes</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-3 p-5">
                {data.workers.length > 0 ? data.workers.map((worker) => (
                  <div key={worker.id} className="flex flex-col gap-3 rounded-sm border border-border bg-background/60 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-sm border border-primary/30 bg-primary/10 p-2">
                        <HeartPulse className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{worker.name}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{worker.workerId}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {worker.capabilities.map((capability) => (
                        <span key={capability} className="rounded border border-border px-2 py-1 text-[10px] font-mono text-muted-foreground">{capability}</span>
                      ))}
                      <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase ${worker.status === "online" ? "border-emerald-400/30 text-emerald-400" : "border-amber-400/30 text-amber-400"}`}>
                        {worker.status}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center gap-2 border border-dashed border-border py-12 text-center">
                    <TriangleAlert className="h-5 w-5 text-amber-400" />
                    <div className="font-mono text-sm text-muted-foreground">NO WORKERS REGISTERED</div>
                    <div className="text-xs text-muted-foreground">The internal worker secret is not configured or the worker has not started.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-sm border border-border bg-card">
              <div className="border-b border-border p-5">
                <h2 className="font-mono text-lg font-bold uppercase text-foreground">Control Plane Signals</h2>
                <p className="mt-1 text-xs text-muted-foreground">Safe operational metadata only</p>
              </div>
              <div className="space-y-4 p-5">
                <SignalRow label="Running jobs" value={formatNumber(data.runningJobs)} icon={<Workflow className="h-4 w-4 text-primary" />} />
                <SignalRow label="Failed jobs / 24h" value={formatNumber(data.failedJobs24h)} icon={<TriangleAlert className="h-4 w-4 text-amber-400" />} />
                <SignalRow label="Last telemetry event" value={formatDate(data.lastEventAt)} icon={<Activity className="h-4 w-4 text-cyan-400" />} />
                <SignalRow label="Operating model" value="Provider-independent" icon={<Database className="h-4 w-4 text-emerald-400" />} />
              </div>
            </div>
          </section>

          {reliabilityData && (
            <>
              <section className="rounded-sm border border-border bg-card">
                <div className="border-b border-border p-5">
                  <h2 className="font-mono text-lg font-bold uppercase text-foreground">Browser Reliability Incidents</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Grouped errors, network failures, and autonomous recovery actions</p>
                </div>
                <div className="space-y-2 p-5">
                  {reliabilityData.incidents.length > 0 ? (
                    reliabilityData.incidents.map((incident) => (
                      <IncidentCard key={incident.id} incident={incident} approvalEnabled={reliabilityData.operatorApprovalConfigured} />
                    ))
                  ) : (
                    <div className="flex flex-col items-center gap-2 border border-dashed border-border py-12 text-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <div className="font-mono text-sm text-muted-foreground">NO ACTIVE INCIDENTS</div>
                      <div className="text-xs text-muted-foreground">All browser reliability metrics within normal parameters.</div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-sm border border-border bg-card">
                <div className="border-b border-border p-5">
                  <h2 className="font-mono text-lg font-bold uppercase text-foreground">Synthetic Tests</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Autonomous browser scenario validation and recovery verification</p>
                </div>
                <div className="space-y-3 p-5">
                  {reliabilityData.syntheticTests.length > 0 ? (
                    reliabilityData.syntheticTests.map((test) => (
                      <SyntheticTestCard key={test.id} test={test} />
                    ))
                  ) : (
                    <div className="flex flex-col items-center gap-2 border border-dashed border-border py-12 text-center">
                      <Activity className="h-5 w-5 text-muted-foreground" />
                      <div className="font-mono text-sm text-muted-foreground">NO TESTS CONFIGURED</div>
                      <div className="text-xs text-muted-foreground">Synthetic tests are not yet scheduled.</div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center border border-dashed border-border bg-card/50 py-20 text-center">
          <TriangleAlert className="mb-3 h-6 w-6 text-amber-400" />
          <div className="font-mono text-lg text-muted-foreground">CONTROL PLANE STATUS UNAVAILABLE</div>
          <p className="mt-2 text-sm text-muted-foreground">The API did not return an operational status.</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-sm border border-border bg-card p-5">
      <div className="rounded-sm border border-border bg-background p-3">{icon}</div>
      <div>
        <div className="font-mono text-2xl font-bold text-foreground">{value}</div>
        <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function SignalRow({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      <div className="max-w-[55%] text-right font-mono text-xs text-foreground">{value}</div>
    </div>
  );
}

function IncidentCard({ incident, approvalEnabled }: { incident: ReliabilityIncident; approvalEnabled: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const approveRunbook = useApproveReliabilityRunbook();
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);

  const severityConfig = {
    critical: { color: "text-rose-400", borderColor: "border-rose-400/30", bgColor: "bg-rose-400/10", icon: <XCircle className="h-4 w-4" /> },
    warning: { color: "text-amber-400", borderColor: "border-amber-400/30", bgColor: "bg-amber-400/10", icon: <AlertTriangle className="h-4 w-4" /> },
    info: { color: "text-cyan-400", borderColor: "border-cyan-400/30", bgColor: "bg-cyan-400/10", icon: <AlertCircle className="h-4 w-4" /> },
  };

  const statusConfig = {
    open: { color: "text-rose-400", label: "OPEN" },
    recovering: { color: "text-amber-400", label: "RECOVERING" },
    recovered: { color: "text-emerald-400", label: "RECOVERED" },
    awaiting_approval: { color: "text-cyan-400", label: "AWAITING APPROVAL" },
    ignored: { color: "text-muted-foreground", label: "IGNORED" },
  };

  const recoveryConfig = {
    none: { color: "text-muted-foreground", label: "NONE" },
    queued: { color: "text-cyan-400", label: "QUEUED" },
    running: { color: "text-amber-400", label: "RUNNING" },
    completed: { color: "text-emerald-400", label: "COMPLETED" },
    awaiting_approval: { color: "text-cyan-400", label: "AWAITING APPROVAL" },
    failed: { color: "text-rose-400", label: "FAILED" },
  };

  const severity = severityConfig[incident.severity];
  const status = statusConfig[incident.status];
  const recovery = recoveryConfig[incident.recoveryStatus];

  const handleApproval = async (decision: "approve" | "reject") => {
    setPendingAction(decision);
    approveRunbook.mutate(
      { id: incident.id, data: { decision, reviewedBy: "Operations Console" } },
      {
        onSuccess: () => {
          toast({
            title: decision === "approve" ? "Runbook approved" : "Runbook rejected",
            description: `${incident.title} recovery action ${decision}d.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetReliabilityOverviewQueryKey() });
          setPendingAction(null);
        },
        onError: () => {
          toast({
            title: "Action failed",
            description: "Could not process the approval decision.",
            variant: "destructive",
          });
          setPendingAction(null);
        },
      }
    );
  };

  return (
    <div className="rounded-sm border border-border bg-background/60 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-0.5 rounded-sm border ${severity.borderColor} ${severity.bgColor} p-2`}>
            {severity.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-medium text-foreground">{incident.title}</span>
              <span className="rounded border border-border px-2 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">{incident.category}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">{incident.latestMessage}</div>
            {incident.route && (
              <div className="font-mono text-[10px] text-muted-foreground mb-2">Route: {incident.route}</div>
            )}
            <div className="flex flex-wrap gap-3 text-[10px] font-mono uppercase">
              <span className="text-muted-foreground">Occurrences: {formatNumber(incident.occurrenceCount)}</span>
              <span className="text-muted-foreground">Recovered: {formatNumber(incident.recoveredCount)}</span>
              <span className="text-muted-foreground">First: {formatDate(incident.firstSeenAt)}</span>
            </div>
            {incident.activeRunbook && (
              <div className="mt-2 font-mono text-[10px] text-primary">Active Runbook: {incident.activeRunbook}</div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase ${status.color} border-current/30`}>
            {status.label}
          </span>
          <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase ${recovery.color} border-current/30`}>
            Recovery: {recovery.label}
          </span>
          {incident.recoveryStatus === "awaiting_approval" && approvalEnabled && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApproval("approve")}
                disabled={approveRunbook.isPending}
                className="h-7 px-2 text-[10px] font-mono uppercase border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10"
              >
                {pendingAction === "approve" ? "..." : "APPROVE"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApproval("reject")}
                disabled={approveRunbook.isPending}
                className="h-7 px-2 text-[10px] font-mono uppercase border-rose-400/30 text-rose-400 hover:bg-rose-400/10"
              >
                {pendingAction === "reject" ? "..." : "REJECT"}
              </Button>
            </div>
          )}
          {incident.recoveryStatus === "awaiting_approval" && !approvalEnabled && (
            <div className="mt-2 max-w-[220px] text-right text-[10px] font-mono uppercase text-amber-400">
              Approval controls locked
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SyntheticTestCard({ test }: { test: { id: string; name: string; scenario: string; target: string; status: string; totalRuns: number; passedRuns: number; recoveredRuns: number; recoveryRate: number; lastRunAt?: string } }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const runTest = useRunReliabilitySyntheticTest();

  const statusConfig = {
    queued: { color: "text-cyan-400", icon: <Clock3 className="h-4 w-4" /> },
    running: { color: "text-amber-400", icon: <Activity className="h-4 w-4" /> },
    passed: { color: "text-emerald-400", icon: <CheckCircle2 className="h-4 w-4" /> },
    failed: { color: "text-rose-400", icon: <XCircle className="h-4 w-4" /> },
  };

  const config = statusConfig[test.status as keyof typeof statusConfig] || statusConfig.queued;

  const handleRun = () => {
    runTest.mutate(
      { id: test.id, data: { requestedBy: "Operations Console" } },
      {
        onSuccess: () => {
          toast({
            title: "Test queued",
            description: `${test.name} has been queued for execution.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetReliabilityOverviewQueryKey() });
        },
        onError: () => {
          toast({
            title: "Test failed to queue",
            description: "Could not queue the synthetic test.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="rounded-sm border border-border bg-background/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-0.5 rounded-sm border ${config.color} border-current/30 bg-current/10 p-2`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground mb-1">{test.name}</div>
            <div className="text-xs text-muted-foreground mb-2">{test.scenario}</div>
            <div className="font-mono text-[10px] text-muted-foreground mb-2">Target: {test.target}</div>
            <div className="flex flex-wrap gap-3 text-[10px] font-mono uppercase">
              <span className="text-muted-foreground">Runs: {formatNumber(test.totalRuns)}</span>
              <span className="text-emerald-400">Passed: {formatNumber(test.passedRuns)}</span>
              <span className="text-amber-400">Recovered: {formatNumber(test.recoveredRuns)}</span>
              <span className="text-primary">Recovery: {Math.round(test.recoveryRate)}%</span>
            </div>
            {test.lastRunAt && (
              <div className="mt-2 font-mono text-[10px] text-muted-foreground">Last run: {formatDate(test.lastRunAt)}</div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase ${config.color} border-current/30`}>
            {test.status}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRun}
            disabled={runTest.isPending || test.status === "running"}
            className="h-7 px-2 text-[10px] font-mono uppercase border-primary/30 text-primary hover:bg-primary/10"
          >
            {runTest.isPending ? "..." : <><Play className="h-3 w-3 mr-1" />RUN</>}
          </Button>
        </div>
      </div>
    </div>
  );
}