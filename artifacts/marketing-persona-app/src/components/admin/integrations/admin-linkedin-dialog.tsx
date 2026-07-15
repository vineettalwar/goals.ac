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

export function AdminLinkedInDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveLinkedIn,
    clearStored,
    savingLinkedIn,
    savingToggle,
    linkedinClientId,
    setLinkedinClientId,
    linkedinClientSecret,
    setLinkedinClientSecret,
  } = controller;
  if (!settings || !status) return null;
  const linkedInStoredInDb =
    status.linkedin.clientId.source === "db" || status.linkedin.clientSecret.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="linkedin" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>LinkedIn</DialogTitle>
            <DialogDescription className="mt-1">
              OAuth app credentials so projects can connect LinkedIn and publish posts.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {status.linkedin.managedByEnv ? (
          <EnvManagedBanner envVars={status.linkedin.envVars} />
        ) : (
          <SourceNote
            configured={
              status.linkedin.clientId.configured && status.linkedin.clientSecret.configured
            }
            source={status.linkedin.clientSecret.source ?? status.linkedin.clientId.source}
            lastFour={status.linkedin.clientSecret.lastFour}
          />
        )}
        <div className="space-y-2">
          <Label htmlFor="linkedin-client-id">Client ID</Label>
          <Input
            id="linkedin-client-id"
            value={linkedinClientId}
            onChange={(e) => setLinkedinClientId(e.target.value)}
            placeholder="LinkedIn app Client ID"
            disabled={status.linkedin.managedByEnv}
            autoComplete="off"
            className="font-mono text-xs"
          />
        </div>
        <SecretField
          id="linkedin-client-secret"
          label="Client secret"
          placeholder={
            status.linkedin.clientSecret.configured
              ? "Leave blank to keep current secret"
              : "LinkedIn app Client Secret"
          }
          value={linkedinClientSecret}
          onChange={setLinkedinClientSecret}
          disabled={status.linkedin.managedByEnv}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://www.linkedin.com/developers/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            LinkedIn developers
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex items-center gap-2">
            <Label htmlFor="linkedin-enabled" className="text-xs text-muted-foreground">
              Social publishing
            </Label>
            <Switch
              id="linkedin-enabled"
              checked={settings.socialPublishingEnabled}
              disabled={savingToggle === "socialPublishingEnabled"}
              onCheckedChange={(checked) => void toggle("socialPublishingEnabled", checked)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Redirect URI:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{NEXTAUTH_URL}/api/auth/linkedin/callback"}
          </code>
        </p>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {linkedInStoredInDb && !status.linkedin.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("linkedin")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.linkedin.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.linkedin.managedByEnv ? (
            <Button size="sm" disabled={savingLinkedIn} onClick={() => void saveLinkedIn()}>
              {savingLinkedIn ? (
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
