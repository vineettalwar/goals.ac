import { Loader2 } from "lucide-react";
import { IntegrationIconBox } from "@workspace/app-shell";
import { inputClassName } from "@workspace/app-shell";
import { PlatformIntegrationBrandIcon } from "./brand-icon";
import { EnvManagedBanner, SecretField, SourceNote } from "./shared";
import type { AdminIntegrationsController } from "./use-controller";
import {
  btnPrimary,
  btnOutline,
  DialogFooterRow,
  ExternalDocsLink,
  ToggleSwitch,
} from "./dialogs-shared";

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------

export function StripeDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveStripe,
    clearStored,
    savingToggle,
    savingStripe,
    stripeSecretKey,
    setStripeSecretKey,
    stripeWebhookSecret,
    setStripeWebhookSecret,
    stripePriceGrowth,
    setStripePriceGrowth,
    stripePriceScale,
    setStripePriceScale,
    showStripeManualKey,
    setShowStripeManualKey,
    disconnectingStripe,
    disconnectStripeOAuth,
    stripeConnectHref,
  } = controller;
  if (!settings || !status) return null;

  const stripeStoredInDb =
    status.stripe.secretKey.source === "db" ||
    status.stripe.connect.connected ||
    status.stripe.webhookSecret.source === "db" ||
    status.stripe.priceGrowthMonthly.source === "db" ||
    status.stripe.priceScaleMonthly.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="stripe" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Stripe</p>
          <p className="text-sm text-muted-foreground">Checkout, subscriptions, and customer portal.</p>
        </div>
      </div>

      {status.stripe.managedByEnv ? (
        <EnvManagedBanner envVars={status.stripe.envVars} />
      ) : (
        <>
          {status.stripe.connectAvailable ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
              {status.stripe.connect.connected ? (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Stripe connected</p>
                    <p className="font-mono text-xs text-muted-foreground">
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
                    <a href={stripeConnectHref} className={btnOutline}>
                      Reconnect
                    </a>
                    <button
                      type="button"
                      disabled={disconnectingStripe}
                      onClick={() => void disconnectStripeOAuth()}
                      className={btnOutline}
                    >
                      {disconnectingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Connect your Stripe account to enable billing without pasting a secret key.
                  </p>
                  <a href={stripeConnectHref} className={btnPrimary}>
                    Connect with Stripe
                  </a>
                </>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
              Set <span className="font-mono">STRIPE_CONNECT_CLIENT_ID</span> in env (Stripe Dashboard
              → Connect → Settings) to enable one-click Connect.
            </p>
          )}

          {!status.stripe.connect.connected ? (
            <div className="space-y-2">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowStripeManualKey((v) => !v)}
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
              status.stripe.secretKey.configured ? "Leave blank to keep current key" : "sk_live_…"
            }
            value={stripeSecretKey}
            onChange={setStripeSecretKey}
          />
        ) : null}
        <SecretField
          id="stripe-webhook-secret"
          label="Webhook signing secret"
          placeholder={
            status.stripe.webhookSecret.configured ? "Leave blank to keep current secret" : "whsec_…"
          }
          value={stripeWebhookSecret}
          onChange={setStripeWebhookSecret}
          disabled={status.stripe.managedByEnv}
        />
        <div className="space-y-1.5">
          <label htmlFor="stripe-price-growth" className="block text-xs font-medium">
            Growth monthly price ID
          </label>
          <input
            id="stripe-price-growth"
            placeholder="price_…"
            value={stripePriceGrowth}
            disabled={status.stripe.managedByEnv}
            onChange={(e) => setStripePriceGrowth(e.target.value)}
            className={`${inputClassName} font-mono text-xs`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="stripe-price-scale" className="block text-xs font-medium">
            Scale monthly price ID
          </label>
          <input
            id="stripe-price-scale"
            placeholder="price_…"
            value={stripePriceScale}
            disabled={status.stripe.managedByEnv}
            onChange={(e) => setStripePriceScale(e.target.value)}
            className={`${inputClassName} font-mono text-xs`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <ExternalDocsLink href="https://dashboard.stripe.com/settings/connect" label="Stripe Connect settings" />
        <ToggleSwitch
          id="stripe-enabled"
          label="Enabled"
          checked={settings.stripeBillingEnabled}
          disabled={savingToggle === "stripeBillingEnabled"}
          onChange={(checked) => void toggle("stripeBillingEnabled", checked)}
        />
      </div>

      <DialogFooterRow
        left={
          stripeStoredInDb && !status.stripe.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("stripe")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.stripe.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.stripe.managedByEnv ? (
              <button
                type="button"
                disabled={savingStripe}
                onClick={() => void saveStripe()}
                className={btnPrimary}
              >
                {savingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

export function ResendDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveResend,
    clearStored,
    savingToggle,
    savingResend,
    resendApiKey,
    setResendApiKey,
    resendFromEmail,
    setResendFromEmail,
  } = controller;
  if (!settings || !status) return null;

  const resendStoredInDb =
    status.resend.apiKey.source === "db" || status.resend.fromEmail.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="resend" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Resend</p>
          <p className="text-sm text-muted-foreground">Password resets, invites, and notifications.</p>
        </div>
      </div>

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
          placeholder={status.resend.apiKey.configured ? "Leave blank to keep current key" : "re_…"}
          value={resendApiKey}
          onChange={setResendApiKey}
          disabled={status.resend.managedByEnv}
        />
        <div className="space-y-1.5">
          <label htmlFor="resend-from-email" className="block text-xs font-medium">
            From address
          </label>
          <input
            id="resend-from-email"
            type="email"
            placeholder="noreply@yourdomain.com"
            value={resendFromEmail}
            disabled={status.resend.managedByEnv}
            onChange={(e) => setResendFromEmail(e.target.value)}
            className={`${inputClassName} text-xs`}
          />
          <p className="text-[11px] text-muted-foreground">
            Must be a verified sender in Resend. Defaults to noreply@goals.ac if empty.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <ExternalDocsLink href="https://resend.com/api-keys" label="Resend dashboard" />
        <ToggleSwitch
          id="resend-enabled"
          label="Enabled"
          checked={settings.emailEnabled}
          disabled={savingToggle === "emailEnabled"}
          onChange={(checked) => void toggle("emailEnabled", checked)}
        />
      </div>

      <DialogFooterRow
        left={
          resendStoredInDb && !status.resend.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("resend")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.resend.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.resend.managedByEnv ? (
              <button
                type="button"
                disabled={savingResend}
                onClick={() => void saveResend()}
                className={btnPrimary}
              >
                {savingResend ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}
