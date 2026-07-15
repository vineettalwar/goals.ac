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

export function AdminTwitterDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveTwitter,
    clearStored,
    savingTwitter,
    savingToggle,
    twitterClientId,
    setTwitterClientId,
    twitterClientSecret,
    setTwitterClientSecret,
  } = controller;
  if (!settings || !status) return null;
  const twitterStoredInDb =
    status.twitter.clientId.source === "db" || status.twitter.clientSecret.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="twitter" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>X</DialogTitle>
            <DialogDescription className="mt-1">
              OAuth app credentials so projects can connect X and publish posts.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {status.twitter.managedByEnv ? (
          <EnvManagedBanner envVars={status.twitter.envVars} />
        ) : (
          <SourceNote
            configured={
              status.twitter.clientId.configured && status.twitter.clientSecret.configured
            }
            source={status.twitter.clientSecret.source ?? status.twitter.clientId.source}
            lastFour={status.twitter.clientSecret.lastFour}
          />
        )}
        <div className="space-y-2">
          <Label htmlFor="twitter-client-id">Client ID</Label>
          <Input
            id="twitter-client-id"
            value={twitterClientId}
            onChange={(e) => setTwitterClientId(e.target.value)}
            placeholder="X app Client ID"
            disabled={status.twitter.managedByEnv}
            autoComplete="off"
            className="font-mono text-xs"
          />
        </div>
        <SecretField
          id="twitter-client-secret"
          label="Client secret"
          placeholder={
            status.twitter.clientSecret.configured
              ? "Leave blank to keep current secret"
              : "X app Client Secret"
          }
          value={twitterClientSecret}
          onChange={setTwitterClientSecret}
          disabled={status.twitter.managedByEnv}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://developer.x.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            X developer portal
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex items-center gap-2">
            <Label htmlFor="twitter-enabled" className="text-xs text-muted-foreground">
              Social publishing
            </Label>
            <Switch
              id="twitter-enabled"
              checked={settings.socialPublishingEnabled}
              disabled={savingToggle === "socialPublishingEnabled"}
              onCheckedChange={(checked) => void toggle("socialPublishingEnabled", checked)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Redirect URI:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{NEXTAUTH_URL}/api/auth/twitter/callback"}
          </code>
        </p>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {twitterStoredInDb && !status.twitter.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("twitter")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.twitter.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.twitter.managedByEnv ? (
            <Button size="sm" disabled={savingTwitter} onClick={() => void saveTwitter()}>
              {savingTwitter ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save credentials"
              )}
            </Button>
          ) : null}
        </div>
      </DialogFooter>
    </>
  );
}
