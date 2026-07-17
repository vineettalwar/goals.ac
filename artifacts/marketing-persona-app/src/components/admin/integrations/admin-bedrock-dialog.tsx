"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  BEDROCK_MODEL_CHOICES,
  BEDROCK_MODEL_CUSTOM,
} from "@workspace/ai-providers/bedrock-models";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    bedrockApiKey,
    setBedrockApiKey,
    bedrockModel,
    setBedrockModel,
    bedrockOrgSearch,
    setBedrockOrgSearch,
    bedrockOrgOptions,
    bedrockGrantedOrgIds,
    toggleBedrockGrantedOrg,
  } = controller;

  const [forceCustomModel, setForceCustomModel] = useState(false);

  const knownIds = useMemo(() => new Set<string>(BEDROCK_MODEL_CHOICES.map((c) => c.id)), []);
  const showCustom =
    forceCustomModel ||
    Boolean(bedrockModel && !knownIds.has(bedrockModel));
  const selectValue = showCustom
    ? BEDROCK_MODEL_CUSTOM
    : bedrockModel || undefined;

  if (!status) return null;

  const storedInDb =
    status.bedrock.secretAccessKey.source === "db" || status.bedrock.accessKeyId.source === "db";
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
              Store a platform Bedrock API key, choose a model, and grant selected organizations
              access when they lack their own BYOK keys.
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
            source={status.bedrock.secretAccessKey.source ?? status.bedrock.accessKeyId.source}
            lastFour={
              status.bedrock.secretAccessKey.lastFour ?? status.bedrock.accessKeyId.lastFour
            }
          />
        )}
        <div className="space-y-2">
          <Label htmlFor="bedrock-api-key">Bedrock API key</Label>
          <Input
            id="bedrock-api-key"
            type="password"
            value={bedrockApiKey}
            onChange={(e) => setBedrockApiKey(e.target.value)}
            placeholder={
              status.bedrock.configured ? "Leave blank to keep current key" : "Paste Bedrock API key"
            }
            disabled={status.bedrock.managedByEnv}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            Use a <strong>long-term</strong> Bedrock API key from the AWS console (not a short-term
            key — those expire with your console session, within 12 hours).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bedrock-model">Model</Label>
          <Select
            value={selectValue}
            onValueChange={(value) => {
              if (value === BEDROCK_MODEL_CUSTOM) {
                setForceCustomModel(true);
                if (knownIds.has(bedrockModel)) {
                  setBedrockModel("");
                }
                return;
              }
              setForceCustomModel(false);
              setBedrockModel(value);
            }}
            disabled={status.bedrock.managedByEnv}
          >
            <SelectTrigger id="bedrock-model">
              <SelectValue placeholder="Choose a Bedrock model" />
            </SelectTrigger>
            <SelectContent>
              {BEDROCK_MODEL_CHOICES.map((choice) => (
                <SelectItem key={choice.id} value={choice.id}>
                  {choice.label}
                </SelectItem>
              ))}
              <SelectItem value={BEDROCK_MODEL_CUSTOM}>Custom model id…</SelectItem>
            </SelectContent>
          </Select>
          {showCustom ? (
            <Input
              id="bedrock-model-custom"
              value={bedrockModel}
              onChange={(e) => setBedrockModel(e.target.value)}
              placeholder="e.g. us.anthropic.claude-sonnet-4-20250514-v1:0"
              disabled={status.bedrock.managedByEnv}
              autoComplete="off"
              className="font-mono text-sm"
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            Required for Test and generation. Use an inference profile id enabled in your AWS
            account/region.
          </p>
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
            href="https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Bedrock API key docs
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
            disabled={savingBedrock || testingBedrock || !bedrockModel.trim()}
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
