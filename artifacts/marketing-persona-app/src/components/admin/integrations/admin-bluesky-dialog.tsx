"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { IntegrationIconBox } from "@/components/integrations/integration-tile";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { EnvManagedBanner, SourceNote } from "./admin-integrations-shared";

export function AdminBlueskyDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveBluesky,
    clearStored,
    savingBluesky,
    savingToggle,
    blueskyClientName,
    setBlueskyClientName,
    blueskyPrivateKeyJwk,
    setBlueskyPrivateKeyJwk,
  } = controller;
  if (!settings || !status) return null;
  const blueskyStoredInDb =
    status.bluesky.privateKeyJwk.source === "db" || status.bluesky.clientName.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="bluesky" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>Bluesky</DialogTitle>
            <DialogDescription className="mt-1">
              Stable AT Protocol OAuth signing key so project Connect survives restarts. Client ID is
              the hosted metadata URL (not pasted here).
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {status.bluesky.managedByEnv ? (
          <EnvManagedBanner envVars={status.bluesky.envVars} />
        ) : (
          <SourceNote
            configured={status.bluesky.privateKeyJwk.configured}
            source={status.bluesky.privateKeyJwk.source ?? status.bluesky.clientName.source}
            lastFour={status.bluesky.privateKeyJwk.lastFour}
          />
        )}
        <div className="space-y-2">
          <Label htmlFor="bluesky-client-name">Client name</Label>
          <Input
            id="bluesky-client-name"
            value={blueskyClientName}
            onChange={(e) => setBlueskyClientName(e.target.value)}
            placeholder="goals.ac"
            disabled={status.bluesky.managedByEnv}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bluesky-private-key-jwk" className="text-xs">
            Private key JWK
          </Label>
          <Textarea
            id="bluesky-private-key-jwk"
            value={blueskyPrivateKeyJwk}
            onChange={(e) => setBlueskyPrivateKeyJwk(e.target.value)}
            placeholder={
              status.bluesky.privateKeyJwk.configured
                ? "Leave blank to keep current key"
                : '{"kty":"RSA",...}'
            }
            disabled={status.bluesky.managedByEnv}
            autoComplete="off"
            className="min-h-28 font-mono text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://docs.bsky.app/docs/advanced-guides/oauth-client"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Bluesky OAuth docs
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex items-center gap-2">
            <Label htmlFor="bluesky-enabled" className="text-xs text-muted-foreground">
              Social publishing
            </Label>
            <Switch
              id="bluesky-enabled"
              checked={settings.socialPublishingEnabled}
              disabled={savingToggle === "socialPublishingEnabled"}
              onCheckedChange={(checked) => void toggle("socialPublishingEnabled", checked)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Metadata:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{NEXTAUTH_URL}/oauth/bluesky-client-metadata.json"}
          </code>
        </p>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {blueskyStoredInDb && !status.bluesky.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("bluesky")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.bluesky.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.bluesky.managedByEnv ? (
            <Button size="sm" disabled={savingBluesky} onClick={() => void saveBluesky()}>
              {savingBluesky ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
            </Button>
          ) : null}
        </div>
      </DialogFooter>
    </>
  );
}
