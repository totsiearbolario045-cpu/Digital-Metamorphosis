import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import { Shield, Zap, Globe, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export default function About() {
  const faqs = [
    {
      q: "What is the standard SLA for Catalog services?",
      a: "All active services maintain a minimum 99.99% uptime guarantee backed by financially significant SLAs. Custom deployments can be architected for 99.999% availability across multi-region active-active setups."
    },
    {
      q: "How are new services vetted before entering the catalog?",
      a: "Services undergo rigorous penetration testing, compliance auditing (SOC2, HIPAA, ISO27001), and load testing under simulated enterprise constraints before receiving 'Active' status."
    },
    {
      q: "Can I request custom cloud components not listed here?",
      a: "Yes. Use the Request Service portal to submit a custom requisition. Our infrastructure engineering team will evaluate the feasibility and provide an architectural proposal within 48 hours."
    },
    {
      q: "How do Agent Environments isolate data?",
      a: "Agent Environments operate in logically separated VPCs with dedicated encryption keys (BYOK supported). Communication between environments requires explicit mesh peering approvals."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-12 pb-10">
      <div className="text-center py-10 border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 blur-3xl pointer-events-none rounded-full transform -translate-y-1/2 scale-150" />
        <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-tight text-foreground mb-4 relative z-10">
          DIGITAL METAMORPHOSIS
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto relative z-10">
          The premier infrastructure marketplace for enterprises demanding uncompromising performance, security, and scalability.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold font-mono tracking-tight uppercase border-b border-border/50 pb-2 mb-6 text-foreground">Core Tenets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: Shield, title: "Zero Trust Architecture", desc: "Every component assumes hostile intent by default. Mutual TLS and identity-aware proxies standard." },
            { icon: Zap, title: "Deterministic Performance", desc: "Sub-millisecond tail latency guarantees. No noisy neighbors. Predictable compute scheduling." },
            { icon: Globe, title: "Global Persistence", desc: "Distributed state engines with strong consistency. Write locally, read globally within milliseconds." },
            { icon: Cpu, title: "Autonomous Operations", desc: "Self-healing control planes. Automated capacity bursting ahead of demand spikes." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-card border border-border rounded-sm"
            >
              <feature.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold text-lg font-mono mb-2 text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-card border border-border p-8 rounded-sm">
        <h2 className="text-2xl font-bold font-mono tracking-tight uppercase border-b border-border/50 pb-2 mb-6 text-foreground">Provisioning Protocol</h2>
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {[
            { step: "01", title: "Requisition", desc: "Submit constraints via the Catalog Portal." },
            { step: "02", title: "Architectural Review", desc: "Topology validation by site reliability engineers." },
            { step: "03", title: "Automated Deployment", desc: "Infrastructure-as-Code execution across target regions." },
            { step: "04", title: "Handover", desc: "Credentials, endpoint URLs, and SLAs delivered securely." }
          ].map((phase, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-8 h-8 rounded bg-background border border-primary text-primary font-mono text-xs font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                {phase.step}
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-sm border border-border bg-background group-hover:border-primary/50 transition-colors">
                <h4 className="font-bold font-mono text-foreground mb-1">{phase.title}</h4>
                <p className="text-sm text-muted-foreground">{phase.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold font-mono tracking-tight uppercase border-b border-border/50 pb-2 mb-6 text-foreground">Intelligence Briefing</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="font-mono text-left hover:text-primary transition-colors text-sm">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Require a capability not listed in the catalog?</p>
        <Link href="/request">
          <button className="px-6 py-3 border border-primary text-primary font-mono text-sm font-bold rounded-sm hover:bg-primary hover:text-primary-foreground transition-all">
            INITIATE CUSTOM REQUEST
          </button>
        </Link>
      </div>
    </div>
  );
}
