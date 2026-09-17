import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  BeehiivConnectDialog,
  CMS_NATIVE_CONNECT_PLATFORMS,
  CMS_PLATFORMS,
  CmsFullAppConnectDialog,
  ConvertKitConnectDialog,
  DrupalConnectDialog,
  ESP_NATIVE_CONNECT_PLATFORMS,
  EspFullAppConnectDialog,
  GhostConnectDialog,
  getEspDestinations,
  IntegrationsView,
  JoomlaConnectDialog,
  MailchimpConnectDialog,
  NotionConnectDialog,
  ShopifyConnectDialog,
  WebflowConnectDialog,
  WordPressConnectDialog,
  projectIntegrationsPath,
  type BeehiivConnectPayload,
  type ConvertKitConnectPayload,
  type DrupalConnectPayload,
  type EspPlatformId,
  type GhostConnectPayload,
  type ProjectIntegrationsTab,
  type JoomlaConnectPayload,
  type MailchimpConnectPayload,
  type NotionConnectPayload,
  type SearchPropertyProvider,
  type ShopifyConnectPayload,
  type SocialOauthConfigured,
  SOCIAL_OAUTH_DISABLED,
  type WebflowConnectPayload,
  type WordPressConnectPayload,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useIntegrationsData } from "@/hooks/use-integrations-data";
import { apiFetch, getApiBase, getAppOrigin } from "@/lib/api";

type CmsIntegrationsResponse = Record<string, { connected?: boolean } & Record<string, unknown>>;

const VALID_TABS: ProjectIntegrationsTab[] = ["cms", "social", "esp", "search"];

function parseTab(value: string | undefined | null): ProjectIntegrationsTab | null {
  if (value && VALID_TABS.includes(value as ProjectIntegrationsTab)) {
    return value as ProjectIntegrationsTab;
  }
  return null;
}

export function ProjectIntegrationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id: routeProjectId, tab: tabParam } = useParams<{ id: string; tab?: string }>();
  const { activeProject, loading: projectsLoading, projects, setProjectId } = useActiveProject();
  const projectId = routeProjectId ?? "";
  const {
    loading,
    error,
    integrations,
    searchProperties,
    searchLoading,
    searchError,
    reload,
    setIntegrations,
    socialCount,
  } = useIntegrationsData(projectId);

  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);
  const [healthStatuses, setHealthStatuses] = useState<
    Array<{ platform: string; connected: boolean; ok: boolean | null; error?: string }> | null
  >(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [connectPlatform, setConnectPlatform] = useState<string | null>(null);
  const [connectEsp, setConnectEsp] = useState<EspPlatformId | null>(null);
  const [metaPageToken, setMetaPageToken] = useState<string | null>(null);
  const [disconnectingSearchProvider, setDisconnectingSearchProvider] =
    useState<SearchPropertyProvider | null>(null);
  const [syncingGsc, setSyncingGsc] = useState(false);
  const [socialOauthConfigured, setSocialOauthConfigured] =
    useState<SocialOauthConfigured>(SOCIAL_OAUTH_DISABLED);

  useEffect(() => {
    if (routeProjectId) setProjectId(routeProjectId);
  }, [routeProjectId, setProjectId]);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ socialOauthConfigured?: SocialOauthConfigured }>("/api/platform/status")
      .then((data) => {
        if (cancelled) return;
        if (data.socialOauthConfigured) setSocialOauthConfigured(data.socialOauthConfigured);
      })
      .catch(() => {
        // Keep disabled defaults — tiles show coming soon until status loads.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const socialOauthNotice = useMemo(() => {
    const linkedin = searchParams.get("linkedin");
    const twitter = searchParams.get("twitter");
    const meta = searchParams.get("meta");
    const bluesky = searchParams.get("bluesky");
    const mastodon = searchParams.get("mastodon");
    const gsc = searchParams.get("gsc");
    const bing = searchParams.get("bing");

    if (linkedin === "connected") return "LinkedIn connected.";
    if (linkedin === "error") return "LinkedIn connection failed.";
    if (twitter === "connected") return "X connected.";
    if (twitter === "error") return "X connection failed.";
    if (bluesky === "connected") return "Bluesky connected.";
    if (bluesky === "error") return "Bluesky connection failed.";
    if (mastodon === "connected") return "Mastodon connected.";
    if (mastodon === "error") return "Mastodon connection failed.";
    if (meta === "error") return "Meta connection failed.";
    if (meta === "no_pages") return "No Facebook pages found on this account.";
    if (meta === "select_page" || metaPageToken) {
      return "Choose a Facebook Page to finish Meta setup.";
    }
    if (gsc === "connected") return "Google Search Console connected.";
    if (gsc === "pick_property") {
      return "Google account connected — choose a Search Console property.";
    }
    if (gsc === "no_properties") {
      return "Google account connected, but no verified Search Console properties were found.";
    }
    if (gsc === "property_not_found") {
      return "Google account connected, but no matching Search Console property was found.";
    }
    if (gsc === "error") return "Google Search Console connection failed.";
    if (bing === "connected") return "Bing Webmaster Tools connected.";
    if (bing === "pick_property") {
      return "Bing account connected — choose a verified site.";
    }
    if (bing === "no_properties") {
      return "Bing account connected, but no verified sites were found.";
    }
    if (bing === "property_not_found") {
      return "Bing account connected, but no matching verified site was found.";
    }
    if (bing === "error") return "Bing Webmaster connection failed.";
    return null;
  }, [searchParams, metaPageToken]);

  const activeTab = parseTab(tabParam);

  function changeTab(tab: ProjectIntegrationsTab) {
    navigate(projectIntegrationsPath(projectId, tab), { replace: true });
  }


  useEffect(() => {
    const linkedin = searchParams.get("linkedin");
    const twitter = searchParams.get("twitter");
    const meta = searchParams.get("meta");
    const bluesky = searchParams.get("bluesky");
    const mastodon = searchParams.get("mastodon");
    const token = searchParams.get("token");
    const gsc = searchParams.get("gsc");
    const bing = searchParams.get("bing");

    if (!linkedin && !twitter && !meta && !bluesky && !mastodon && !gsc && !bing) return;

    if (meta === "select_page" && token) {
      setMetaPageToken(token);
    }

    if (gsc || bing) {
      const searchNotice =
        gsc === "connected"
          ? "Google Search Console connected."
          : gsc === "pick_property"
            ? "Google account connected — choose a Search Console property."
            : gsc === "no_properties"
              ? "Google account connected, but no verified Search Console properties were found."
              : gsc === "property_not_found"
                ? "Google account connected, but no matching Search Console property was found."
                : gsc === "error"
                  ? "Google Search Console connection failed."
                  : bing === "connected"
                    ? "Bing Webmaster Tools connected."
                    : bing === "pick_property"
                      ? "Bing account connected — choose a verified site."
                      : bing === "no_properties"
                        ? "Bing account connected, but no verified sites were found."
                        : bing === "property_not_found"
                          ? "Bing account connected, but no matching verified site was found."
                          : bing === "error"
                            ? "Bing Webmaster connection failed."
                            : null;
      if (searchNotice) setSaveMessage(searchNotice);
      void reload();
    } else if (projectId) {
      navigate(projectIntegrationsPath(projectId, "social"), { replace: true });
    }

    const next = new URLSearchParams(searchParams);
    next.delete("linkedin");
    next.delete("twitter");
    next.delete("meta");
    next.delete("bluesky");
    next.delete("mastodon");
    next.delete("token");
    next.delete("gsc");
    next.delete("bing");
    next.delete("tab");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, projectId, navigate, reload]);

  const connectPlatformLabel = useMemo(() => {
    if (!connectPlatform) return "";
    return CMS_PLATFORMS.find(({ key }) => key === connectPlatform)?.label ?? connectPlatform;
  }, [connectPlatform]);

  const connectEspLabel = useMemo(() => {
    if (!connectEsp) return "";
    return getEspDestinations().find((destination) => destination.id === connectEsp)?.label ?? connectEsp;
  }, [connectEsp]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  async function patchCmsIntegration(
    body: Record<string, unknown>,
    successMessage: string,
  ): Promise<boolean> {
    if (!projectId) return false;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await apiFetch<CmsIntegrationsResponse>(
        `/api/website-projects/${projectId}/cms-integrations`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      setIntegrations(updated);
      setSaveMessage(successMessage);
      await reload();
      return true;
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save integration");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveWebhook() {
    if (!webhookUrl.trim() || !webhookSecret.trim()) return;
    const ok = await patchCmsIntegration(
      { webhook: { url: webhookUrl.trim(), signingSecret: webhookSecret.trim() } },
      "Webhook saved.",
    );
    if (ok) {
      setWebhookUrl("");
      setWebhookSecret("");
    }
  }

  async function testPlatform(platform: string) {
    if (!projectId) return;
    const label =
      CMS_PLATFORMS.find(({ key }) => key === platform)?.label ??
      getEspDestinations().find((destination) => destination.id === platform)?.label ??
      platform;
    setSaving(true);
    setSaveMessage(null);
    try {
      const health = await apiFetch<
        Record<string, { ok: boolean; error?: string; siteName?: string }>
      >(`/api/website-projects/${projectId}/cms-integrations/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const entry = health[platform];
      if (!entry) {
        setSaveMessage(`${label}: not connected or no credentials found.`);
        return;
      }
      if (entry.ok) {
        const site = entry.siteName ? ` (${entry.siteName})` : "";
        setSaveMessage(`${label} connection OK${site}.`);
      } else {
        setSaveMessage(`${label} test failed: ${entry.error ?? "Unknown error"}.`);
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : `${label} test failed.`);
    } finally {
      setSaving(false);
    }
  }

  async function runHealthCheck() {
    if (!projectId) return;
    setHealthCheckRunning(true);
    setSaveMessage(null);
    try {
      const result = await apiFetch<{
        platforms: Array<{
          platform: string;
          connected: boolean;
          ok: boolean | null;
          error?: string;
        }>;
      }>(`/api/website-projects/${projectId}/integrations/health`, {
        method: "POST",
      });
      setHealthStatuses(result.platforms);
      const nextIntegrations = { ...integrations };
      for (const row of result.platforms) {
        if (!row.connected) continue;
        nextIntegrations[row.platform] = {
          ...(nextIntegrations[row.platform] ?? { connected: true }),
          lastHealthOk: row.ok,
          lastHealthError: row.error ?? null,
          lastHealthCheckedAt: new Date().toISOString(),
        };
      }
      setIntegrations(nextIntegrations);
      const failing = result.platforms.filter((row) => row.connected && row.ok === false).length;
      setSaveMessage(
        failing > 0
          ? `Health check done — ${failing} connection(s) failing.`
          : "Health check done — connected platforms look healthy.",
      );
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Health check failed.");
    } finally {
      setHealthCheckRunning(false);
    }
  }

  async function disconnect(platform: string) {
    if (!projectId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await apiFetch<CmsIntegrationsResponse>(
        `/api/website-projects/${projectId}/cms-integrations/${platform}`,
        { method: "DELETE" },
      );
      setIntegrations(updated);
      setSaveMessage(`${platform} disconnected.`);
      await reload();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setSaving(false);
    }
  }

  async function saveWordPress(payload: WordPressConnectPayload) {
    const ok = await patchCmsIntegration({ wordpress: payload }, "WordPress connected.");
    if (ok) {
      setConnectPlatform(null);
    }
  }

  async function saveGhost(payload: GhostConnectPayload) {
    const ok = await patchCmsIntegration({ ghost: payload }, "Ghost connected.");
    if (ok) {
      setConnectPlatform(null);
    }
  }

  async function saveShopify(payload: ShopifyConnectPayload) {
    const ok = await patchCmsIntegration({ shopify: payload }, "Shopify connected.");
    if (ok) {
      setConnectPlatform(null);
    }
  }

  async function saveDrupal(payload: DrupalConnectPayload) {
    const ok = await patchCmsIntegration({ drupal: payload }, "Drupal connected.");
    if (ok) {
      setConnectPlatform(null);
    }
  }

  async function saveJoomla(payload: JoomlaConnectPayload) {
    const ok = await patchCmsIntegration({ joomla: payload }, "Joomla connected.");
    if (ok) {
      setConnectPlatform(null);
    }
  }

  async function saveNotion(payload: NotionConnectPayload) {
    const ok = await patchCmsIntegration({ notion: payload }, "Notion connected.");
    if (ok) {
      setConnectPlatform(null);
    }
  }

  async function saveWebflow(payload: WebflowConnectPayload) {
    const ok = await patchCmsIntegration({ webflow: payload }, "Webflow connected.");
    if (ok) {
      setConnectPlatform(null);
    }
  }

  async function saveBeehiiv(payload: BeehiivConnectPayload) {
    const ok = await patchCmsIntegration({ beehiiv: payload }, "Beehiiv connected.");
    if (ok) {
      setConnectEsp(null);
    }
  }

  async function saveConvertKit(payload: ConvertKitConnectPayload) {
    const ok = await patchCmsIntegration({ convertkit: payload }, "ConvertKit connected.");
    if (ok) {
      setConnectEsp(null);
    }
  }

  async function saveMailchimp(payload: MailchimpConnectPayload) {
    const ok = await patchCmsIntegration({ mailchimp: payload }, "Mailchimp connected.");
    if (ok) {
      setConnectEsp(null);
    }
  }

  async function disconnectSearchProvider(provider: SearchPropertyProvider) {
    if (!projectId) return;
    setDisconnectingSearchProvider(provider);
    setSaveMessage(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/search-properties?provider=${provider}`, {
        method: "DELETE",
      });
      setSaveMessage(`${provider === "google_search_console" ? "Search Console" : "Bing Webmaster"} disconnected.`);
      await reload();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to disconnect search property");
    } finally {
      setDisconnectingSearchProvider(null);
    }
  }

  async function selectSearchProperty(provider: SearchPropertyProvider, propertyUrl: string) {
    if (!projectId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/search-properties`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, propertyUrl }),
      });
      setSaveMessage("Search property linked.");
      await reload();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save property selection");
    } finally {
      setSaving(false);
    }
  }

  async function syncGscQueries() {
    if (!projectId) return;
    setSyncingGsc(true);
    setSaveMessage(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/search-properties/gsc/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setSaveMessage("GSC query sync queued.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "GSC sync failed");
    } finally {
      setSyncingGsc(false);
    }
  }

  function closeConnectDialog() {
    if (saving) return;
    setConnectPlatform(null);
  }

  function closeEspConnectDialog() {
    if (saving) return;
    setConnectEsp(null);
  }

  const showFullAppDialog =
    connectPlatform !== null &&
    connectPlatform !== "webhook" &&
    !CMS_NATIVE_CONNECT_PLATFORMS.has(connectPlatform);

  const showEspFullAppDialog =
    connectEsp !== null && !ESP_NATIVE_CONNECT_PLATFORMS.has(connectEsp);

  if (authLoading || (projectsLoading && projects.length === 0)) {
    return <p className="p-8 text-muted-foreground">Loading…</p>;
  }

  if (!user) return null;

  if (!activeTab) {
    return <Navigate to={projectIntegrationsPath(projectId, "cms")} replace />;
  }

  return (
    <>
      <IntegrationsView
        projectId={projectId || null}
        projectName={activeProject?.name ?? null}
        activeTab={activeTab}
        onTabChange={changeTab}
        integrations={integrations}
        integrationsLoading={loading}
        loadError={error}
        saveMessage={saveMessage}
        saving={saving}
        webhookUrl={webhookUrl}
        webhookSecret={webhookSecret}
        onWebhookUrlChange={setWebhookUrl}
        onWebhookSecretChange={setWebhookSecret}
        onSaveWebhook={() => void saveWebhook()}
        onDisconnect={(platform) => void disconnect(platform)}
        onConnectPlatform={setConnectPlatform}
        onTestPlatform={(platform) => void testPlatform(platform)}
        onRunHealthCheck={() => void runHealthCheck()}
        healthCheckRunning={healthCheckRunning}
        healthStatuses={healthStatuses}
        onConnectEsp={setConnectEsp}
        onDisconnectEsp={(platform) => void disconnect(platform)}
        onTestEsp={(platform) => void testPlatform(platform)}
        searchProperties={searchProperties}
        searchPropertiesLoading={searchLoading}
        searchPropertiesError={searchError}
        apiBase={getApiBase() || "http://localhost:8787"}
        appOrigin={getAppOrigin()}
        onDisconnectSearch={(provider) => void disconnectSearchProvider(provider)}
        onSyncGsc={() => void syncGscQueries()}
        onSelectSearchProperty={(provider, propertyUrl) =>
          void selectSearchProperty(provider, propertyUrl)
        }
        onRefreshSearch={() => void reload()}
        disconnectingSearchProvider={disconnectingSearchProvider}
        syncingGsc={syncingGsc}
        socialCount={socialCount}
        onDisconnectSocial={(platform) => void disconnect(platform)}
        metaPageToken={metaPageToken}
        onMetaPageConnected={() => {
          setMetaPageToken(null);
          setSaveMessage("Meta page connected.");
          void reload();
        }}
        socialOauthNotice={socialOauthNotice}
        socialOauthConfigured={socialOauthConfigured}
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />

      <WordPressConnectDialog
        open={connectPlatform === "wordpress"}
        onOpenChange={(open) => {
          if (!open) closeConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveWordPress(payload)}
      />

      <GhostConnectDialog
        open={connectPlatform === "ghost"}
        onOpenChange={(open) => {
          if (!open) closeConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveGhost(payload)}
      />

      <ShopifyConnectDialog
        open={connectPlatform === "shopify"}
        onOpenChange={(open) => {
          if (!open) closeConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveShopify(payload)}
      />

      <DrupalConnectDialog
        open={connectPlatform === "drupal"}
        onOpenChange={(open) => {
          if (!open) closeConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveDrupal(payload)}
      />

      <JoomlaConnectDialog
        open={connectPlatform === "joomla"}
        onOpenChange={(open) => {
          if (!open) closeConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveJoomla(payload)}
      />

      <NotionConnectDialog
        open={connectPlatform === "notion"}
        onOpenChange={(open) => {
          if (!open) closeConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveNotion(payload)}
      />

      <WebflowConnectDialog
        open={connectPlatform === "webflow"}
        onOpenChange={(open) => {
          if (!open) closeConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveWebflow(payload)}
      />

      <CmsFullAppConnectDialog
        open={showFullAppDialog}
        platformLabel={connectPlatformLabel}
        platformKey={connectPlatform ?? undefined}
        onOpenChange={(open) => {
          if (!open) closeConnectDialog();
        }}
        fullAppIntegrationsUrl={`${getAppOrigin().replace(/\/+$/, "")}/projects/${projectId}/integrations`}
      />

      <BeehiivConnectDialog
        open={connectEsp === "beehiiv"}
        onOpenChange={(open) => {
          if (!open) closeEspConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveBeehiiv(payload)}
      />

      <ConvertKitConnectDialog
        open={connectEsp === "convertkit"}
        onOpenChange={(open) => {
          if (!open) closeEspConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveConvertKit(payload)}
      />

      <MailchimpConnectDialog
        open={connectEsp === "mailchimp"}
        onOpenChange={(open) => {
          if (!open) closeEspConnectDialog();
        }}
        saving={saving}
        onSave={(payload) => void saveMailchimp(payload)}
      />

      <EspFullAppConnectDialog
        open={showEspFullAppDialog}
        platformLabel={connectEspLabel}
        onOpenChange={(open) => {
          if (!open) closeEspConnectDialog();
        }}
        fullAppIntegrationsUrl={`${getAppOrigin().replace(/\/+$/, "")}/projects/${projectId}/integrations`}
      />
    </>
  );
}
