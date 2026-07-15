import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useActiveProject } from "@/hooks/use-active-project";
import { ContentPiecePage } from "@/pages/ContentPiecePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { ProjectIntegrationsPage } from "@/pages/ProjectIntegrationsPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";
import { FastLanePage } from "@/pages/FastLanePage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StudioPage } from "@/pages/StudioPage";
import {
  AuditDetailPage,
  AuditListPage,
  AutopilotPage,
  GrowthRoadmapPage,
  HelpPage,
  OnboardingPage,
  PartnerPage,
  ResearchCompetitorsPage,
  ResearchHubPage,
  ResearchRedditPage,
  SearchHubPage,
  SearchKeywordsPage,
  SearchPerformancePage,
  SearchSitePage,
  SearchSuggestionsPage,
  SearchVisibilityPage,
  SocialHubPage,
  StrategyCalendarPage,
  StrategyGoalsPage,
  StrategyHubPage,
  StrategyRoadmapsPage,
  StrategyTopicalMapPage,
} from "@/pages/SectionPages";
import { AdminGuard } from "@/pages/admin/AdminGuard";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminOverviewPage } from "@/pages/admin/AdminOverviewPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminUsersInvitePage } from "@/pages/admin/AdminUsersInvitePage";
import { AdminOrganizationsPage } from "@/pages/admin/AdminOrganizationsPage";
import { AdminOrganizationDetailPage } from "@/pages/admin/AdminOrganizationDetailPage";
import { AdminOrganizationOnboardPage } from "@/pages/admin/AdminOrganizationOnboardPage";
import { AdminPlansPage } from "@/pages/admin/AdminPlansPage";
import { AdminPlatformPage } from "@/pages/admin/AdminPlatformPage";
import { AdminIntegrationsPage } from "@/pages/admin/AdminIntegrationsPage";
import { AdminContentStrategiesPage } from "@/pages/admin/AdminContentStrategiesPage";
import { AdminContentStrategyDetailPage } from "@/pages/admin/AdminContentStrategyDetailPage";

function AuditDetailRoute() {
  const { id } = useParams();
  return <AuditDetailPage auditId={id ?? ""} />;
}

function GrowthRoadmapRoute() {
  const { slug } = useParams();
  return <GrowthRoadmapPage slug={slug ?? ""} />;
}

function legacyProjectQueryRedirect(
  projectId: string,
  searchParams: URLSearchParams,
  suffix: string,
): string {
  const next = new URLSearchParams(searchParams);
  next.delete("project");
  const qs = next.toString();
  return `/projects/${projectId}${suffix}${qs ? `?${qs}` : ""}`;
}

function LegacyStudioRedirect() {
  const [searchParams] = useSearchParams();
  const { projectId, loading } = useActiveProject();
  const fromQuery = searchParams.get("project");
  const id = fromQuery && /^\d+$/.test(fromQuery) ? fromQuery : projectId;
  if (!id) {
    if (loading) return <p className="p-8 text-muted-foreground">Loading…</p>;
    return <Navigate to="/projects" replace />;
  }
  return <Navigate to={legacyProjectQueryRedirect(id, searchParams, "/content-studio")} replace />;
}

function LegacySocialRedirect() {
  const [searchParams] = useSearchParams();
  const { projectId, loading } = useActiveProject();
  const fromQuery = searchParams.get("project");
  const id = fromQuery && /^\d+$/.test(fromQuery) ? fromQuery : projectId;
  if (!id) {
    if (loading) return <p className="p-8 text-muted-foreground">Loading…</p>;
    return <Navigate to="/projects" replace />;
  }
  return <Navigate to={legacyProjectQueryRedirect(id, searchParams, "/social")} replace />;
}

function AdminContentStrategyDetailRoute() {
  const { id } = useParams();
  const strategyId = Number.parseInt(id ?? "", 10);
  if (!Number.isFinite(strategyId)) {
    return <p className="p-8 text-destructive">Invalid strategy id</p>;
  }
  return <AdminContentStrategyDetailPage strategyId={strategyId} />;
}

function AdminOrganizationDetailRoute() {
  const { id } = useParams();
  const organizationId = Number.parseInt(id ?? "", 10);
  if (!Number.isFinite(organizationId)) {
    return <p className="p-8 text-destructive">Invalid organization id</p>;
  }
  return <AdminOrganizationDetailPage organizationId={organizationId} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/onboarding/fast-lane" element={<FastLanePage />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/invite" element={<AdminUsersInvitePage />} />
        <Route path="organizations" element={<AdminOrganizationsPage />} />
        <Route path="organizations/onboard" element={<AdminOrganizationOnboardPage />} />
        <Route path="organizations/:id" element={<AdminOrganizationDetailRoute />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="platform" element={<AdminPlatformPage />} />
        <Route path="integrations" element={<AdminIntegrationsPage />} />
        <Route path="content-strategies" element={<AdminContentStrategiesPage />} />
        <Route path="content-strategies/:id" element={<AdminContentStrategyDetailRoute />} />
      </Route>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/content-studio" element={<StudioPage />} />
        <Route path="/projects/:id/social" element={<SocialHubPage />} />
        <Route path="/projects/:id/integrations" element={<ProjectIntegrationsPage />} />
        <Route path="/projects/:id/integrations/:tab" element={<ProjectIntegrationsPage />} />
        <Route path="/projects/:id/content-piece/:pieceId" element={<ContentPiecePage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/integrations/:tab" element={<IntegrationsPage />} />
        <Route path="/studio" element={<LegacyStudioRedirect />} />
        <Route path="/social" element={<LegacySocialRedirect />} />
        <Route path="/content-piece/:id" element={<ContentPiecePage />} />
        <Route path="/content-pieces/:id" element={<ContentPiecePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/strategy" element={<StrategyHubPage />} />
        <Route path="/strategy/goals" element={<StrategyGoalsPage />} />
        <Route path="/strategy/calendar" element={<StrategyCalendarPage />} />
        <Route path="/strategy/roadmaps" element={<StrategyRoadmapsPage />} />
        <Route path="/strategy/topical-map" element={<StrategyTopicalMapPage />} />
        <Route path="/search" element={<SearchHubPage />} />
        <Route path="/search/keywords" element={<SearchKeywordsPage />} />
        <Route path="/search/visibility" element={<SearchVisibilityPage />} />
        <Route path="/search/performance" element={<SearchPerformancePage />} />
        <Route path="/search/site" element={<SearchSitePage />} />
        <Route path="/search/suggestions" element={<SearchSuggestionsPage />} />
        <Route path="/audit" element={<AuditListPage />} />
        <Route path="/audit/:id" element={<AuditDetailRoute />} />
        <Route path="/research" element={<ResearchHubPage />} />
        <Route path="/research/competitors" element={<ResearchCompetitorsPage />} />
        <Route path="/research/reddit" element={<ResearchRedditPage />} />
        <Route path="/competitor-analysis" element={<Navigate to="/research/competitors" replace />} />
        <Route path="/autopilot" element={<AutopilotPage />} />
        <Route path="/partner" element={<PartnerPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/growth-roadmaps/:slug" element={<GrowthRoadmapRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
