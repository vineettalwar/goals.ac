import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setBaseUrl } from "@workspace/api-client-react";

import Home from "@/pages/home";
import RoadmapDetail from "@/pages/roadmap-detail";
import RoadmapDirectory from "@/pages/roadmap-directory";
import ContentStrategy from "@/pages/content-strategy";
import AdminContentStrategies from "@/pages/admin/content-strategies";
import NotFound from "@/pages/not-found";

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/roadmaps" element={<RoadmapDirectory />} />
            <Route path="/roadmap/:slug" element={<RoadmapDetail />} />
            <Route path="/content-strategy/:id" element={<ContentStrategy />} />
            <Route path="/admin/content-strategies" element={<AdminContentStrategies />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
