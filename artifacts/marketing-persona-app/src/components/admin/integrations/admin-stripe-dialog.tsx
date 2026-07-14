"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IntegrationIconBox } from "@/components/integrations/integration-tile";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { EnvManagedBanner, SecretField, SourceNote } from "./admin-integrations-shared";

export function AdminStripeDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings, status, closeDialog, toggle, saveStripe, clearStored,
    savingToggle, savingStripe,
    stripeSecretKey, setStripeSecretKey,
    stripeWebhookSecret, setStripeWebhookSecret,
    stripePriceGrowth, setStripePriceGrowth,
    stripePriceScale, setStripePriceScale,
    showStripeManualKey, setShowStripeManualKey,
    disconnectingStripe, disconnectStripeOAuth,
  } = controller;
  if (!settings || !status) return null;
  const stripeStoredInDb =
    status.stripe.secretKey.source === "db" ||
    status.stripe.connect.connected ||
    status.stripe.webhookSecret.source === "db" ||
    status.stripe.priceGrowthMonthly.source === "db" ||
    status.stripe.priceScaleMonthly.source === "db";

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="stripe" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>Stripe</DialogTitle>
            <DialogDescription className="mt-1">
              Checkout, subscriptions, and customer portal.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
       <div className="space-y-4 py-4">
        {status.stripe.managedByEnv ? (
          <EnvManagedBanner envVars={status.stripe.envVars} />
        ) : (
          <>
            {status.stripe.connectAvailable ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 space-y-3">
                {status.stripe.connect.connected ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Stripe connected</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {status.stripe.connect.accountId}
                        {status.stripe.connect.livemode != null
                          ? ` · ${status.stripe.connect.livemode ? "Live" : "Test"}`
                          : null}
                      </p>
                      {status.stripe.connect.lastFour ? (
                        <p className="text-[11px] text-muted-foreground">
                          Access token ends with ••••{status.stripe.connect.lastFour}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/api/admin/stripe-connect">Reconnect</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={disconnectingStripe}
                        onClick={() => void disconnectStripeOAuth()}
                      >
                        {disconnectingStripe ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Connect your Stripe account to enable billing without pasting a secret
                      key.
                    </p>
                    <Button size="sm" asChild>
                      <Link href="/api/admin/stripe-connect">Connect with Stripe</Link>
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2.5">
                Set <span className="font-mono">STRIPE_CONNECT_CLIENT_ID</span> in env
                (Stripe Dashboard → Connect → Settings) to enable one-click Connect.
              </p>
            )}
             {!status.stripe.connect.connected ? (
              <div className="space-y-2">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowStripeManualKey((value) => !value)}
                >
                  {showStripeManualKey ? "Hide manual API key" : "Or enter secret key manually"}
                </button>
                {showStripeManualKey ? (
                  <SourceNote
                    configured={status.stripe.secretKey.configured}
                    source={status.stripe.secretKey.source}
                    lastFour={status.stripe.secretKey.lastFour}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        )}
         <div className="space-y-3">
          {!status.stripe.managedByEnv && showStripeManualKey && !status.stripe.connect.connected ? (
            <SecretField
              id="stripe-secret-key"
              label="Secret key"
              placeholder={
                status.stripe.secretKey.configured
                  ? "Leave blank to keep current key"
                  : "sk_live_… or sk_test_…"
              }
              value={stripeSecretKey}
              onChange={setStripeSecretKey}
            />
          ) : null}
          <SecretField
            id="stripe-webhook-secret"
            label="Webhook signing secret"
            placeholder={
              status.stripe.webhookSecret.configured
                ? "Leave blank to keep current secret"
                : "whsec_…"
            }
            value={stripeWebhookSecret}
            onChange={setStripeWebhookSecret}
            disabled={status.stripe.managedByEnv}
          />
          <div className="space-y-1.5">
            <Label htmlFor="stripe-price-growth" className="text-xs">
              Growth monthly price ID
            </Label>
            <Input
              id="stripe-price-growth"
              placeholder="price_…"
              value={stripePriceGrowth}
              disabled={status.stripe.managedByEnv}
              onChange={(e) => setStripePriceGrowth(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stripe-price-scale" className="text-xs">
              Scale monthly price ID
            </Label>
            <Input
              id="stripe-price-scale"
              placeholder="price_…"
              value={stripePriceScale}
              disabled={status.stripe.managedByEnv}
              onChange={(e) => setStripePriceScale(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
         <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://dashboard.stripe.com/settings/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Stripe Connect settings
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex items-center gap-2">
            <Label htmlFor="stripe-enabled" className="text-xs text-muted-foreground">
              Enabled
            </Label>
            <Switch
              id="stripe-enabled"
              checked={settings.stripeBillingEnabled}
              disabled={savingToggle === "stripeBillingEnabled"}
              onCheckedChange={(checked) => void toggle("stripeBillingEnabled", checked)}
            />
          </div>
        </div>
      </div>
       <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {stripeStoredInDb && !status.stripe.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("stripe")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {status.stripe.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!status.stripe.managedByEnv ? (
            <Button size="sm" disabled={savingStripe} onClick={() => void saveStripe()}>
              {savingStripe ? (
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
