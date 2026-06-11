import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useListCategories, useListServices } from "@workspace/api-client-react";
import { ServiceCard } from "@/components/ServiceCard";
import { Input } from "@/components/ui/input";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Categories() {
  const [searchParams] = useLocation();
  const urlCategory = new URLSearchParams(window.location.search).get("category");
  
  const [activeCategory, setActiveCategory] = useState<string | undefined>(urlCategory || undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data: categories, isLoading: categoriesLoading } = useListCategories();
  
  // Use debounced search value in a real app, but for this task we can just pass it directly if we want
  const { data: services, isLoading: servicesLoading } = useListServices({
    category: activeCategory,
    search: searchQuery || undefined,
    status: statusFilter
  });

  return (
    <div className="flex flex-col gap-8 h-full">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase mb-2">Category Explorer</h1>
        <p className="text-muted-foreground">Browse, filter, and discover services across all domains.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start h-full pb-8">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6 sticky top-0">
          <div className="space-y-3">
            <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filter
            </h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                className="pl-9 bg-card border-border font-mono text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="category-search-input"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Categories
            </h3>
            <div className="flex flex-col gap-1">
              <button
                className={`text-left px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                  !activeCategory ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setActiveCategory(undefined)}
                data-testid="filter-cat-all"
              >
                All Categories
              </button>
              {categoriesLoading ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-sm" />)
              ) : categories?.map(cat => (
                <button
                  key={cat.id}
                  className={`text-left px-3 py-2 rounded-sm text-sm font-medium transition-colors flex justify-between items-center ${
                    activeCategory === cat.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setActiveCategory(cat.id)}
                  data-testid={`filter-cat-${cat.id}`}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-background border border-border rounded font-mono">{cat.serviceCount}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Status</h3>
            <div className="flex flex-wrap gap-2">
              {['active', 'maintenance', 'deprecated'].map(status => (
                <button
                  key={status}
                  className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border rounded-sm transition-colors ${
                    statusFilter === status 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                  onClick={() => setStatusFilter(statusFilter === status ? undefined : status)}
                  data-testid={`filter-status-${status}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1 w-full">
          <div className="mb-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground font-mono">
              {servicesLoading ? "LOADING..." : `SHOWING ${services?.length || 0} RESULTS`}
            </div>
          </div>

          {servicesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-sm" />)}
            </div>
          ) : services && services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {services.map(service => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-sm bg-card/50">
              <div className="text-muted-foreground font-mono text-lg mb-2">NO SERVICES FOUND</div>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              <button 
                className="mt-4 px-4 py-2 border border-border text-foreground hover:bg-muted text-sm font-mono rounded-sm transition-colors"
                onClick={() => { setActiveCategory(undefined); setSearchQuery(""); setStatusFilter(undefined); }}
              >
                CLEAR ALL FILTERS
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
