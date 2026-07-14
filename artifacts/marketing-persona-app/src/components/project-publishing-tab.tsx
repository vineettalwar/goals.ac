"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { IntegrationCategorySkeleton } from "@/components/integration-tile";
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
} from "@/components/publishing-settings-panel";
import { ProjectAutomationPanel } from "@/components/project-automation-panel";
import { ProjectPrimaryDestinationPanel } from "@/components/project-primary-destination-panel";

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
  const [cmsIntegrations, setCmsIntegrations] = useState<CmsIntegrationStatus>({});
  const [healthStatus, setHealthStatus] = useState<Record<string, { ok: boolean; error?: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [cmsError, setCmsError] = useState<string | null>(null);
  const [cmsSaveSuccess, setCmsSaveSuccess] = useState<string | null>(null);
  const [metaPageToken, setMetaPageToken] = useState<string | null>(null);
  const [metaPages, setMetaPages] = useState<MetaPage[]>([]);
  const [isSelectingMetaPage, setIsSelectingMetaPage] = useState(false);
  const [isDisconnectingLinkedin, setIsDisconnectingLinkedin] = useState(false);
  const [isDisconnectingTwitter, setIsDisconnectingTwitter] = useState(false);
  const [isDisconnectingMeta, setIsDisconnectingMeta] = useState(false);

  const loadIntegrations = useCallback(async () => {
    const res = await fetch(`/api/website-projects/${projectId}/cms-integrations`);
    if (res.ok) setCmsIntegrations(await res.json());
  }, [projectId]);

  useEffect(() => {
    loadIntegrations().finally(() => setLoading(false));
  }, [loadIntegrations]);

  useEffect(() => {
    const meta = searchParams.get("meta");
    const token = searchParams.get("token");
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

    if (meta === "select_page" && token) {
      setMetaPageToken(token);
      fetch(`/api/auth/meta/pages?token=${encodeURIComponent(token)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.pages) setMetaPages(data.pages);
        })
        .catch(() => toast.error("Failed to load Meta pages"));
    }
  }, [searchParams]);

  async function onTestHealth() {
    setIsTestingHealth(true);
    setCmsError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/cms-integrations/test`, { method: "POST" });
      if (!res.ok) throw new Error("Health check failed");
      setHealthStatus(await res.json());
    } catch {
      setCmsError("Failed to test connections");
    } finally {
      setIsTestingHealth(false);
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
    setIsSelectingMetaPage(true);
    const res = await fetch("/api/auth/meta/select-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: metaPageToken, pageId }),
    });
    setIsSelectingMetaPage(false);
    if (!res.ok) { toast.error("Failed to connect Meta page"); return; }
    setMetaPageToken(null);
    setMetaPages([]);
    await loadIntegrations();
    toast.success("Meta page connected");
  }

  if (loading) {
    if (layout === "grid") {
      const sections =
        categoryFilter === "all"
          ? [
              { count: getCmsDestinations().length },
              { count: SOCIAL_SETTINGS_COUNT },
              { count: getEspDestinations().length },
            ]
          : categoryFilter === "cms"
            ? [{ count: getCmsDestinations().length }]
            : categoryFilter === "social"
              ? [{ count: SOCIAL_SETTINGS_COUNT }]
              : [{ count: getEspDestinations().length }];

      return (
        <div className="space-y-8">
          {sections.map((section, index) => (
            <IntegrationCategorySkeleton key={index} tileCount={section.count} compact />
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
            <Button variant="outline" size="sm" onClick={onTestHealth} disabled={isTestingHealth}>
              {isTestingHealth ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
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
        isTestingHealth={isTestingHealth}
        metaPageToken={metaPageToken}
        metaPages={metaPages}
        isSelectingMetaPage={isSelectingMetaPage}
        isDisconnectingLinkedin={isDisconnectingLinkedin}
        isDisconnectingTwitter={isDisconnectingTwitter}
        isDisconnectingMeta={isDisconnectingMeta}
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
          const setDisconnecting =
            platform === "linkedin"
              ? setIsDisconnectingLinkedin
              : platform === "twitter"
                ? setIsDisconnectingTwitter
                : platform === "meta"
                  ? setIsDisconnectingMeta
                  : null;
          setDisconnecting?.(true);
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
            setDisconnecting?.(false);
          }
        }}
        onSelectMetaPage={onSelectMetaPage}
      />
      </div>
    </div>
  );
}
