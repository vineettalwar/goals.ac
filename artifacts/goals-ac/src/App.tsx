import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setBaseUrl } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "@/context/auth";
import { ActiveProjectProvider } from "@/context/active-project";
import type { ReactNode } from "react";

import Home from "@/pages/home";
import RoadmapDetail from "@/pages/roadmap-detail";
import RoadmapDirectory from "@/pages/roadmap-directory";
import ContentStrategy from "@/pages/content-strategy";
import AdminContentStrategies from "@/pages/admin/content-strategies";
import SeoArticle from "@/pages/seo-article";
import GeoAuditForm from "@/pages/geo-audit-form";
import GeoAuditDetail from "@/pages/geo-audit";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import ProjectDetail from "@/pages/project-detail";
import ContentStudio from "@/pages/content-studio";
import ContentPiecePage from "@/pages/content-piece";

setBaseUrl(import.meta.env.BASE_URL.replace(/\/$/, ""));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ActiveProjectProvider>
          <TooltipProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/projects/:id" element={<RequireAuth><ProjectDetail /></RequireAuth>} />
                <Route path="/projects/:id/content-studio" element={<RequireAuth><ContentStudio /></RequireAuth>} />
                <Route path="/content-piece/:id" element={<RequireAuth><ContentPiecePage /></RequireAuth>} />
                <Route path="/roadmaps" element={<RoadmapDirectory />} />
                <Route path="/roadmap/:slug" element={<RoadmapDetail />} />
                <Route path="/content-strategy/:id" element={<ContentStrategy />} />
                <Route path="/admin/content-strategies" element={<AdminContentStrategies />} />
                <Route path="/seo-article/:id" element={<SeoArticle />} />
                <Route path="/geo-audit" element={<GeoAuditForm />} />
                <Route path="/geo-audit/:id" element={<GeoAuditDetail />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <Toaster />
          </TooltipProvider>
        </ActiveProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
