"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AdminIntegrationsContent,
} from "@/components/admin/integrations/admin-integrations-panel";
import { AdminIntegrationsDialogs } from "@/components/admin/integrations/admin-integrations-dialogs";
import { useAdminIntegrationsController } from "@/components/admin/integrations/use-admin-integrations-controller";
import {
  IntegrationCategorySkeleton,
  IntegrationTabBadge,
} from "@/components/integrations/integration-tile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PLATFORM_INTEGRATION_CATEGORIES,
  type PlatformIntegrationCategoryId,
} from "@/lib/platform/platform-features";
import { cn } from "@/lib/utils";

const TAB_SKELETONS: Record<PlatformIntegrationCategoryId, number> = {
  billing: 1,
  email: 1,
  media: 2,
  social: 1,
  ai: 1,
};

const DEFAULT_TAB = PLATFORM_INTEGRATION_CATEGORIES[0]?.id ?? "billing";

function AdminIntegrationsLoadingContent({
  activeTab,
}: {
  activeTab: PlatformIntegrationCategoryId;
}) {
  return (
    <div className="space-y-6">
      <div className="border-b border-border/50 pb-4">
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted/70" />
      </div>
      <IntegrationCategorySkeleton tileCount={TAB_SKELETONS[activeTab]} compact />
    </div>
  );
}

export function AdminIntegrationsPageClient() {
  const controller = useAdminIntegrationsController();
  const [activeTab, setActiveTab] = useState<PlatformIntegrationCategoryId>(DEFAULT_TAB);
  const { loading, loadError, reload, counts } = controller;

  return (
    <div className="px-8 py-8 max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Platform integrations</h1>
        <p className="text-sm text-muted-foreground">
          Manage platform-wide{" "}
          <span className="font-medium text-foreground">
            billing, email, stock images, social OAuth, and AI providers
          </span>
          . Credentials are encrypted at rest.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">Could not load platform integrations</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check server logs — pending database migrations are a common cause.
          </p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as PlatformIntegrationCategoryId)}
          className="space-y-5"
        >
          <TabsList className="h-auto flex-wrap gap-1 p-1">
            {PLATFORM_INTEGRATION_CATEGORIES.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="gap-0">
                {category.label}
                <IntegrationTabBadge count={counts[category.id]} loading={loading} />
              </TabsTrigger>
            ))}
          </TabsList>

          {PLATFORM_INTEGRATION_CATEGORIES.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-0">
              {loading ? (
                <AdminIntegrationsLoadingContent activeTab={category.id} />
              ) : (
                <AdminIntegrationsContent controller={controller} activeTab={category.id} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <p
        className={cn(
          "text-sm text-muted-foreground",
          loading && "invisible",
        )}
        aria-hidden={loading}
      >
        Organization AI keys and tools live in{" "}
        <Link href="/integrations" className="text-primary hover:underline">
          Org integrations
        </Link>
        . Project CMS, social, and search connections live on each project&apos;s integrations page.
        Need setup instructions?{" "}
        <Link href="/help" className="text-primary hover:underline">
          Help center
        </Link>
        .
      </p>

      <AdminIntegrationsDialogs controller={controller} />
    </div>
  );
}
