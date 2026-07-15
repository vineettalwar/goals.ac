"use client";

import { ExternalLink } from "lucide-react";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IntegrationIconBox } from "@/components/integrations/integration-tile";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { EnvManagedBanner, EnvVarChecklist } from "./admin-integrations-shared";

export function AdminEnvIntegrationDialog({ controller }: { controller: AdminIntegrationsController }) {
  const { settings, activeDialog, activeDefinition, closeDialog, toggle, savingToggle } = controller;
  if (!settings || !activeDefinition || activeDefinition.kind !== "env") return null;
  if (
    activeDialog === "stripe" ||
    activeDialog === "resend" ||
    activeDialog === "unsplash" ||
    activeDialog === "pexels" ||
    activeDialog === "linkedin" ||
    activeDialog === "twitter" ||
    activeDialog === "meta"
  ) {
    return null;
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id={activeDefinition.id} />
          </IntegrationIconBox>
          <div>
            <DialogTitle>{activeDefinition.label}</DialogTitle>
            <DialogDescription className="mt-1">
              {activeDefinition.description}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
       <div className="space-y-4 py-4">
        <EnvManagedBanner
          envVars={activeDefinition.envVars.map((envVar) => envVar.name)}
        />
        <EnvVarChecklist envVars={activeDefinition.envVars} />
         <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          {activeDefinition.docsUrl ? (
            <a
              href={activeDefinition.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Developer docs
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span />
          )}
          {activeDefinition.settingsKey ? (
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`${activeDefinition.id}-enabled`}
                className="text-xs text-muted-foreground"
              >
                Enabled
              </Label>
              <Switch
                id={`${activeDefinition.id}-enabled`}
                checked={settings[activeDefinition.settingsKey]}
                disabled={savingToggle === activeDefinition.settingsKey}
                onCheckedChange={(checked) =>
                  void toggle(activeDefinition.settingsKey!, checked)
                }
              />
            </div>
          ) : null}
        </div>
      </div>
       <DialogFooter>
        <Button size="sm" variant="outline" onClick={closeDialog}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}
