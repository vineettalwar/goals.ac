"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IntegrationIconBox } from "@/components/integrations/integration-tile";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { EnvManagedBanner, SecretField, SourceNote } from "./admin-integrations-shared";

export function AdminMetaDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveMeta,
    clearStored,
    savingMeta,
    savingToggle,
    metaAppId,
    setMetaAppId,
    metaAppSecret,
    setMetaAppSecret,
  } = controller;
  if (!settings || !status) return null;
  const metaStoredInDb =
    status.meta.appId.source === "db" || status.meta.appSecret.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="meta" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>Meta</DialogTitle>
            <DialogDescription className="mt-1">
              OAuth app credentials so projects can connect Facebook Pages and Instagram.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {status.meta.managedByEnv ? (
          <EnvManagedBanner envVars={status.meta.envVars} />
        ) : (
          <SourceNote
            configured={status.meta.appId.configured && status.meta.appSecret.configured}
            source={status.meta.appSecret.source ?? status.meta.appId.source}
            lastFour={status.meta.appSecret.lastFour}
          />
        )}
        <div className="space-y-2">
          <Label htmlFor="meta-app-id">App ID</Label>
          <Input
            id="meta-app-id"
            value={metaAppId}
            onChange={(e) => setMetaAppId(e.target.value)}
            placeholder="Meta app ID"
            disabled={status.meta.managedByEnv}
            autoComplete="off"
            className="font-mono text-xs"
          />
        </div>
        <SecretField
          id="meta-app-secret"
          label="App secret"
          placeholder={
            status.meta.appSecret.configured
              ? "Leave blank to keep current secret"
              : "Meta app secret"
          }
          value={metaAppSecret}
          onChange={setMetaAppSecret}
          disabled={status.meta.managedByEnv}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://developers.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Meta for Developers
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex items-center gap-2">
            <Label htmlFor="meta-enabled" className="text-xs text-muted-foreground">
              Social publishing
            </Label>
            <Switch
              id="meta-enabled"
              checked={settings.socialPublishingEnabled}
              disabled={savingToggle === "socialPublishingEnabled"}
              onCheckedChange={(checked) => void toggle("socialPublishingEnabled", checked)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Redirect URI:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{NEXTAUTH_URL}/api/auth/meta/callback"}
          </code>
        </p>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {metaStoredInDb && !status.meta.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("meta")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.meta.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.meta.managedByEnv ? (
            <Button size="sm" disabled={savingMeta} onClick={() => void saveMeta()}>
              {savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
            </Button>
          ) : null}
        </div>
      </DialogFooter>
    </>
  );
}
