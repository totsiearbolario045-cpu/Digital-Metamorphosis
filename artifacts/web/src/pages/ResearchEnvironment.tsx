import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Beaker,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Gauge,
  Lightbulb,
  LockKeyhole,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  getGetResearchEnvironmentDashboardQueryKey,
  useGetResearchEnvironmentDashboard,
  type EnvironmentSolution,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, typeof Beaker> = {
  Discovery: Lightbulb,
  Experimentation: FlaskConical,
  "Model Science": BrainCircuit,
  "Data Intelligence": Network,
  "Knowledge Systems": Sparkles,
  Safety: ShieldCheck,
  "Research Operations": BarChart3,
  Outcomes: ArrowUpRight,
};

const categoryColors: Record<string, string> = {
  Discovery: "text-amber-300 border-amber-300/30 bg-amber-300/10",
  Experimentation: "text-violet-300 border-violet-300/30 bg-violet-300/10",
  "Model Science": "text-fuchsia-300 border-fuchsia-300/30 bg-fuchsia-300/10",
  "Data Intelligence": "text-cyan-300 border-cyan-300/30 bg-cyan-300/10",
  "Knowledge Systems": "text-blue-300 border-blue-300/30 bg-blue-300/10",
  Safety: "text-rose-300 border-rose-300/30 bg-rose-300/10",
  "Research Operations": "text-emerald-300 border-emerald-300/30 bg-emerald-300/10",
  Outcomes: "text-pink-300 border-pink-300/30 bg-pink-300/10",
};

function SolutionCard({ solution, selected, onSelect }: { solution: EnvironmentSolution; selected: boolean; onSelect: () => void }) {
  const Icon = categoryIcons[solution.category] ?? Beaker;
  const color = categoryColors[solution.category] ?? "text-primary border-primary/30 bg-primary/10";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex min-h-[218px] flex-col justify-between rounded-sm border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50",
        selected ? "border-primary/70 ring-1 ring-primary/30" : "border-border",
      )}
      data-testid={`research-solution-${solution.slug}`}
    >
      <div>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className={cn("rounded-sm border p-2.5", color)}><Icon className="h-4 w-4" /></div>
          <span className="flex items-center gap-1 rounded border border-emerald-400/25 bg-emerald-400/5 px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> {solution.status}
          </span>
        </div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="font-mono text-sm font-bold uppercase leading-tight text-foreground">{solution.name}</h3>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{solution.description}</p>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
          <span className={cn("rounded border px-1.5 py-0.5", color)}>{solution.category}</span>
          <span className="text-foreground">{solution.readiness}% ready</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${solution.readiness}%` }} /></div>
      </div>
    </button>
  );
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Gauge }) {
  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between"><span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div>
      <div className="font-mono text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

export default function ResearchEnvironment() {
  const { data, isLoading, isError } = useGetResearchEnvironmentDashboard({
    query: { queryKey: getGetResearchEnvironmentDashboardQueryKey(), refetchInterval: 30_000 },
  });
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EnvironmentSolution | null>(null);

  const solutions = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return data.solutions.filter((solution) => (
      (category === "All" || solution.category === category)
      && (!query || `${solution.name} ${solution.description} ${solution.category}`.toLowerCase().includes(query))
    ));
  }, [category, data, search]);

  if (isLoading) {
    return <div className="flex flex-col gap-6 pb-10"><Skeleton className="h-56 rounded-sm" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-sm" />)}</div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-sm" />)}</div></div>;
  }

  if (isError || !data) {
    return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 border border-dashed border-border bg-card/40 text-center"><LockKeyhole className="h-6 w-6 text-rose-300" /><h1 className="font-mono text-lg uppercase text-foreground">Research Environment Unavailable</h1><p className="max-w-md text-sm text-muted-foreground">The research micro-dashboard could not load its database-backed environment data.</p></div>;
  }

  return (
    <div className="flex flex-col gap-7 pb-12">
      <section className="relative overflow-hidden rounded-sm border border-primary/30 bg-card p-7 md:p-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-400/10 blur-[100px]" />
        <div className="relative z-10">
          <Link href="/agents"><span className="mb-6 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> All AI Environments</span></Link>
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-primary">
                <span className="inline-flex items-center gap-1.5 rounded border border-primary/30 bg-primary/10 px-2 py-1"><Beaker className="h-3.5 w-3.5" /> Standalone micro-dashboard</span>
                <span className="inline-flex items-center gap-1.5 rounded border border-violet-300/30 bg-violet-300/10 px-2 py-1 text-violet-200"><BrainCircuit className="h-3.5 w-3.5" /> Research</span>
              </div>
              <h1 className="text-3xl font-bold uppercase tracking-tight text-foreground md:text-5xl">Research AI Environment</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">A focused research environment for model science, experimentation, evidence, and responsible discovery. Explore methods that move ideas into measurable outcomes.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-sm border border-violet-300/30 bg-violet-300/5 px-4 py-3 text-xs font-mono uppercase text-violet-200"><span className="h-2 w-2 animate-pulse rounded-full bg-violet-300" /> Environment {data.environment.status}</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Specialized solutions" value={String(data.solutionCount)} detail="Research capabilities" icon={Beaker} />
        <Stat label="Ready now" value={String(data.readySolutions)} detail="Research modules" icon={CheckCircle2} />
        <Stat label="Average readiness" value={`${Math.round(data.averageReadiness)}%`} detail="Across all solutions" icon={Gauge} />
        <Stat label="Active agents" value={`${data.environment.activeAgents}/${data.environment.agentCount}`} detail="Environment capacity" icon={Zap} />
      </section>

      <section className="rounded-sm border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="font-mono text-lg font-bold uppercase text-foreground">32 Research Solutions</h2></div><p className="mt-1 text-xs text-muted-foreground">Specialized capabilities for discovery, experimentation, model science, and responsible AI research.</p></div>
          <div className="relative w-full lg:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search research..." className="h-9 w-full rounded-sm border border-border bg-background pl-9 pr-3 text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" aria-label="Search Research solutions" /></div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{["All", ...data.categories].map((item) => <Button key={item} type="button" size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)} className="shrink-0 text-[10px] font-mono uppercase">{item}</Button>)}</div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{solutions.map((solution) => <SolutionCard key={solution.id} solution={solution} selected={selected?.id === solution.id} onSelect={() => setSelected(solution)} />)}</section>
      {solutions.length === 0 && <div className="border border-dashed border-border py-16 text-center"><Search className="mx-auto mb-3 h-5 w-5 text-muted-foreground" /><div className="font-mono text-sm uppercase text-muted-foreground">No research solutions match this view</div></div>}
      {selected && <section className="rounded-sm border border-primary/30 bg-primary/5 p-5 md:p-6"><div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><div className="mb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Selected capability</div><h2 className="text-xl font-bold uppercase text-foreground">{selected.name}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{selected.description}</p></div><div className="flex shrink-0 flex-col gap-2 text-right text-xs font-mono uppercase"><span className="text-emerald-300">{selected.readiness}% readiness</span><span className="text-muted-foreground">Expected impact: {selected.impact}</span></div></div></section>}
    </div>
  );
}