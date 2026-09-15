"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IntegrationCategorySection,
  IntegrationCategorySkeleton,
} from "@/components/integrations/integration-tile";
import type {
  SearchPropertyConnectionStatus,
  SearchPropertyConnectionsResponse,
  SearchPropertyProvider,
} from "@/lib/integrations/search/search-property-types";
import { PROVIDER_META, SEARCH_INTEGRATIONS_COUNT } from "./constants";
import { ConnectionDetails } from "./connection-details";
import { SearchPropertyTiles } from "./tiles";

export { SEARCH_INTEGRATIONS_COUNT };

export function SearchPropertyConnectionsPanel({
  projectId,
  embedded = false,
  layout = "grid",
  hideCategoryHeader = false,
}: {
  projectId: string;
  embedded?: boolean;
  layout?: "grid" | "cards";
  /** Skip the section title when the parent already labels the block. */
  hideCategoryHeader?: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [data, setData] = useState<SearchPropertyConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<SearchPropertyProvider | null>(null);
  const [openedPendingPicker, setOpenedPendingPicker] = useState(false);
  const [gscSyncStatus, setGscSyncStatus] = useState<{
    lastSyncedAt: string | null;
    queryCount: number;
    lastSyncStatus: "ok" | "auth_error" | "error" | null;
    lastSyncError: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    const [propsRes, gscRes] = await Promise.all([
      fetch(`/api/website-projects/${projectId}/search-properties`),
      fetch(`/api/website-projects/${projectId}/search-properties/gsc/sync-status`),
    ]);
    if (propsRes.ok) setData(await propsRes.json());
    if (gscRes.ok) {
      const status = await gscRes.json();
      setGscSyncStatus({
        lastSyncedAt: status.lastSyncedAt ?? null,
        queryCount: status.queryCount ?? 0,
        lastSyncStatus: status.lastSyncStatus ?? null,
        lastSyncError: status.lastSyncError ?? null,
      });
    }
  }, [projectId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (openedPendingPicker || !data) return;
    const pending = data.connections.find((row) => row.connected && !row.propertyVerified);
    if (!pending) return;
    setActiveProvider(pending.provider);
    setOpenedPendingPicker(true);
  }, [data, openedPendingPicker]);

  useEffect(() => {
    const gsc = searchParams.get("gsc");
    const bing = searchParams.get("bing");

    if (gsc === "connected") toast.success("Google Search Console connected");
    if (gsc === "pick_property") {
      toast.message("Google account connected — choose a Search Console property");
      setActiveProvider("google_search_console");
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
      setActiveProvider("bing_webmaster");
    }
    if (bing === "no_properties") {
      toast.warning("Bing account connected, but no verified sites were found");
    }
    if (bing === "property_not_found") {
      toast.warning("Bing account connected, but no matching verified site was found");
    }
    if (bing === "error") toast.error("Bing Webmaster connection failed");

    if (!gsc && !bing) return;
    void load();
    const next = new URLSearchParams(searchParams.toString());
    next.delete("gsc");
    next.delete("bing");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, load, pathname, router]);

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
        tileCount={SEARCH_INTEGRATIONS_COUNT}
        compact={embedded}
      />
    );
  }

  if (!data) return null;

  const connectedCount = data.connections.filter(
    (c) => c.connected && c.propertyVerified,
  ).length;

  const activeConnection = activeProvider
    ? data.connections.find((c) => c.provider === activeProvider)
    : null;

  if (layout === "cards") {
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
            <div key={connection.provider} className="rounded-xl border p-5 space-y-3">
              <ConnectionDetails
                connection={connection}
                projectId={projectId}
                oauthConfigured={data.oauthConfigured}
                onDisconnect={onDisconnect}
                onRefresh={onRefresh}
                disconnecting={disconnecting}
                showPicker={connection.connected && !connection.propertyVerified}
                gscSyncStatus={gscSyncStatus}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const tiles = (
    <SearchPropertyTiles
      connections={data.connections}
      onSelectProvider={setActiveProvider}
    />
  );

  return (
    <section className="space-y-3">
      {hideCategoryHeader ? (
        tiles
      ) : (
        <IntegrationCategorySection
          title="Search & AI citation"
          description="Track AI Overview and Copilot citations from search consoles."
          connectedCount={connectedCount}
          totalCount={SEARCH_INTEGRATIONS_COUNT}
          compact={embedded}
        >
          {tiles}
        </IntegrationCategorySection>
      )}

      <Dialog
        open={activeProvider != null}
        onOpenChange={(open) => !open && setActiveProvider(null)}
      >
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
                gscSyncStatus={gscSyncStatus}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
