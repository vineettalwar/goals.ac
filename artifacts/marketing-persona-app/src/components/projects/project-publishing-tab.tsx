"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { IntegrationCategorySkeleton } from "@/components/integrations/integration-tile";
import {
  getCmsDestinations,
  getEspDestinations,
  SOCIAL_SETTINGS_COUNT,
} from "@/lib/projects/publishing-destinations";
import {
  PublishingSettingsPanel,
  type CmsIntegrationStatus,
  type IntegrationCategoryFilter,
  type IntegrationLayout,
} from "@/components/projects/publishing-settings-panel";
import type { PublishingPendingAction } from "@/components/projects/publishing-settings-pending";
import { ProjectAutomationPanel } from "@/components/projects/project-automation-panel";
import { ProjectPrimaryDestinationPanel } from "@/components/projects/project-primary-destination-panel";
import { useCmsIntegrations, useMetaPages } from "@/lib/queries";

interface Props {
  projectId: string;
  /** Hide autopilot / visibility automation controls (e.g. on the Integrations hub). */
  showAutomation?: boolean;
  layout?: IntegrationLayout;
  categoryFilter?: IntegrationCategoryFilter;
}

type MetaPage = {
  pageId: string;
  pageName: string;
  instagramAccountId?: string;
  instagramUsername?: string;
};

export function ProjectPublishingTab({
  projectId,
  showAutomation = true,
  layout = "grid",
  categoryFilter = "all",
}: Props) {
  const searchParams = useSearchParams();
  const meta = searchParams.get("meta");
  const metaTokenParam = searchParams.get("token");
  const metaPageToken = meta === "select_page" ? metaTokenParam : null;

  const {
    data: cmsIntegrationsQuery = {},
    isLoading: loading,
    refetch: refetchIntegrations,
  } = useCmsIntegrations(projectId);
  const [cmsIntegrations, setCmsIntegrations] = useState<CmsIntegrationStatus>({});
  const [healthStatus, setHealthStatus] = useState<Record<string, { ok: boolean; error?: string }> | null>(null);
  const [pendingAction, setPendingAction] = useState<PublishingPendingAction>(null);
  const [cmsError, setCmsError] = useState<string | null>(null);
  const [cmsSaveSuccess, setCmsSaveSuccess] = useState<string | null>(null);
  const [metaSelectionCleared, setMetaSelectionCleared] = useState(false);

  useEffect(() => {
    if (!loading) {
      setCmsIntegrations(cmsIntegrationsQuery as CmsIntegrationStatus);
    }
  }, [cmsIntegrationsQuery, loading]);

  const effectiveMetaPageToken = metaSelectionCleared ? null : metaPageToken;
  const { data: metaPagesData, isError: metaPagesError } = useMetaPages(effectiveMetaPageToken);
  const metaPages = (metaPagesData?.pages ?? []) as MetaPage[];

  const loadIntegrations = useCallback(async () => {
    await refetchIntegrations();
  }, [refetchIntegrations]);

  useEffect(() => {
    if (metaPagesError) toast.error("Failed to load Meta pages");
  }, [metaPagesError]);

  useEffect(() => {
    const linkedin = searchParams.get("linkedin");
    const twitter = searchParams.get("twitter");
    const bluesky = searchParams.get("bluesky");
    const mastodon = searchParams.get("mastodon");

    if (linkedin === "connected") toast.success("LinkedIn connected");
    if (linkedin === "error") toast.error("LinkedIn connection failed");
    if (twitter === "connected") toast.success("X connected");
    if (twitter === "error") toast.error("X connection failed");
    if (bluesky === "connected") toast.success("Bluesky connected");
    if (bluesky === "error") toast.error("Bluesky connection failed");
    if (mastodon === "connected") toast.success("Mastodon connected");
    if (mastodon === "error") toast.error("Mastodon connection failed");
    if (meta === "error") toast.error("Meta connection failed");
    if (meta === "no_pages") toast.error("No Facebook pages found on this account");
  }, [searchParams, meta]);

  async function onTestHealth() {
    setPendingAction("testing_health");
    setCmsError(null);
    try {
      const [legacyRes, cmsHealthRes] = await Promise.all([
        fetch(`/api/website-projects/${projectId}/cms-integrations/test`, { method: "POST" }),
        fetch(`/api/website-projects/${projectId}/integrations/health`, { method: "POST" }),
      ]);
      if (!legacyRes.ok && !cmsHealthRes.ok) throw new Error("Health check failed");

      const merged: Record<string, { ok: boolean; error?: string }> = {};
      if (legacyRes.ok) {
        Object.assign(
          merged,
          (await legacyRes.json()) as Record<string, { ok: boolean; error?: string }>,
        );
      }
      if (cmsHealthRes.ok) {
        const data = (await cmsHealthRes.json()) as {
          platforms?: Array<{ platform: string; connected: boolean; ok: boolean | null; error?: string }>;
        };
        for (const row of data.platforms ?? []) {
          if (!row.connected || row.ok === null) continue;
          merged[row.platform] = { ok: row.ok, error: row.error };
        }
      }
      setHealthStatus(merged);
    } catch {
      setCmsError("Failed to test connections");
    } finally {
      setPendingAction(null);
    }
  }

  function onConnectOAuth(path: string, params?: { handle?: string; instance?: string }) {
    if (path === "bluesky") {
      const handle = params?.handle?.trim();
      if (!handle) return;
      window.location.href = `/api/auth/bluesky?projectId=${projectId}&handle=${encodeURIComponent(handle)}`;
      return;
    }
    if (path === "mastodon") {
      const instance = params?.instance?.trim();
      if (!instance) return;
      window.location.href = `/api/auth/mastodon?projectId=${projectId}&instance=${encodeURIComponent(instance)}`;
      return;
    }
    window.location.href = `/api/auth/${path}?projectId=${projectId}`;
  }

  async function onSelectMetaPage(pageId: string) {
    if (!metaPageToken) return;
    setPendingAction("selecting_meta_page");
    const res = await fetch("/api/auth/meta/select-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: metaPageToken, pageId }),
    });
    setPendingAction(null);
    if (!res.ok) { toast.error("Failed to connect Meta page"); return; }
    setMetaSelectionCleared(true);
    await loadIntegrations();
    toast.success("Meta page connected");
  }

  if (loading) {
    if (layout === "grid") {
      const sections =
        categoryFilter === "all"
          ? [
              { id: "cms", count: getCmsDestinations().length },
              { id: "social", count: SOCIAL_SETTINGS_COUNT },
              { id: "esp", count: getEspDestinations().length },
            ]
          : categoryFilter === "cms"
            ? [{ id: "cms", count: getCmsDestinations().length }]
            : categoryFilter === "social"
              ? [{ id: "social", count: SOCIAL_SETTINGS_COUNT }]
              : [{ id: "esp", count: getEspDestinations().length }];

      return (
        <div className="space-y-8">
          {sections.map((section) => (
            <IntegrationCategorySkeleton key={section.id} tileCount={section.count} compact />
          ))}
        </div>
      );
    }

    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showAutomation ? <ProjectAutomationPanel projectId={projectId} /> : null}

      <div className="space-y-4">
        {layout === "grid" && showAutomation ? (
          <div className="border-b border-border/50 pb-3">
            <h2 className="text-sm font-medium">Publishing destinations</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Connect platforms to publish Content Studio pieces.
            </p>
          </div>
        ) : null}

        {layout === "stacked" ? (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Publishing destinations</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Connect CMS platforms and social accounts to publish Content Studio pieces.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onTestHealth} disabled={pendingAction === "testing_health"}>
              {pendingAction === "testing_health" ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
              Test connections
            </Button>
          </div>
        ) : null}

        {layout === "stacked" && cmsError ? <p className="text-sm text-destructive">{cmsError}</p> : null}
        {layout === "stacked" && cmsSaveSuccess ? (
          <p className="text-sm text-emerald-600">{cmsSaveSuccess}</p>
        ) : null}

        <ProjectPrimaryDestinationPanel projectId={projectId} cmsConnections={cmsIntegrations} />

        <PublishingSettingsPanel
        apiBase=""
        projectId={projectId}
        token=""
        cmsIntegrations={cmsIntegrations}
        healthStatus={healthStatus}
        cmsError={cmsError}
        cmsSaveSuccess={cmsSaveSuccess}
        pendingAction={pendingAction}
        metaPageToken={effectiveMetaPageToken}
        metaPages={metaPages}
        layout={layout}
        categoryFilter={categoryFilter}
        onIntegrationsChange={setCmsIntegrations}
        onHealthKeyRemove={(key) =>
          setHealthStatus((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
          })
        }
        onError={setCmsError}
        onSaveSuccess={(message) => {
          setCmsSaveSuccess(message);
          toast.success(message);
          setTimeout(() => setCmsSaveSuccess(null), 3000);
        }}
        onTestHealth={onTestHealth}
        onConnectOAuth={onConnectOAuth}
        onDisconnectSocial={async (platform) => {
          const action: PublishingPendingAction =
            platform === "linkedin"
              ? "disconnecting_linkedin"
              : platform === "twitter"
                ? "disconnecting_twitter"
                : platform === "meta"
                  ? "disconnecting_meta"
                  : null;
          if (!action) return;
          setPendingAction(action);
          setCmsError(null);
          try {
            const res = await fetch(
              `/api/website-projects/${projectId}/cms-integrations/${platform}`,
              { method: "DELETE" },
            );
            if (!res.ok) throw new Error("Disconnect failed");
            setCmsIntegrations((prev) => {
              const next = { ...prev };
              delete next[platform];
              return next;
            });
            setHealthStatus((prev) => {
              if (!prev) return prev;
              const next = { ...prev };
              delete next[platform];
              return next;
            });
            toast.success("Disconnected");
          } catch {
            setCmsError(`Failed to disconnect ${platform}`);
            toast.error(`Failed to disconnect ${platform}`);
          } finally {
            setPendingAction(null);
          }
        }}
        onSelectMetaPage={onSelectMetaPage}
      />
      </div>
    </div>
  );
}
