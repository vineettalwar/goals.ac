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

export function AdminBingDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveBing,
    clearStored,
    savingBing,
    savingToggle,
    bingClientId,
    setBingClientId,
    bingClientSecret,
    setBingClientSecret,
  } = controller;
  if (!settings || !status) return null;
  const storedInDb =
    status.bing.clientId.source === "db" || status.bing.clientSecret.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="bing" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>Bing Webmaster Tools</DialogTitle>
            <DialogDescription className="mt-1">
              OAuth client so projects can connect Bing Webmaster and open Copilot citation reports.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {status.bing.managedByEnv ? (
          <EnvManagedBanner envVars={status.bing.envVars} />
        ) : (
          <SourceNote
            configured={status.bing.clientId.configured && status.bing.clientSecret.configured}
            source={status.bing.clientSecret.source ?? status.bing.clientId.source}
            lastFour={status.bing.clientSecret.lastFour}
          />
        )}
        <div className="space-y-2">
          <Label htmlFor="bing-client-id">Client ID</Label>
          <Input
            id="bing-client-id"
            value={bingClientId}
            onChange={(e) => setBingClientId(e.target.value)}
            placeholder="Bing Webmaster OAuth client ID"
            disabled={status.bing.managedByEnv}
            autoComplete="off"
            className="font-mono text-xs"
          />
        </div>
        <SecretField
          id="bing-client-secret"
          label="Client secret"
          placeholder={
            status.bing.clientSecret.configured
              ? "Leave blank to keep current secret"
              : "Bing Webmaster OAuth client secret"
          }
          value={bingClientSecret}
          onChange={setBingClientSecret}
          disabled={status.bing.managedByEnv}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://learn.microsoft.com/en-us/bingwebmaster/oauth2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Bing Webmaster OAuth
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex items-center gap-2">
            <Label htmlFor="bing-enabled" className="text-xs text-muted-foreground">
              Allow project connections
            </Label>
            <Switch
              id="bing-enabled"
              checked={settings.bingWebmasterEnabled}
              disabled={savingToggle === "bingWebmasterEnabled"}
              onCheckedChange={(checked) => void toggle("bingWebmasterEnabled", checked)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Redirect URI:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            https://api.goals.ac/api/auth/bing-webmaster/callback
          </code>
        </p>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {storedInDb && !status.bing.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("bing")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.bing.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.bing.managedByEnv ? (
            <Button size="sm" disabled={savingBing} onClick={() => void saveBing()}>
              {savingBing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
            </Button>
          ) : null}
        </div>
      </DialogFooter>
    </>
  );
}
