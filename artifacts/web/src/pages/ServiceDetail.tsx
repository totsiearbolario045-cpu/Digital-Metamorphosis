import { useParams, Link } from "wouter";
import { useGetServiceBySlug, getGetServiceBySlugQueryKey } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, MapPin, Building, Tag, FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function ServiceDetail() {
  const params = useParams();
  const slug = params.slug;

  const { data: service, isLoading, error } = useGetServiceBySlug(slug || "", {
    query: {
      enabled: !!slug,
      queryKey: getGetServiceBySlugQueryKey(slug || "")
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="w-24 h-6 mb-4" />
        <Skeleton className="w-2/3 h-12" />
        <Skeleton className="w-full h-40" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold font-mono mb-2 text-destructive">SERVICE NOT FOUND</h2>
        <p className="text-muted-foreground mb-6">The requested catalog item could not be retrieved.</p>
        <Link href="/categories">
          <button className="px-4 py-2 bg-primary text-primary-foreground font-mono text-sm rounded-sm">
            RETURN TO CATALOG
          </button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 pb-10"
    >
      <Link href="/categories">
        <div className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> BACK TO CATALOG
        </div>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {service.categoryName || 'GENERAL'}
            </span>
            <StatusBadge status={service.status} />
            {service.featured && (
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                FEATURED
              </span>
            )}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground" data-testid="service-title">{service.name}</h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-3xl">{service.description}</p>
        </div>
        <Link href={`/request?serviceId=${service.id}`}>
          <button className="px-6 py-3 bg-primary text-primary-foreground font-mono text-sm font-bold rounded-sm hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(0,255,255,0.2)] whitespace-nowrap" data-testid="request-service-btn">
            REQUEST SERVICE
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-card border border-border rounded-sm p-6">
            <h2 className="text-lg font-bold font-mono uppercase tracking-wider border-b border-border/50 pb-3 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Overview
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-foreground leading-relaxed">
                This enterprise-grade service provides highly available capabilities designed for mission-critical operations. 
                Delivered by {service.provider} in the {service.region} region, it guarantees strict SLAs and comprehensive compliance controls.
              </p>
              {service.metadata && Object.keys(service.metadata).length > 0 && (
                <div className="mt-6 border border-border/50 rounded bg-background/50 overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border/50 text-xs font-mono uppercase tracking-wider text-muted-foreground">Technical Specifications</div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(service.metadata).map(([key, value]) => (
                      <div key={key}>
                        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">{key}</div>
                        <div className="text-sm text-foreground font-mono">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="bg-card border border-border rounded-sm p-6">
            <h2 className="text-lg font-bold font-mono uppercase tracking-wider border-b border-border/50 pb-3 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> Capabilities & Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {service.tags && service.tags.length > 0 ? (
                service.tags.map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-background border border-border text-foreground text-xs uppercase font-mono tracking-wider rounded-sm">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No tags specified.</span>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-sm p-6">
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-muted-foreground mb-4">Pricing Model</h3>
            <div className="mb-4">
              <div className="text-3xl font-bold text-foreground font-mono tracking-tighter">{service.pricing || 'Custom'}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{service.pricingDetails || 'Contact sales for enterprise tiers'}</div>
            </div>
            <div className="bg-background border border-border rounded p-3 text-xs text-muted-foreground flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Volume discounts available for multi-region deployments. See terms for SLA credits.</span>
            </div>
          </section>

          <section className="bg-card border border-border rounded-sm p-6 space-y-4">
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-muted-foreground mb-4">Deployment Metadata</h3>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-background flex items-center justify-center border border-border shrink-0">
                <Building className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Provider</div>
                <div className="text-sm font-medium text-foreground">{service.provider}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-background flex items-center justify-center border border-border shrink-0">
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Region</div>
                <div className="text-sm font-medium text-foreground">{service.region}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-background flex items-center justify-center border border-border shrink-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Catalog Entry</div>
                <div className="text-sm font-medium text-foreground">{service.createdAt ? new Date(service.createdAt).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
