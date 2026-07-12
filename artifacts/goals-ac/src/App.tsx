import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setBaseUrl } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "@/context/auth";
import { ActiveProjectProvider } from "@/context/active-project";
import { ThemeProvider } from "@/context/theme";
import { useEffect, type ReactNode } from "react";

import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import ProjectDetail from "@/pages/project-detail";
import ContentStudio from "@/pages/content-studio";
import ContentPiecePage from "@/pages/content-piece";
import OAuthCallback from "@/pages/oauth-callback";
import Settings from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import CompetitorAnalysis from "@/pages/competitor-analysis";
import KeywordTracking from "@/pages/keyword-tracking";
import AiVisibility from "@/pages/ai-visibility";
import AdminContentStrategies from "@/pages/admin/content-strategies";
import NotFound from "@/pages/not-found";

setBaseUrl(import.meta.env.BASE_URL.replace(/\/$/, ""));

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3001";

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

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function SignupRedirect() {
  useEffect(() => {
    window.location.href = `${MARKETING_URL}/signup`;
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ActiveProjectProvider>
            <TooltipProvider>
              <BrowserRouter basename={import.meta.env.BASE_URL}>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignupRedirect />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/oauth-callback" element={<OAuthCallback />} />
                <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                <Route path="/projects/:id/content-studio" element={<RequireAuth><ContentStudio /></RequireAuth>} />
                <Route path="/projects/:id/:tab" element={<RequireAuth><ProjectDetail /></RequireAuth>} />
                <Route path="/projects/:id" element={<RequireAuth><ProjectDetail /></RequireAuth>} />
                <Route path="/content-piece/:id" element={<RequireAuth><ContentPiecePage /></RequireAuth>} />
                <Route path="/competitor-analysis" element={<RequireAuth><CompetitorAnalysis /></RequireAuth>} />
                <Route path="/keyword-tracking" element={<RequireAuth><KeywordTracking /></RequireAuth>} />
                <Route path="/ai-visibility" element={<RequireAuth><AiVisibility /></RequireAuth>} />
                <Route path="/admin/content-strategies" element={<AdminContentStrategies />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </BrowserRouter>
              <Toaster />
            </TooltipProvider>
          </ActiveProjectProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
