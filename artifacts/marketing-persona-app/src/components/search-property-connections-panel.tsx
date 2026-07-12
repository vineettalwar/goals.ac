"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Link2, Unlink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AvailableSearchPropertiesResponse,
  SearchPropertyConnectionStatus,
  SearchPropertyConnectionsResponse,
  SearchPropertyProvider,
} from "@/lib/search-property-types";

const PROVIDER_META = {
  google_search_console: {
    label: "Google Search Console",
    shortLabel: "Search Console",
    connectPath: "google-search-console",
    description: "AI Overview and AI Mode impressions from Google.",
    accent: "border-blue-200 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/5",
  },
  bing_webmaster: {
    label: "Bing Webmaster Tools",
    shortLabel: "Bing Webmaster",
    connectPath: "bing-webmaster",
    description: "Citation counts from Copilot and Bing AI summaries.",
    accent: "border-teal-200 bg-teal-50/50 dark:border-teal-500/20 dark:bg-teal-500/5",
  },
} as const;

function isOAuthReady(
  provider: keyof typeof PROVIDER_META,
  oauthConfigured: SearchPropertyConnectionsResponse["oauthConfigured"],
) {
  return provider === "google_search_console"
    ? oauthConfigured.googleSearchConsole
    : oauthConfigured.bingWebmaster;
}

function PropertyPicker({
  projectId,
  provider,
  shortLabel,
  onSaved,
}: {
  projectId: string;
  provider: SearchPropertyProvider;
  shortLabel: string;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<AvailableSearchPropertiesResponse | null>(null);
  const [selected, setSelected] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/search-properties/available?provider=${provider}`,
      );
      if (!res.ok) {
        setError("Could not load verified properties from your account.");
        return;
      }
      const data = (await res.json()) as AvailableSearchPropertiesResponse;
      setAvailable(data);
      const recommended = data.properties.find((p) => p.recommended);
      setSelected(recommended?.propertyUrl ?? data.properties[0]?.propertyUrl ?? "");
    } finally {
      setLoading(false);
    }
  }, [projectId, provider]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/search-properties`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, propertyUrl: selected }),
      });
      if (!res.ok) {
        setError("Failed to save property selection.");
        return;
      }
      toast.success(`${shortLabel} property linked`);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner size="sm" /> Loading verified properties…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (!available?.properties.length) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-300">
        No verified properties found on this account. Add and verify your site in {shortLabel}, then
        reconnect.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-amber-300/70 bg-amber-50/40 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
      <div>
        <p className="text-xs font-medium text-foreground">Choose a property</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          We couldn&apos;t auto-match <span className="font-medium">{available.projectUrl}</span>. Pick
          the verified property that belongs to this project.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`property-${provider}`} className="text-xs">
          Verified property
        </Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id={`property-${provider}`} className="h-9 text-xs">
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {available.properties.map((property) => (
              <SelectItem key={property.propertyUrl} value={property.propertyUrl} className="text-xs">
                <span className="flex items-center gap-2">
                  <span>{property.label}</span>
                  {property.recommended ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Recommended</span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected ? (
          <p className="text-[11px] text-muted-foreground break-all">{selected}</p>
        ) : null}
      </div>
      <Button size="sm" onClick={onSave} disabled={!selected || saving}>
        {saving ? <Spinner size="sm" /> : null}
        {saving ? "Saving…" : "Use this property"}
      </Button>
    </div>
  );
}

function ConnectionCard({
  connection,
  projectId,
  oauthConfigured,
  onDisconnect,
  onRefresh,
  disconnecting,
  showPicker,
}: {
  connection: SearchPropertyConnectionStatus;
  projectId: string;
  oauthConfigured: SearchPropertyConnectionsResponse["oauthConfigured"];
  onDisconnect: (provider: SearchPropertyConnectionStatus["provider"]) => void;
  onRefresh: () => void;
  disconnecting: string | null;
  showPicker: boolean;
}) {
  const meta = PROVIDER_META[connection.provider];
  const oauthReady = isOAuthReady(connection.provider, oauthConfigured);

  function onConnect() {
    window.location.href = `/api/auth/${meta.connectPath}?projectId=${projectId}`;
  }

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${meta.accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">{meta.label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
        </div>
        {connection.connected ? (
          connection.propertyVerified ? (
            <Badge className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
            </Badge>
          ) : (
            <Badge variant="muted" className="shrink-0">
              <AlertTriangle className="w-3 h-3 mr-1" /> Pick property
            </Badge>
          )
        ) : null}
      </div>

      {connection.connected ? (
        <div className="space-y-2 text-xs text-muted-foreground">
          {connection.propertyVerified && connection.propertyUrl ? (
            <p>
              <span className="font-medium text-foreground">Property:</span> {connection.propertyUrl}
            </p>
          ) : null}
          {connection.accountEmail ? (
            <p>
              <span className="font-medium text-foreground">Account:</span> {connection.accountEmail}
            </p>
          ) : null}
        </div>
      ) : null}

      {connection.connected && !connection.propertyVerified && showPicker ? (
        <PropertyPicker
          projectId={projectId}
          provider={connection.provider}
          shortLabel={meta.shortLabel}
          onSaved={onRefresh}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!connection.connected ? (
          <Button size="sm" onClick={onConnect} disabled={!oauthReady}>
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            Connect {meta.shortLabel}
          </Button>
        ) : (
          <>
            {connection.propertyVerified && connection.aiReportUrl ? (
              <Button size="sm" variant="outline" asChild>
                <a href={connection.aiReportUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open {connection.aiReportLabel}
                </a>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDisconnect(connection.provider)}
              disabled={disconnecting === connection.provider}
            >
              {disconnecting === connection.provider ? (
                <Spinner size="sm" />
              ) : (
                <Unlink className="w-3.5 h-3.5 mr-1.5" />
              )}
              Disconnect
            </Button>
            {!connection.propertyVerified ? (
              <Button size="sm" variant="outline" onClick={onConnect}>
                Reconnect account
              </Button>
            ) : null}
          </>
        )}
        {!oauthReady ? (
          <span className="text-xs text-muted-foreground">OAuth not configured.</span>
        ) : null}
      </div>
    </div>
  );
}

export function SearchPropertyConnectionsPanel({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SearchPropertyConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/website-projects/${projectId}/search-properties`);
    if (res.ok) setData(await res.json());
  }, [projectId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const gsc = searchParams.get("gsc");
    const bing = searchParams.get("bing");

    if (gsc === "connected") toast.success("Google Search Console connected");
    if (gsc === "pick_property") {
      toast.message("Google account connected — choose a Search Console property");
    }
    if (gsc === "no_properties") {
      toast.warning("Google account connected, but no verified Search Console properties were found");
    }
    if (gsc === "property_not_found") {
      toast.warning("Google account connected, but no matching Search Console property was found");
    }
    if (gsc === "error") toast.error("Google Search Console connection failed");

    if (bing === "connected") toast.success("Bing Webmaster Tools connected");
    if (bing === "pick_property") {
      toast.message("Bing account connected — choose a verified site");
    }
    if (bing === "no_properties") {
      toast.warning("Bing account connected, but no verified sites were found");
    }
    if (bing === "property_not_found") {
      toast.warning("Bing account connected, but no matching verified site was found");
    }
    if (bing === "error") toast.error("Bing Webmaster connection failed");

    if (gsc || bing) void load();
  }, [searchParams, load]);

  async function onDisconnect(provider: SearchPropertyConnectionStatus["provider"]) {
    setDisconnecting(provider);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/search-properties?provider=${provider}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Failed to disconnect");
        return;
      }
      toast.success("Disconnected");
      await load();
    } finally {
      setDisconnecting(null);
    }
  }

  async function onRefresh() {
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner size="sm" /> Loading search property connections…
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-4">
      {!embedded ? (
        <div>
          <h2 className="font-semibold text-sm">Verified citation sources</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Connect Search Console or Bing Webmaster for native AI citation reports.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {data.connections.map((connection) => (
          <ConnectionCard
            key={connection.provider}
            connection={connection}
            projectId={projectId}
            oauthConfigured={data.oauthConfigured}
            onDisconnect={onDisconnect}
            onRefresh={onRefresh}
            disconnecting={disconnecting}
            showPicker={connection.connected && !connection.propertyVerified}
          />
        ))}
      </div>

    </section>
  );
}
