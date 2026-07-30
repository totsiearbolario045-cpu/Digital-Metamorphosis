import { Link, useLocation } from "wouter";
import { Search, Grid, Cloud, Bot, HelpCircle, FileText, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Catalog Home", icon: Grid },
    { href: "/categories", label: "Categories", icon: FileText },
    { href: "/cloud-components", label: "Cloud Components", icon: Cloud },
    { href: "/agents", label: "Agent Environments", icon: Bot },
    { href: "/operations", label: "Operations Console", icon: Radio },
    { href: "/about", label: "About Catalog", icon: HelpCircle },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b border-border">
        <Link href="/">
          <div className="font-mono font-bold tracking-tight text-xl text-primary cursor-pointer hover:opacity-80 transition-opacity" data-testid="sidebar-logo">
            DIGITAL<br />METAMORPHOSIS
          </div>
        </Link>
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search catalog..."
            className="w-full pl-9 bg-background border-border text-xs font-mono"
            data-testid="sidebar-search"
          />
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <div className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wider">Navigation</div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href || (link.href !== '/' && location.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <Link href="/request">
          <div className="w-full flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground font-mono text-sm font-medium rounded-sm cursor-pointer hover:bg-primary/90 transition-colors" data-testid="sidebar-request-btn">
            REQUEST SERVICE
          </div>
        </Link>
      </div>
    </aside>
  );
}
