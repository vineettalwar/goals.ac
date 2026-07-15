"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntegrationIconBox } from "@/components/integrations/integration-tile";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { EnvManagedBanner, SourceNote } from "./admin-integrations-shared";

export function AdminBedrockDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    status,
    closeDialog,
    saveBedrock,
    clearStored,
    testBedrock,
    savingBedrock,
    testingBedrock,
    bedrockAccessKeyId,
    setBedrockAccessKeyId,
    bedrockSecretAccessKey,
    setBedrockSecretAccessKey,
    bedrockSessionToken,
    setBedrockSessionToken,
    bedrockRegion,
    setBedrockRegion,
    bedrockModel,
    setBedrockModel,
    bedrockOrgSearch,
    setBedrockOrgSearch,
    bedrockOrgOptions,
    bedrockGrantedOrgIds,
    toggleBedrockGrantedOrg,
  } = controller;
  if (!status) return null;

  const storedInDb =
    status.bedrock.accessKeyId.source === "db" || status.bedrock.secretAccessKey.source === "db";
  const filteredOrgs = bedrockOrgOptions.filter((org) => {
    const q = bedrockOrgSearch.trim().toLowerCase();
    if (!q) return true;
    return org.name.toLowerCase().includes(q) || String(org.id).includes(q);
  });

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="bedrock" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>AWS Bedrock</DialogTitle>
            <DialogDescription className="mt-1">
              Store platform Bedrock credentials and grant selected organizations access when they
              lack their own BYOK keys.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {status.bedrock.managedByEnv ? (
          <EnvManagedBanner envVars={status.bedrock.envVars} />
        ) : (
          <SourceNote
            configured={status.bedrock.configured}
            source={status.bedrock.accessKeyId.source ?? status.bedrock.secretAccessKey.source}
            lastFour={status.bedrock.accessKeyId.lastFour}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bedrock-access-key">Access key ID</Label>
            <Input
              id="bedrock-access-key"
              value={bedrockAccessKeyId}
              onChange={(e) => setBedrockAccessKeyId(e.target.value)}
              placeholder={
                status.bedrock.accessKeyId.configured
                  ? "Leave blank to keep current key"
                  : "AKIA..."
              }
              disabled={status.bedrock.managedByEnv}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bedrock-secret-key">Secret access key</Label>
            <Input
              id="bedrock-secret-key"
              type="password"
              value={bedrockSecretAccessKey}
              onChange={(e) => setBedrockSecretAccessKey(e.target.value)}
              placeholder={
                status.bedrock.secretAccessKey.configured
                  ? "Leave blank to keep current secret"
                  : "Secret access key"
              }
              disabled={status.bedrock.managedByEnv}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bedrock-session-token">Session token (optional)</Label>
            <Input
              id="bedrock-session-token"
              value={bedrockSessionToken}
              onChange={(e) => setBedrockSessionToken(e.target.value)}
              placeholder="Temporary session token"
              disabled={status.bedrock.managedByEnv}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bedrock-region">Region</Label>
            <Input
              id="bedrock-region"
              value={bedrockRegion}
              onChange={(e) => setBedrockRegion(e.target.value)}
              placeholder="us-east-1"
              disabled={status.bedrock.managedByEnv}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bedrock-model">Model</Label>
            <Input
              id="bedrock-model"
              value={bedrockModel}
              onChange={(e) => setBedrockModel(e.target.value)}
              placeholder="anthropic.claude-3-5-sonnet-20240620-v1:0"
              disabled={status.bedrock.managedByEnv}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <Label htmlFor="bedrock-org-search">Share with organizations</Label>
          <p className="text-xs text-muted-foreground">
            Granted orgs can use this platform Bedrock key when they have no org BYOK. Usage counts
            as platform-key quota.
          </p>
          <Input
            id="bedrock-org-search"
            value={bedrockOrgSearch}
            onChange={(e) => setBedrockOrgSearch(e.target.value)}
            placeholder="Search organizations…"
            autoComplete="off"
          />
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2">
            {filteredOrgs.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">No organizations found</p>
            ) : (
              filteredOrgs.map((org) => {
                const checked = bedrockGrantedOrgIds.has(org.id);
                return (
                  <label
                    key={org.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBedrockGrantedOrg(org.id)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    <span className="truncate">{org.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">#{org.id}</span>
                  </label>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {bedrockGrantedOrgIds.size} organization
            {bedrockGrantedOrgIds.size === 1 ? "" : "s"} selected
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://docs.aws.amazon.com/bedrock/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Bedrock docs
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {storedInDb && !status.bedrock.managedByEnv ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void clearStored("bedrock")}
              disabled={savingBedrock || testingBedrock}
            >
              Disconnect
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => void testBedrock()}
            disabled={savingBedrock || testingBedrock}
          >
            {testingBedrock ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={closeDialog} disabled={savingBedrock}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void saveBedrock()}
            disabled={savingBedrock || testingBedrock}
          >
            {savingBedrock ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
