import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { apiFetch } from "@/lib/api";
import { formatProjectUrl } from "@/types/api";

const CMS_PLATFORMS = [
  { key: "wordpress", label: "WordPress" },
  { key: "ghost", label: "Ghost" },
  { key: "shopify", label: "Shopify" },
  { key: "webflow", label: "Webflow" },
  { key: "notion", label: "Notion" },
  { key: "drupal", label: "Drupal" },
  { key: "joomla", label: "Joomla" },
  { key: "webhook", label: "Webhook" },
] as const;

type CmsRow = { connected?: boolean } & Record<string, unknown>;

export function IntegrationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { projects, projectId, activeProject, error: projectError, setProjectId } = useActiveProject();
  const [integrations, setIntegrations] = useState<Record<string, CmsRow>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !projectId) return;
    setLoadError(null);
    void apiFetch<Record<string, CmsRow>>(`/api/website-projects/${projectId}/cms-integrations`)
      .then(setIntegrations)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Failed to load integrations"),
      );
  }, [user, projectId]);

  async function saveWebhook() {
    if (!projectId || !webhookUrl.trim() || !webhookSecret.trim()) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await apiFetch<Record<string, CmsRow>>(
        `/api/website-projects/${projectId}/cms-integrations`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            webhook: { url: webhookUrl.trim(), signingSecret: webhookSecret.trim() },
          }),
        },
      );
      setIntegrations(updated);
      setSaveMessage("Webhook saved.");
      setWebhookUrl("");
      setWebhookSecret("");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save webhook");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect(platform: string) {
    if (!projectId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await apiFetch<Record<string, CmsRow>>(
        `/api/website-projects/${projectId}/cms-integrations/${platform}`,
        { method: "DELETE" },
      );
      setIntegrations(updated);
      setSaveMessage(`${platform} disconnected.`);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-8 text-(--muted)">Loading…</p>;

  return (
    <div className="px-8 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Integrations</h1>
      <p className="text-sm text-(--muted) mb-6">
        Connect CMS and publishing destinations per project. Webhook connections can be saved here;
        other platforms use the same API and will get full forms in a follow-up.
      </p>

      {projectError ? <p className="text-sm text-red-700 mb-4">{projectError}</p> : null}

      {projects.length === 0 ? (
        <p className="text-sm text-(--muted)">Create a project first from the dashboard.</p>
      ) : (
        <>
          <label className="block text-sm mb-6 max-w-md">
            <span className="mb-1 block font-medium">Project</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 w-full rounded-lg border border-(--border) px-3 bg-white"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} — {formatProjectUrl(project)}
                </option>
              ))}
            </select>
          </label>

          {activeProject ? (
            <p className="text-sm text-(--muted) mb-4">
              Managing connections for{" "}
              <span className="font-medium text-(--ink)">{activeProject.name}</span>
            </p>
          ) : null}

          {loadError ? <p className="text-sm text-red-700 mb-4">{loadError}</p> : null}
          {saveMessage ? (
            <p className={`text-sm mb-4 ${saveMessage.includes("Failed") ? "text-red-700" : "text-(--forest)"}`}>
              {saveMessage}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 mb-8">
            {CMS_PLATFORMS.map(({ key, label }) => {
              const row = integrations[key];
              const connected = Boolean(row?.connected);
              return (
                <div
                  key={key}
                  className="rounded-xl border border-(--border) bg-white p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-(--muted) mt-1">
                      {connected ? "Connected" : "Not connected"}
                    </p>
                    {connected && key === "webhook" && typeof row?.url === "string" ? (
                      <p className="text-xs text-(--muted) mt-1 truncate">{row.url}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        connected
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-[#f5f3ef] text-(--muted)"
                      }`}
                    >
                      {connected ? "On" : "Off"}
                    </span>
                    {connected ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void disconnect(key)}
                        className="text-xs text-red-700 hover:underline disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <section className="rounded-xl border border-(--border) bg-white p-4 max-w-lg">
            <h2 className="text-sm font-semibold mb-3">Connect webhook</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-(--muted)">Webhook URL</span>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="h-10 w-full rounded-lg border border-(--border) px-3"
                  placeholder="https://example.com/hooks/goals-ac"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-(--muted)">Signing secret</span>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="h-10 w-full rounded-lg border border-(--border) px-3"
                />
              </label>
              <button
                type="button"
                disabled={saving || !webhookUrl.trim() || !webhookSecret.trim()}
                onClick={() => void saveWebhook()}
                className="h-10 px-4 rounded-lg bg-(--forest) text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save webhook"}
              </button>
            </div>
          </section>

          {activeProject ? (
            <p className="text-xs text-(--muted) mt-6">
              <Link to={`/projects/${activeProject.id}`} className="text-(--forest) font-medium">
                Open project overview
              </Link>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
