import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GeoAuditDetailView,
  GeoAuditListView,
  GeoAuditRunPanel,
  SearchHubGrid,
  SearchPerformanceView,
  SearchSiteHealthView,
  SearchSuggestionsView,
  SearchVisibilityView,
  type VisibilitySettings,
  type VisibilitySummary,
} from "@workspace/app-shell";
import { SectionShell } from "@/components/SectionShell";
import { useActiveProject } from "@/hooks/use-active-project";
import { useAuditDetailData, useAuditListData } from "@/hooks/use-audit-data";
import {
  useArticlePerformance,
  useKeywordOpportunities,
  useVisibilitySettings,
  useVisibilitySummary,
} from "@/hooks/use-section-queries";
import { apiFetch } from "@/lib/api";
import { defaultDateRange, renderLink, searchTabs } from "@/pages/section-page-shared";

export { SearchKeywordsPage } from "./SearchKeywordsPage";

export function SearchHubPage() {
  const { projectId } = useActiveProject();
  return (
    <SectionShell title="Search" description="Keywords, visibility, and site health." tabs={searchTabs}>
      <SearchHubGrid projectId={projectId} renderLink={renderLink} />
    </SectionShell>
  );
}


export function SearchVisibilityPage() {
  const { projectId, activeProject } = useActiveProject();
  const { settings, error: settingsError } = useVisibilitySettings(projectId);
  const { summary, error: summaryError, refetch } = useVisibilitySummary(projectId);
  const [saving, setSaving] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);

  async function saveSettings(next: VisibilitySettings) {
    if (!projectId) return;
    setSaving(true);
    try {
      await apiFetch(`/api/website-projects/${projectId}/visibility-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } finally {
      setSaving(false);
    }
  }

  async function runCheck() {
    if (!projectId) return;
    setRunningCheck(true);
    try {
      await apiFetch(`/api/website-projects/${projectId}/visibility/check`, { method: "POST" });
      await refetch();
    } finally {
      setRunningCheck(false);
    }
  }

  return (
    <SectionShell title="AI visibility" description="LLM tracking and GEO re-audit settings." tabs={searchTabs}>
      <SearchVisibilityView
        settings={(settings as VisibilitySettings | null) ?? null}
        summary={(summary as VisibilitySummary | null) ?? null}
        error={settingsError ?? summaryError}
        saving={saving}
        onSettingsChange={(next) => void saveSettings(next)}
        onRunCheck={() => void runCheck()}
        runningCheck={runningCheck}
        integrationsHref={projectId ? `/projects/${projectId}/integrations` : "/integrations"}
        brandProfileHref={activeProject ? `/projects/${activeProject.id}` : undefined}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function SearchPerformancePage() {
  const { projectId } = useActiveProject();
  const initial = useMemo(() => defaultDateRange(), []);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [sortKey, setSortKey] = useState<"sessions" | "clicks">("sessions");
  const { data, loading, error, refetch } = useArticlePerformance(projectId, startDate, endDate);

  return (
    <SectionShell title="Search performance" description="GSC and GA4 performance for published articles." tabs={searchTabs}>
      <SearchPerformanceView
        data={data}
        loading={loading}
        error={error}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onRefresh={() => void refetch()}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        integrationsHref={projectId ? `/projects/${projectId}/integrations` : "/integrations"}
        renderLink={renderLink}
        contentPieceHref={(id) => `/content-piece/${id}`}
      />
    </SectionShell>
  );
}

export function SearchSitePage() {
  const { activeProject, projectId } = useActiveProject();
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  async function runCrawl() {
    if (!projectId) return;
    setScraping(true);
    setScrapeMessage(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/scrape`, { method: "POST" });
      setScrapeMessage("Site crawl queued. Refresh in a minute to see updated page count.");
    } catch (err) {
      setScrapeMessage(err instanceof Error ? err.message : "Failed to queue crawl");
    } finally {
      setScraping(false);
    }
  }

  return (
    <SectionShell title="Site health" description="Crawl status and page inventory." tabs={searchTabs}>
      <SearchSiteHealthView
        crawlStatus={activeProject?.crawlStatus}
        pageCount={activeProject?.pageCount}
        url={activeProject?.url}
        scraping={scraping}
        scrapeMessage={scrapeMessage}
        onRunCrawl={() => void runCrawl()}
      />
    </SectionShell>
  );
}

export function SearchSuggestionsPage() {
  const { projectId } = useActiveProject();
  const { opportunities, error } = useKeywordOpportunities(projectId);

  return (
    <SectionShell title="Keyword suggestions" description="Open keyword opportunities scored for your project." tabs={searchTabs}>
      <SearchSuggestionsView opportunities={opportunities} error={error} />
    </SectionShell>
  );
}

export function AuditListPage() {
  const navigate = useNavigate();
  const { activeProject, projectId } = useActiveProject();
  const { audits, loading, error, reload } = useAuditListData();
  const [auditUrl, setAuditUrl] = useState(activeProject?.url ?? "");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  async function runAudit() {
    const url = auditUrl.trim();
    if (!url) return;
    setRunning(true);
    setRunError(null);
    try {
      const data = await apiFetch<{ id?: number; audit?: { id?: number }; error?: string }>(
        "/api/geo-audits/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            websiteProjectId: projectId ? Number(projectId) : undefined,
          }),
        },
      );
      const id = data.id ?? data.audit?.id;
      if (!id) {
        setRunError(data.error ?? "Audit completed but no result id was returned");
        return;
      }
      await reload();
      navigate(`/audit/${id}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <SectionShell title="GEO audits" description="Generative engine optimization audits for your URLs." requireProject={false}>
      <GeoAuditListView
        audits={audits}
        loading={loading}
        error={error}
        renderLink={renderLink}
        runPanel={
          <GeoAuditRunPanel
            url={auditUrl}
            onUrlChange={setAuditUrl}
            onSubmit={() => void runAudit()}
            running={running}
            error={runError}
          />
        }
      />
    </SectionShell>
  );
}

export function AuditDetailPage({ auditId }: { auditId: string }) {
  const { audit, loading, error } = useAuditDetailData(auditId);

  return (
    <div className="max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <GeoAuditDetailView audit={audit} loading={loading} error={error} renderLink={renderLink} />
    </div>
  );
}
