import { Link } from "wouter";
import { Service } from "@workspace/api-client-react/src/generated/api.schemas";
import { StatusBadge } from "./StatusBadge";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col p-5 bg-card border border-border rounded-sm hover:border-primary/50 transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.05)] cursor-pointer relative overflow-hidden"
      data-testid={`service-card-${service.id}`}
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-sans font-bold text-lg text-foreground group-hover:text-primary transition-colors">{service.name}</h3>
        <StatusBadge status={service.status} />
      </div>
      
      <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">{service.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {service.tags?.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-1 bg-muted/50 text-muted-foreground text-[10px] uppercase font-mono tracking-wider rounded border border-border">
            {tag}
          </span>
        ))}
      </div>
      
      <div className="flex justify-between items-end mt-auto pt-4 border-t border-border/50">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Provider / Region</span>
          <span className="text-xs font-medium text-foreground">{service.provider} &middot; {service.region}</span>
        </div>
        
        <Link href={`/services/${service.slug}`}>
          <div className="flex items-center gap-1 text-xs font-mono text-primary hover:text-primary/80 transition-colors" data-testid={`view-service-${service.id}`}>
            VIEW DETAILS <ChevronRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
