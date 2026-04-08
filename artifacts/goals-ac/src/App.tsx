import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setBaseUrl } from "@workspace/api-client-react";

import Home from "@/pages/home";
import RoadmapDetail from "@/pages/roadmap-detail";
import RoadmapDirectory from "@/pages/roadmap-directory";
import NotFound from "@/pages/not-found";

// Initialize API client base URL
// The generated hooks already include /api in their paths (from OpenAPI servers config)
// so we only need to set the base domain/path prefix (strip trailing slash)
setBaseUrl(import.meta.env.BASE_URL.replace(/\/$/, ""));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/roadmaps" component={RoadmapDirectory} />
      <Route path="/roadmap/:slug" component={RoadmapDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
