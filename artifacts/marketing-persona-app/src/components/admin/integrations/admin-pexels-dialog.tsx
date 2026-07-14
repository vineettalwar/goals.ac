"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IntegrationIconBox } from "@/components/integrations/integration-tile";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { EnvManagedBanner, SecretField, SourceNote } from "./admin-integrations-shared";

export function AdminPexelsDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings, status, closeDialog, savePexels, clearStored, savingPexels,
    pexelsApiKey, setPexelsApiKey,
  } = controller;
  if (!settings || !status) return null;
  const pexelsStoredInDb = status.pexels.apiKey.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="unsplash" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>Pexels</DialogTitle>
            <DialogDescription className="mt-1">
              Free stock photos for article featured images.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
       <div className="space-y-4 py-4">
        {status.pexels.managedByEnv ? (
          <EnvManagedBanner envVars={status.pexels.envVars} />
        ) : (
          <SourceNote
            configured={status.pexels.apiKey.configured}
            source={status.pexels.apiKey.source}
            lastFour={status.pexels.apiKey.lastFour}
          />
        )}
         <SecretField
          id="pexels-api-key"
          label="API key"
          placeholder={
            status.pexels.apiKey.configured
              ? "Leave blank to keep current key"
              : "Pexels API key"
          }
          value={pexelsApiKey}
          onChange={setPexelsApiKey}
          disabled={status.pexels.managedByEnv}
        />
         <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://www.pexels.com/api/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Pexels API
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
       <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {pexelsStoredInDb && !status.pexels.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("pexels")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.pexels.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.pexels.managedByEnv ? (
            <Button size="sm" disabled={savingPexels} onClick={() => void savePexels()}>
              {savingPexels ? (
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
