import { getGetControlPlaneStatusQueryKey, useGetControlPlaneStatus } from "@workspace/api-client-react";
import type { ReactNode } from "react";
import { Activity, CheckCircle2, Clock3, Cpu, Database, HeartPulse, Radio, ShieldCheck, TriangleAlert, Workflow } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data, isLoading, isError } = useGetControlPlaneStatus({
    query: {
      queryKey: getGetControlPlaneStatusQueryKey(),
      refetchInterval: 15_000,
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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-sm" />)}
        </div>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard label="ONLINE WORKERS" value={`${data.onlineWorkerCount}/${data.workerCount}`} icon={<Cpu className="h-5 w-5 text-primary" />} />
            <MetricCard label="QUEUED JOBS" value={formatNumber(data.queuedJobs)} icon={<Clock3 className="h-5 w-5 text-amber-400" />} />
            <MetricCard label="COMPLETED / 24H" value={formatNumber(data.completedJobs24h)} icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} />
            <MetricCard label="TELEMETRY / 24H" value={formatNumber(data.telemetry24h)} icon={<Activity className="h-5 w-5 text-cyan-400" />} />
          </section>

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