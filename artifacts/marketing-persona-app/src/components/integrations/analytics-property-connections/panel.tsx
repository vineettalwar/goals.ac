"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  IntegrationCategorySection,
  IntegrationCategorySkeleton,
} from "@/components/integrations/integration-tile";
import type {
  AnalyticsPropertyConnectionsResponse,
  AnalyticsPropertyProvider,
  Ga4SyncStatus,
} from "@/lib/integrations/analytics/analytics-property-types";
import { ANALYTICS_INTEGRATIONS_COUNT, PROVIDER_META } from "./constants";
import { ConnectionDetails } from "./connection-details";
import { AnalyticsPropertyTiles } from "./tiles";

export { ANALYTICS_INTEGRATIONS_COUNT };

export function AnalyticsPropertyConnectionsPanel({
  projectId,
  embedded = false,
  layout = "grid",
}: {
  projectId: string;
  embedded?: boolean;
  layout?: "grid" | "cards";
}) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AnalyticsPropertyConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<AnalyticsPropertyProvider | null>(null);
  const [ga4SyncStatus, setGa4SyncStatus] = useState<Ga4SyncStatus | null>(null);

  const load = useCallback(async () => {
    const [propsRes, ga4Res] = await Promise.all([
      fetch(`/api/website-projects/${projectId}/analytics-properties`),
      fetch(`/api/website-projects/${projectId}/analytics-properties/ga4/sync`),
    ]);
    if (propsRes.ok) setData(await propsRes.json());
    if (ga4Res.ok) setGa4SyncStatus(await ga4Res.json());
  }, [projectId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const ga4 = searchParams.get("ga4");

    if (ga4 === "connected") toast.success("Google Analytics 4 connected");
    if (ga4 === "pick_property") {
      toast.message("Google account connected — choose a GA4 property");
      setActiveProvider("google_analytics_4");
    }
    if (ga4 === "no_properties") {
      toast.warning("Google account connected, but no GA4 properties were found");
    }
    if (ga4 === "error") toast.error("Google Analytics connection failed");

    if (ga4) void load();
  }, [searchParams, load]);

  async function onDisconnect(provider: AnalyticsPropertyProvider) {
    setDisconnecting(provider);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/analytics-properties?provider=${provider}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Failed to disconnect");
        return;
      }
      toast.success("Disconnected");
      setActiveProvider(null);
      await load();
    } finally {
      setDisconnecting(null);
    }
  }

  async function onRefresh() {
    await load();
    setActiveProvider(null);
  }

  if (loading) {
    return (
      <IntegrationCategorySkeleton
        tileCount={ANALYTICS_INTEGRATIONS_COUNT}
        compact={embedded}
      />
    );
  }

  if (!data) return null;

  const connectedCount = data.connections.filter((c) => c.connected && c.propertyVerified).length;

  const activeConnection = activeProvider
    ? data.connections.find((c) => c.provider === activeProvider)
    : null;

  if (layout === "cards") {
    return (
      <section className="space-y-4">
        {!embedded ? (
          <div>
            <h2 className="font-semibold text-sm">Web analytics</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Connect GA4 to measure sessions and engagement on published content.
            </p>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {data.connections.map((connection) => (
            <div key={connection.provider} className="rounded-xl border p-5 space-y-3">
              <ConnectionDetails
                connection={connection}
                projectId={projectId}
                oauthConfigured={data.oauthConfigured}
                onDisconnect={onDisconnect}
                onRefresh={onRefresh}
                disconnecting={disconnecting}
                showPicker={connection.connected && !connection.propertyVerified}
                ga4SyncStatus={ga4SyncStatus}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <IntegrationCategorySection
        title="Web analytics"
        description="Measure sessions, pageviews, and engagement from Google Analytics 4."
        connectedCount={connectedCount}
        totalCount={ANALYTICS_INTEGRATIONS_COUNT}
        compact={embedded}
      >
        <AnalyticsPropertyTiles
          connections={data.connections}
          onSelectProvider={setActiveProvider}
        />
      </IntegrationCategorySection>

      <Dialog open={activeProvider != null} onOpenChange={(open) => !open && setActiveProvider(null)}>
        <DialogContent className="max-w-xl gap-0 overflow-y-auto p-0 sm:max-w-lg max-h-[88vh]">
          <DialogTitle className="sr-only">
            {activeConnection ? PROVIDER_META[activeConnection.provider].label : "Connection settings"}
          </DialogTitle>
          <div className="p-6">
            {activeConnection ? (
              <ConnectionDetails
                connection={activeConnection}
                projectId={projectId}
                oauthConfigured={data.oauthConfigured}
                onDisconnect={onDisconnect}
                onRefresh={onRefresh}
                disconnecting={disconnecting}
                showPicker={activeConnection.connected && !activeConnection.propertyVerified}
                ga4SyncStatus={ga4SyncStatus}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
