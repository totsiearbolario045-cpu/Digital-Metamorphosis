import { useState } from "react";
import { useListCloudComponents } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Server, Activity, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function CloudComponents() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: components, isLoading } = useListCloudComponents({ search: searchQuery || undefined });

  return (
    <div className="flex flex-col gap-8 h-full pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase mb-2">Cloud Components</h1>
          <p className="text-muted-foreground max-w-2xl">Discover modular infrastructure components ready for deployment in your environments. Real-time telemetry and status monitoring.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter components..."
            className="w-full pl-9 bg-card border-border font-mono text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="components-search-input"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-sm" />)}
        </div>
      ) : components && components.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {components.map((component, i) => (
            <motion.div 
              key={component.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border hover:border-primary/50 transition-colors p-6 rounded-sm flex flex-col relative overflow-hidden group"
              data-testid={`cloud-component-${component.id}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-background border border-border flex items-center justify-center">
                    <Server className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground font-mono">{component.name}</h3>
                    <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{component.provider} &middot; {component.region}</div>
                  </div>
                </div>
                <StatusBadge status={component.status} />
              </div>
              
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2 relative z-10">{component.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-border/50 relative z-10">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">Uptime</div>
                    <div className="text-sm font-mono text-foreground">{component.uptime || '99.99%'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">Latency</div>
                    <div className="text-sm font-mono text-foreground">{component.latency || '< 10ms'}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-sm bg-card/50">
          <div className="text-muted-foreground font-mono text-lg mb-2">NO COMPONENTS FOUND</div>
          <p className="text-sm text-muted-foreground">Adjust your search parameters.</p>
        </div>
      )}
    </div>
  );
}
