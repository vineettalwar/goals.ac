"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IntegrationIconBox } from "@/components/integrations/integration-tile";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { EnvManagedBanner, SecretField, SourceNote } from "./admin-integrations-shared";

export function AdminDataForSeoDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    status,
    closeDialog,
    saveDataforseo,
    clearStored,
    savingDataforseo,
    dataforseoLogin,
    setDataforseoLogin,
    dataforseoPassword,
    setDataforseoPassword,
  } = controller;
  if (!status) return null;
  const storedInDb =
    status.dataforseo.login.source === "db" || status.dataforseo.password.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="dataforseo" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>DataForSEO</DialogTitle>
            <DialogDescription className="mt-1">
              API login and password for live LLM mention checks on Search → Visibility. Use the API
              password from the DataForSEO dashboard, not the site login password.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {status.dataforseo.managedByEnv ? (
          <EnvManagedBanner envVars={status.dataforseo.envVars} />
        ) : (
          <SourceNote
            configured={
              status.dataforseo.login.configured && status.dataforseo.password.configured
            }
            source={status.dataforseo.password.source ?? status.dataforseo.login.source}
            lastFour={status.dataforseo.password.lastFour}
          />
        )}
        <SecretField
          id="dataforseo-login"
          label="API login"
          placeholder={
            status.dataforseo.login.configured
              ? "Leave blank to keep current login"
              : "Usually your DataForSEO account email"
          }
          value={dataforseoLogin}
          onChange={setDataforseoLogin}
          disabled={status.dataforseo.managedByEnv}
        />
        <SecretField
          id="dataforseo-password"
          label="API password"
          placeholder={
            status.dataforseo.password.configured
              ? "Leave blank to keep current password"
              : "From DataForSEO dashboard → API Access"
          }
          value={dataforseoPassword}
          onChange={setDataforseoPassword}
          disabled={status.dataforseo.managedByEnv}
        />
        <a
          href="https://app.dataforseo.com/api-access"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open DataForSEO API Access
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {storedInDb && !status.dataforseo.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("dataforseo")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.dataforseo.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.dataforseo.managedByEnv ? (
            <Button size="sm" disabled={savingDataforseo} onClick={() => void saveDataforseo()}>
              {savingDataforseo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
            </Button>
          ) : null}
        </div>
      </DialogFooter>
    </>
  );
}
