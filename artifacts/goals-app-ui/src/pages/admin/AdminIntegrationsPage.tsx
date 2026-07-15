import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch, getApiBase } from "@/lib/api";

type IntegrationField = {
  configured: boolean;
  source: "db" | "env" | null;
  lastFour?: string | null;
};

type PlatformIntegrationsStatus = {
  stripe: {
    managedByEnv: boolean;
    connectAvailable: boolean;
    connect: { connected: boolean; accountId: string | null; livemode: boolean | null };
    secretKey: IntegrationField;
    publishableKey: IntegrationField;
    webhookSecret: IntegrationField;
    priceGrowthMonthly: string | null;
    priceScaleMonthly: string | null;
  };
  resend: { managedByEnv: boolean; apiKey: IntegrationField; fromEmail: string | null };
  unsplash: { managedByEnv: boolean; accessKey: IntegrationField };
  pexels: { managedByEnv: boolean; apiKey: IntegrationField };
};

function FieldStatus({ field }: { field: IntegrationField }) {
  if (field.configured) {
    return (
      <span className="text-emerald-600">
        Configured{field.lastFour ? ` (••••${field.lastFour})` : ""}
        {field.source === "env" ? " via env" : ""}
      </span>
    );
  }
  return <span className="text-muted-foreground">Not configured</span>;
}

export function AdminIntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<PlatformIntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [stripeSecret, setStripeSecret] = useState("");
  const [stripePublishable, setStripePublishable] = useState("");
  const [stripeWebhook, setStripeWebhook] = useState("");
  const [stripePriceGrowth, setStripePriceGrowth] = useState("");
  const [stripePriceScale, setStripePriceScale] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [resendFrom, setResendFrom] = useState("");
  const [unsplashKey, setUnsplashKey] = useState("");
  const [pexelsKey, setPexelsKey] = useState("");

  const stripeNotice = searchParams.get("stripe");
  const stripeMessage = searchParams.get("message");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PlatformIntegrationsStatus>("/api/admin/platform-integrations");
      setStatus(data);
      setStripePriceGrowth(data.stripe.priceGrowthMonthly ?? "");
      setStripePriceScale(data.stripe.priceScaleMonthly ?? "");
      setResendFrom(data.resend.fromEmail ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveStripe() {
    setSaving("stripe");
    try {
      await apiFetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "stripe",
          secretKey: stripeSecret || undefined,
          publishableKey: stripePublishable || undefined,
          webhookSecret: stripeWebhook || undefined,
          priceGrowthMonthly: stripePriceGrowth || null,
          priceScaleMonthly: stripePriceScale || null,
        }),
      });
      setStripeSecret("");
      setStripePublishable("");
      setStripeWebhook("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stripe save failed");
    } finally {
      setSaving(null);
    }
  }

  async function clearIntegration(integration: string) {
    setSaving(integration);
    try {
      await apiFetch("/api/admin/platform-integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setSaving(null);
    }
  }

  async function saveResend() {
    setSaving("resend");
    try {
      await apiFetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "resend",
          apiKey: resendKey || undefined,
          fromEmail: resendFrom || null,
        }),
      });
      setResendKey("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resend save failed");
    } finally {
      setSaving(null);
    }
  }

  async function saveUnsplash() {
    setSaving("unsplash");
    try {
      await apiFetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: "unsplash", accessKey: unsplashKey || undefined }),
      });
      setUnsplashKey("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unsplash save failed");
    } finally {
      setSaving(null);
    }
  }

  async function savePexels() {
    setSaving("pexels");
    try {
      await apiFetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: "pexels", apiKey: pexelsKey || undefined }),
      });
      setPexelsKey("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pexels save failed");
    } finally {
      setSaving(null);
    }
  }

  function connectStripe() {
    window.location.href = `${getApiBase()}/api/admin/stripe-connect`;
  }

  if (loading) return <p className="p-8 text-muted-foreground">Loading integrations…</p>;
  if (!status) return <p className="p-8 text-destructive">{error ?? "Unavailable"}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Billing, email, and stock image credentials. Values are encrypted at rest.
        </p>
      </div>

      {stripeNotice ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            stripeNotice === "connected"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          {stripeNotice === "connected" && "Stripe Connect linked successfully."}
          {stripeNotice === "connect_unconfigured" && "Stripe Connect client ID is not configured."}
          {stripeNotice === "connect_error" && (stripeMessage ?? "Stripe Connect failed.")}
          <button
            type="button"
            className="ml-3 text-xs underline"
            onClick={() => setSearchParams({})}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium">Stripe</h2>
            <p className="text-sm text-muted-foreground">
              Secret key: <FieldStatus field={status.stripe.secretKey} />
            </p>
            {status.stripe.connect.connected ? (
              <p className="text-sm text-muted-foreground">
                Connect: {status.stripe.connect.accountId}
                {status.stripe.connect.livemode ? " (live)" : " (test)"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {status.stripe.connectAvailable ? (
              <button
                type="button"
                onClick={connectStripe}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50"
              >
                Connect with Stripe
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving === "stripe_connect"}
              onClick={() => void clearIntegration("stripe_connect")}
              className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50"
            >
              Disconnect Connect
            </button>
          </div>
        </div>
        {!status.stripe.managedByEnv ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Secret key</span>
              <input
                type="password"
                value={stripeSecret}
                onChange={(e) => setStripeSecret(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="sk_live_…"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Publishable key</span>
              <input
                type="text"
                value={stripePublishable}
                onChange={(e) => setStripePublishable(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="pk_live_…"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">Webhook secret</span>
              <input
                type="password"
                value={stripeWebhook}
                onChange={(e) => setStripeWebhook(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Growth price ID</span>
              <input
                type="text"
                value={stripePriceGrowth}
                onChange={(e) => setStripePriceGrowth(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Scale price ID</span>
              <input
                type="text"
                value={stripePriceScale}
                onChange={(e) => setStripePriceScale(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Stripe secret key is managed via environment variables.</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving === "stripe" || status.stripe.managedByEnv}
            onClick={() => void saveStripe()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Save Stripe keys
          </button>
          <button
            type="button"
            disabled={saving === "stripe"}
            onClick={() => void clearIntegration("stripe")}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Clear stored keys
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Resend</h2>
        <p className="text-sm text-muted-foreground">
          API key: <FieldStatus field={status.resend.apiKey} />
        </p>
        {!status.resend.managedByEnv ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">API key</span>
              <input
                type="password"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">From email</span>
              <input
                type="email"
                value={resendFrom}
                onChange={(e) => setResendFrom(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Resend is managed via RESEND_API_KEY env var.</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving === "resend"}
            onClick={() => void saveResend()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Save Resend
          </button>
          <button
            type="button"
            onClick={() => void clearIntegration("resend")}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Unsplash</h2>
        <p className="text-sm text-muted-foreground">
          Access key: <FieldStatus field={status.unsplash.accessKey} />
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Access key</span>
          <input
            type="password"
            value={unsplashKey}
            onChange={(e) => setUnsplashKey(e.target.value)}
            className="w-full max-w-md rounded-md border bg-background px-3 py-2"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving === "unsplash"}
            onClick={() => void saveUnsplash()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Save Unsplash
          </button>
          <button
            type="button"
            onClick={() => void clearIntegration("unsplash")}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Pexels</h2>
        <p className="text-sm text-muted-foreground">
          API key: <FieldStatus field={status.pexels.apiKey} />
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">API key</span>
          <input
            type="password"
            value={pexelsKey}
            onChange={(e) => setPexelsKey(e.target.value)}
            className="w-full max-w-md rounded-md border bg-background px-3 py-2"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving === "pexels"}
            onClick={() => void savePexels()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Save Pexels
          </button>
          <button
            type="button"
            onClick={() => void clearIntegration("pexels")}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Clear
          </button>
        </div>
      </section>
    </div>
  );
}
