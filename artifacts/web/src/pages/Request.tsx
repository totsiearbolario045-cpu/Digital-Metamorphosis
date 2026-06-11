import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSubmitServiceRequest, useListServices } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Terminal } from "lucide-react";
import { motion } from "framer-motion";

const requestSchema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().min(2, "Service name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
  organization: z.string().min(2, "Organization name is required"),
  notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function Request() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedServiceId = searchParams.get("serviceId");

  const { data: services, isLoading: servicesLoading } = useListServices();
  const submitMutation = useSubmitServiceRequest();
  
  const [isSubmitted, setIsSubmitted] = useState(false);

  const preselectedService = services?.find(s => s.id === preselectedServiceId);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      serviceId: preselectedServiceId || "",
      serviceName: preselectedService?.name || "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      organization: "",
      notes: "",
    },
  });

  const onSubmit = (data: RequestFormValues) => {
    // If a serviceId was selected, ensure serviceName matches for the API
    const selectedService = services?.find(s => s.id === data.serviceId);
    if (selectedService) {
      data.serviceName = selectedService.name;
    }

    submitMutation.mutate({ data }, {
      onSuccess: () => {
        setIsSubmitted(true);
        toast({
          title: "REQUEST TRANSMITTED",
          description: "Your service request has been logged and is pending review.",
        });
      },
      onError: (error) => {
        toast({
          title: "TRANSMISSION FAILED",
          description: error.message || "An error occurred while submitting the request.",
          variant: "destructive",
        });
      }
    });
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto h-full flex flex-col justify-center items-center py-20">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border p-10 rounded-sm text-center w-full shadow-[0_0_30px_rgba(0,255,255,0.05)]"
        >
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-foreground mb-4">TRANSMISSION COMPLETE</h2>
          <p className="text-muted-foreground mb-8">
            Your service request has been successfully queued. A deployment specialist will contact your organization shortly to coordinate provisioning.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => setLocation("/")}
              className="px-6 py-2 border border-border text-foreground hover:bg-muted font-mono text-sm rounded-sm transition-colors"
            >
              RETURN TO CATALOG
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full pb-10">
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase mb-2 flex items-center gap-3">
          <Terminal className="w-8 h-8 text-primary" /> Service Requisition
        </h1>
        <p className="text-muted-foreground">Submit a formal request for infrastructure provisioning or custom service deployment.</p>
      </div>

      <div className="bg-card border border-border rounded-sm p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 md:col-span-2">
                <div className="text-sm font-bold font-mono uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Target Resource</div>
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs text-foreground">Service Selection</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          field.onChange(val);
                          const s = services?.find(s => s.id === val);
                          if(s) form.setValue('serviceName', s.name);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background border-border font-mono text-sm rounded-sm">
                            <SelectValue placeholder="Select a catalog service (Optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border rounded-sm">
                          <SelectItem value="custom" className="font-mono text-sm font-bold text-primary">Custom / Not Listed</SelectItem>
                          {!servicesLoading && services?.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="font-mono text-sm">{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                {form.watch("serviceId") === "custom" && (
                  <FormField
                    control={form.control}
                    name="serviceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-foreground">Custom Service Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Describe the capability needed" className="bg-background border-border font-mono text-sm rounded-sm" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="space-y-4 md:col-span-2 mt-4">
                <div className="text-sm font-bold font-mono uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Organizational Identity</div>
              </div>

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-mono text-xs text-foreground">Organization Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corp" className="bg-background border-border font-mono text-sm rounded-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs text-foreground">Point of Contact *</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" className="bg-background border-border font-mono text-sm rounded-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs text-foreground">Secure Comm Channel (Email) *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="name@organization.com" className="bg-background border-border font-mono text-sm rounded-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 mt-4">
                    <FormLabel className="font-mono text-xs text-foreground">Deployment Notes & Requirements</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Specify SLAs, compliance needs, or integration requirements..." 
                        className="bg-background border-border font-mono text-sm rounded-sm min-h-[120px] resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-6 border-t border-border/50 flex justify-end">
              <button 
                type="submit" 
                disabled={submitMutation.isPending}
                className="px-8 py-3 bg-primary text-primary-foreground font-mono text-sm font-bold rounded-sm hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,255,0.2)]"
                data-testid="submit-request-btn"
              >
                {submitMutation.isPending ? "TRANSMITTING..." : "INITIALIZE DEPLOYMENT REQUEST"}
                {!submitMutation.isPending && <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
