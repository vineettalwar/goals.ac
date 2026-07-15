import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ContentPiecePage } from "@/pages/ContentPiecePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StudioPage } from "@/pages/StudioPage";
import {
  AdminPage,
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

function AuditDetailRoute() {
  const { id } = useParams();
  return <AuditDetailPage auditId={id ?? ""} />;
}

function GrowthRoadmapRoute() {
  const { slug } = useParams();
  return <GrowthRoadmapPage slug={slug ?? ""} />;
}

function ProjectStudioRedirect() {
  const { id } = useParams();
  return <Navigate to={`/studio?project=${id}`} replace />;
}

function ProjectSocialRedirect() {
  const { id } = useParams();
  return <Navigate to={`/social?project=${id}`} replace />;
}

function ProjectContentPieceRedirect() {
  const { pieceId } = useParams();
  return <Navigate to={`/content-piece/${pieceId}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/content-studio" element={<ProjectStudioRedirect />} />
        <Route path="/projects/:id/social" element={<ProjectSocialRedirect />} />
        <Route path="/projects/:id/content-piece/:pieceId" element={<ProjectContentPieceRedirect />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/studio" element={<StudioPage />} />
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
        <Route path="/social" element={<SocialHubPage />} />
        <Route path="/partner" element={<PartnerPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/growth-roadmaps/:slug" element={<GrowthRoadmapRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
