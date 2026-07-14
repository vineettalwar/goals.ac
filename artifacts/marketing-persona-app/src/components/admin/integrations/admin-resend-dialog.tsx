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

export function AdminResendDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings, status, closeDialog, toggle, saveResend, clearStored,
    savingToggle, savingResend,
    resendApiKey, setResendApiKey, resendFromEmail, setResendFromEmail,
  } = controller;
  if (!settings || !status) return null;
  const resendStoredInDb = status.resend.apiKey.source === "db" || status.resend.fromEmail.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="resend" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>Resend</DialogTitle>
            <DialogDescription className="mt-1">
              Password resets, invites, and notifications.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
       <div className="space-y-4 py-4">
        {status.resend.managedByEnv ? (
          <EnvManagedBanner envVars={status.resend.envVars} />
        ) : (
          <SourceNote
            configured={status.resend.apiKey.configured}
            source={status.resend.apiKey.source}
            lastFour={status.resend.apiKey.lastFour}
          />
        )}
         <div className="space-y-3">
          <SecretField
            id="resend-api-key"
            label="API key"
            placeholder={
              status.resend.apiKey.configured ? "Leave blank to keep current key" : "re_…"
            }
            value={resendApiKey}
            onChange={setResendApiKey}
            disabled={status.resend.managedByEnv}
          />
          <div className="space-y-1.5">
            <Label htmlFor="resend-from-email" className="text-xs">
              From address
            </Label>
            <Input
              id="resend-from-email"
              type="email"
              placeholder="noreply@yourdomain.com"
              value={resendFromEmail}
              disabled={status.resend.managedByEnv}
              onChange={(e) => setResendFromEmail(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Must be a verified sender in Resend. Defaults to noreply@goals.ac if empty.
            </p>
          </div>
        </div>
         <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://resend.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Resend dashboard
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex items-center gap-2">
            <Label htmlFor="resend-enabled" className="text-xs text-muted-foreground">
              Enabled
            </Label>
            <Switch
              id="resend-enabled"
              checked={settings.emailEnabled}
              disabled={savingToggle === "emailEnabled"}
              onCheckedChange={(checked) => void toggle("emailEnabled", checked)}
            />
          </div>
        </div>
      </div>
       <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {resendStoredInDb && !status.resend.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("resend")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.resend.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.resend.managedByEnv ? (
            <Button size="sm" disabled={savingResend} onClick={() => void saveResend()}>
              {savingResend ? (
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
