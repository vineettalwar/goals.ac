import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type PlatformSettings = {
  platformEnabled: boolean;
  aiGenerationEnabled: boolean;
  maintenanceMessage: string | null;
  signupsEnabled: boolean;
  stripeBillingEnabled: boolean;
  googleIntegrationsEnabled: boolean;
  bingWebmasterEnabled: boolean;
  socialPublishingEnabled: boolean;
  emailEnabled: boolean;
};

const TOGGLES: { key: keyof PlatformSettings; label: string }[] = [
  { key: "platformEnabled", label: "Platform enabled" },
  { key: "aiGenerationEnabled", label: "AI generation" },
  { key: "signupsEnabled", label: "Signups" },
  { key: "stripeBillingEnabled", label: "Stripe billing" },
  { key: "googleIntegrationsEnabled", label: "Google integrations" },
  { key: "bingWebmasterEnabled", label: "Bing Webmaster" },
  { key: "socialPublishingEnabled", label: "Social publishing" },
  { key: "emailEnabled", label: "Email" },
];

export function AdminPlatformPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PlatformSettings>("/api/admin/platform-settings");
      setSettings(data);
      setMaintenanceMessage(data.maintenanceMessage ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<PlatformSettings>("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, maintenanceMessage: maintenanceMessage || null }),
      });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-8 text-muted-foreground">Loading platform settings…</p>;
  if (!settings) return <p className="p-8 text-destructive">{error ?? "Unavailable"}</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform operations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Global toggles and maintenance messaging.</p>
      </div>
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        {TOGGLES.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-4 text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(settings[key])}
              onChange={(event) =>
                setSettings((prev) => (prev ? { ...prev, [key]: event.target.checked } : prev))
              }
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Maintenance message</span>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2"
            value={maintenanceMessage}
            onChange={(event) => setMaintenanceMessage(event.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
