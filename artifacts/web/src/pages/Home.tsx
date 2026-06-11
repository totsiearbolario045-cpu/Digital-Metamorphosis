import { useGetCatalogStats, useGetFeaturedServices, useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Activity, Server, Layers, Cpu } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetCatalogStats();
  const { data: featured, isLoading: featuredLoading } = useGetFeaturedServices();
  const { data: categories, isLoading: categoriesLoading } = useListCategories();

  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-md border border-border bg-card p-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex-1 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              MISSION-CRITICAL <span className="text-primary">INFRASTRUCTURE</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl">
              A curated catalog of enterprise-grade cloud components, AI agent environments, and high-performance business services.
            </p>
            <div className="flex gap-4">
              <Link href="/categories">
                <button className="px-6 py-3 bg-primary text-primary-foreground font-mono text-sm font-medium rounded-sm hover:bg-primary/90 transition-colors flex items-center gap-2" data-testid="hero-explore-btn">
                  EXPLORE CATALOG <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Quick Stats Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 w-full md:w-auto grid grid-cols-2 gap-4"
        >
          {statsLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="w-32 h-24 rounded-sm" />)
          ) : stats && (
            <>
              <div className="bg-background/50 border border-border p-4 rounded-sm flex flex-col justify-center items-center text-center">
                <Activity className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl font-bold text-foreground font-mono">{stats.totalServices}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Services</span>
              </div>
              <div className="bg-background/50 border border-border p-4 rounded-sm flex flex-col justify-center items-center text-center">
                <Server className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl font-bold text-foreground font-mono">{stats.totalCloudComponents}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Cloud Comps</span>
              </div>
              <div className="bg-background/50 border border-border p-4 rounded-sm flex flex-col justify-center items-center text-center">
                <Cpu className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl font-bold text-foreground font-mono">{stats.totalAgentEnvironments}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Agent Envs</span>
              </div>
              <div className="bg-background/50 border border-border p-4 rounded-sm flex flex-col justify-center items-center text-center">
                <Layers className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl font-bold text-foreground font-mono">{stats.totalCategories}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Categories</span>
              </div>
            </>
          )}
        </motion.div>
      </section>

      {/* Featured Services */}
      <section>
        <div className="flex justify-between items-end mb-6 border-b border-border pb-2">
          <div>
            <h2 className="text-xl font-bold font-mono tracking-tight text-foreground uppercase">Featured Services</h2>
            <p className="text-sm text-muted-foreground">High-demand capabilities currently highlighted</p>
          </div>
        </div>

        {featuredLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-sm" />)}
          </div>
        ) : featured && featured.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="p-10 border border-border border-dashed rounded-sm flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground font-mono text-sm">No featured services found</p>
          </div>
        )}
      </section>

      {/* Category Grid */}
      <section>
        <div className="flex justify-between items-end mb-6 border-b border-border pb-2">
          <div>
            <h2 className="text-xl font-bold font-mono tracking-tight text-foreground uppercase">Browse by Category</h2>
            <p className="text-sm text-muted-foreground">Navigate domain-specific infrastructure</p>
          </div>
          <Link href="/categories">
            <span className="text-sm text-primary font-mono cursor-pointer hover:underline">VIEW ALL</span>
          </Link>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-sm" />)}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.slice(0, 8).map(category => (
              <Link key={category.id} href={`/categories?category=${category.id}`}>
                <div className="p-4 bg-card border border-border rounded-sm hover:border-primary/50 transition-colors cursor-pointer flex flex-col gap-2 group">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">{category.name}</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">{category.serviceCount}</span>
                  </div>
                  {category.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{category.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
