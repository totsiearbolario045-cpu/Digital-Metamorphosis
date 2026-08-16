import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";
import Home from "@/pages/Home";
import Categories from "@/pages/Categories";
import ServiceDetail from "@/pages/ServiceDetail";
import CloudComponents from "@/pages/CloudComponents";
import Agents from "@/pages/Agents";
import Request from "@/pages/Request";
import About from "@/pages/About";
import Operations from "@/pages/Operations";
import ProductionEnvironment from "@/pages/ProductionEnvironment";
import { installBrowserReliabilityCapture } from "@/lib/browser-reliability";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/categories" component={Categories} />
        <Route path="/services/:slug" component={ServiceDetail} />
        <Route path="/cloud-components" component={CloudComponents} />
        <Route path="/agents" component={Agents} />
        <Route path="/agents/production" component={ProductionEnvironment} />
        <Route path="/operations" component={Operations} />
        <Route path="/request" component={Request} />
        <Route path="/about" component={About} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add("dark");
    installBrowserReliabilityCapture();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
