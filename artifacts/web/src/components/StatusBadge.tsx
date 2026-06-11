import { cn } from "@/lib/utils";

type Status = "active" | "inactive" | "maintenance" | "deprecated" | "pending" | "in_review" | "approved" | "rejected";

interface StatusBadgeProps {
  status: Status | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "active":
      case "approved":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "maintenance":
      case "in_review":
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "deprecated":
      case "rejected":
      case "inactive":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border",
        getStatusColor(status),
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      <span className="uppercase tracking-wider">{status}</span>
    </span>
  );
}
