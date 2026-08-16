import { useListAgentEnvironments } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Bot, Network, Workflow, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";

export default function Agents() {
  const { data: environments, isLoading } = useListAgentEnvironments();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'production': return <Zap className="w-5 h-5 text-amber-500" />;
      case 'devops': return <Workflow className="w-5 h-5 text-blue-500" />;
      case 'research': return <Network className="w-5 h-5 text-purple-500" />;
      default: return <Bot className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase mb-2">AI Agent Environments</h1>
        <p className="text-muted-foreground max-w-2xl">Isolated execution contexts for autonomous and supervised AI agents. Monitor active instances, deployment types, and system status across your organization.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-sm" />)}
        </div>
      ) : environments && environments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {environments.map((env, i) => (
            <motion.div 
              key={env.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border p-0 rounded-sm flex flex-col relative group"
              data-testid={`agent-env-${env.id}`}
            >
              <div className="p-6 border-b border-border/50">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-background border border-border flex items-center justify-center">
                      {getTypeIcon(env.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground font-mono flex items-center gap-2">
                        {env.name}
                        <span className="text-[10px] px-2 py-0.5 rounded border border-border bg-background text-muted-foreground uppercase">{env.type}</span>
                      </h3>
                    </div>
                  </div>
                  <StatusBadge status={env.status} />
                </div>
                <p className="text-sm text-muted-foreground">{env.description}</p>
              </div>
              
              <div className="p-6 bg-background/50 grid grid-cols-2 gap-4">
                <div className="p-4 bg-card border border-border rounded-sm flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-mono font-bold text-foreground mb-1">{env.activeAgents}</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Active Agents</span>
                </div>
                <div className="p-4 bg-card border border-border rounded-sm flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-mono font-bold text-foreground mb-1">{env.agentCount}</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Total Capacity</span>
                </div>
              </div>

              {env.agents && env.agents.length > 0 && (
                <div className="px-6 py-4 border-t border-border/50">
                  <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Active Instances</div>
                  <div className="space-y-2">
                    {env.agents.slice(0, 3).map(agent => (
                      <div key={agent.id} className="flex justify-between items-center text-sm p-2 rounded bg-background border border-border/50">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <Bot className="w-3 h-3 text-primary" />
                          <span className="text-foreground">{agent.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 border border-border rounded text-muted-foreground">{agent.model}</span>
                          <span className="flex items-center gap-1 text-[10px] text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {agent.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {env.agents.length > 3 && (
                      <div className="text-center text-xs font-mono text-muted-foreground pt-2">
                        + {env.agents.length - 3} more instances
                      </div>
                    )}
                  </div>
                </div>
              )}
              {env.slug === "production" && (
                <div className="mt-auto border-t border-border/50 p-4">
                  <Link href="/agents/production">
                    <div className="flex cursor-pointer items-center justify-between rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-xs font-mono uppercase tracking-wider text-primary transition-colors hover:bg-primary/10">
                      Open Production micro-dashboard
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-sm bg-card/50">
          <div className="text-muted-foreground font-mono text-lg mb-2">NO ENVIRONMENTS DETECTED</div>
        </div>
      )}
    </div>
  );
}
