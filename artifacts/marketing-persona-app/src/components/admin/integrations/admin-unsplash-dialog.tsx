"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { IntegrationIconBox } from "@/components/integrations/integration-tile";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { EnvManagedBanner, SecretField, SourceNote } from "./admin-integrations-shared";

export function AdminUnsplashDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings, status, closeDialog, saveUnsplash, clearStored, savingUnsplash,
    unsplashAccessKey, setUnsplashAccessKey,
  } = controller;
  if (!settings || !status) return null;
  const unsplashStoredInDb = status.unsplash.accessKey.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="unsplash" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>Unsplash</DialogTitle>
            <DialogDescription className="mt-1">
              Free stock photos for article featured images.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
       <div className="space-y-4 py-4">
        {status.unsplash.managedByEnv ? (
          <EnvManagedBanner envVars={status.unsplash.envVars} />
        ) : (
          <SourceNote
            configured={status.unsplash.accessKey.configured}
            source={status.unsplash.accessKey.source}
            lastFour={status.unsplash.accessKey.lastFour}
          />
        )}
         <SecretField
          id="unsplash-access-key"
          label="Access key"
          placeholder={
            status.unsplash.accessKey.configured
              ? "Leave blank to keep current key"
              : "Unsplash developer access key"
          }
          value={unsplashAccessKey}
          onChange={setUnsplashAccessKey}
          disabled={status.unsplash.managedByEnv}
        />
         <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://unsplash.com/developers"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Unsplash developers
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
       <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {unsplashStoredInDb && !status.unsplash.managedByEnv ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void clearStored("unsplash")}
            >
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.unsplash.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.unsplash.managedByEnv ? (
            <Button size="sm" disabled={savingUnsplash} onClick={() => void saveUnsplash()}>
              {savingUnsplash ? (
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
