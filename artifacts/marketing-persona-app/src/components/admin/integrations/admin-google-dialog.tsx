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

export function AdminGoogleDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveGoogle,
    clearStored,
    savingGoogle,
    savingToggle,
    googleClientId,
    setGoogleClientId,
    googleClientSecret,
    setGoogleClientSecret,
  } = controller;
  if (!settings || !status) return null;
  const storedInDb =
    status.google.clientId.source === "db" || status.google.clientSecret.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="google" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>Google</DialogTitle>
            <DialogDescription className="mt-1">
              OAuth client for Google login, Search Console, Analytics, and Sheets.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {status.google.managedByEnv ? (
          <EnvManagedBanner envVars={status.google.envVars} />
        ) : (
          <SourceNote
            configured={status.google.clientId.configured && status.google.clientSecret.configured}
            source={status.google.clientSecret.source ?? status.google.clientId.source}
            lastFour={status.google.clientSecret.lastFour}
          />
        )}
        <div className="space-y-2">
          <Label htmlFor="google-client-id">Client ID</Label>
          <Input
            id="google-client-id"
            value={googleClientId}
            onChange={(e) => setGoogleClientId(e.target.value)}
            placeholder="Google OAuth client ID"
            disabled={status.google.managedByEnv}
            autoComplete="off"
            className="font-mono text-xs"
          />
        </div>
        <SecretField
          id="google-client-secret"
          label="Client secret"
          placeholder={
            status.google.clientSecret.configured
              ? "Leave blank to keep current secret"
              : "Google OAuth client secret"
          }
          value={googleClientSecret}
          onChange={setGoogleClientSecret}
          disabled={status.google.managedByEnv}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Google Cloud credentials
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex items-center gap-2">
            <Label htmlFor="google-enabled" className="text-xs text-muted-foreground">
              Allow Google login and Search Console
            </Label>
            <Switch
              id="google-enabled"
              checked={settings.googleIntegrationsEnabled}
              disabled={savingToggle === "googleIntegrationsEnabled"}
              onCheckedChange={(checked) => void toggle("googleIntegrationsEnabled", checked)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Redirect URIs:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            https://api.goals.ac/api/auth/google/callback
          </code>
          {", "}
          <code className="rounded bg-muted px-1 py-0.5">
            https://api.goals.ac/api/auth/google-search-console/callback
          </code>
          {", "}
          <code className="rounded bg-muted px-1 py-0.5">
            https://api.goals.ac/api/auth/google-analytics/callback
          </code>
          {", "}
          <code className="rounded bg-muted px-1 py-0.5">
            https://api.goals.ac/api/auth/google-sheets/callback
          </code>
        </p>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {storedInDb && !status.google.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("google")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.google.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.google.managedByEnv ? (
            <Button size="sm" disabled={savingGoogle} onClick={() => void saveGoogle()}>
              {savingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
            </Button>
          ) : null}
        </div>
      </DialogFooter>
    </>
  );
}
