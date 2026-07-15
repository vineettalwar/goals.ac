import { useEffect, useRef, type ReactNode } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { IntegrationIconBox } from "@workspace/app-shell";
import { inputClassName } from "@workspace/app-shell";
import { PlatformIntegrationBrandIcon } from "./brand-icon";
import { EnvManagedBanner, SecretField, SourceNote } from "./shared";
import type { AdminIntegrationsController } from "./use-controller";

// ---------------------------------------------------------------------------
// Local wider dialog (max-w-xl) — SimpleDialog from app-shell is max-w-md
// ---------------------------------------------------------------------------

function AdminDialog({
  open,
  title,
  onClose,
  loading,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  loading?: boolean;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className="paper-card fixed left-1/2 top-1/2 z-50 m-0 max-h-[88vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border p-6 shadow-lg backdrop:bg-black/20 backdrop:backdrop-blur-sm"
      onClose={() => !loading && onClose()}
      onCancel={(e) => { if (loading) e.preventDefault(); }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Button helpers
// ---------------------------------------------------------------------------

const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50";
const btnOutline =
  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 disabled:opacity-50";

function DialogFooterRow({ left, right }: { left?: ReactNode; right: ReactNode }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
      <div className="flex flex-wrap gap-2">{left}</div>
      <div className="flex flex-wrap gap-2">{right}</div>
    </div>
  );
}

function ExternalDocsLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch (native)
// ---------------------------------------------------------------------------

function ToggleSwitch({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-primary" : "bg-input"}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------

function StripeDialog({ controller }: { controller: AdminIntegrationsController }) {
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

function ResendDialog({ controller }: { controller: AdminIntegrationsController }) {
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

// ---------------------------------------------------------------------------
// Unsplash
// ---------------------------------------------------------------------------

function UnsplashDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    status,
    closeDialog,
    saveUnsplash,
    clearStored,
    savingUnsplash,
    unsplashAccessKey,
    setUnsplashAccessKey,
  } = controller;
  if (!status) return null;

  const storedInDb = status.unsplash.accessKey.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="unsplash" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Unsplash</p>
          <p className="text-sm text-muted-foreground">Free stock photos for article featured images.</p>
        </div>
      </div>

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

      <div className="flex items-center border-t border-border/60 pt-3">
        <ExternalDocsLink href="https://unsplash.com/developers" label="Unsplash developers" />
      </div>

      <DialogFooterRow
        left={
          storedInDb && !status.unsplash.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("unsplash")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.unsplash.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.unsplash.managedByEnv ? (
              <button
                type="button"
                disabled={savingUnsplash}
                onClick={() => void saveUnsplash()}
                className={btnPrimary}
              >
                {savingUnsplash ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pexels
// ---------------------------------------------------------------------------

function PexelsDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    status,
    closeDialog,
    savePexels,
    clearStored,
    savingPexels,
    pexelsApiKey,
    setPexelsApiKey,
  } = controller;
  if (!status) return null;

  const storedInDb = status.pexels.apiKey.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="pexels" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Pexels</p>
          <p className="text-sm text-muted-foreground">Free stock photos for article featured images.</p>
        </div>
      </div>

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
          status.pexels.apiKey.configured ? "Leave blank to keep current key" : "Pexels API key"
        }
        value={pexelsApiKey}
        onChange={setPexelsApiKey}
        disabled={status.pexels.managedByEnv}
      />

      <div className="flex items-center border-t border-border/60 pt-3">
        <ExternalDocsLink href="https://www.pexels.com/api/" label="Pexels API" />
      </div>

      <DialogFooterRow
        left={
          storedInDb && !status.pexels.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("pexels")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.pexels.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.pexels.managedByEnv ? (
              <button
                type="button"
                disabled={savingPexels}
                onClick={() => void savePexels()}
                className={btnPrimary}
              >
                {savingPexels ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkedIn
// ---------------------------------------------------------------------------

function LinkedInDialog({ controller }: { controller: AdminIntegrationsController }) {
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

  const storedInDb =
    status.linkedin.clientId.source === "db" || status.linkedin.clientSecret.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="linkedin" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">LinkedIn</p>
          <p className="text-sm text-muted-foreground">
            OAuth app credentials so projects can connect LinkedIn and publish posts.
          </p>
        </div>
      </div>

      {status.linkedin.managedByEnv ? (
        <EnvManagedBanner envVars={status.linkedin.envVars} />
      ) : (
        <SourceNote
          configured={status.linkedin.clientId.configured && status.linkedin.clientSecret.configured}
          source={status.linkedin.clientSecret.source ?? status.linkedin.clientId.source}
          lastFour={status.linkedin.clientSecret.lastFour}
        />
      )}

      <div className="space-y-2">
        <label htmlFor="linkedin-client-id" className="block text-xs font-medium">
          Client ID
        </label>
        <input
          id="linkedin-client-id"
          value={linkedinClientId}
          onChange={(e) => setLinkedinClientId(e.target.value)}
          placeholder="LinkedIn app Client ID"
          disabled={status.linkedin.managedByEnv}
          autoComplete="off"
          className={`${inputClassName} font-mono text-xs`}
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
        <ExternalDocsLink href="https://www.linkedin.com/developers/" label="LinkedIn developers" />
        <ToggleSwitch
          id="linkedin-enabled"
          label="Social publishing"
          checked={settings.socialPublishingEnabled}
          disabled={savingToggle === "socialPublishingEnabled"}
          onChange={(checked) => void toggle("socialPublishingEnabled", checked)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Redirect URI:{" "}
        <code className="rounded bg-muted px-1 py-0.5">
          {"{APP_URL}/api/auth/linkedin/callback"}
        </code>
      </p>

      <DialogFooterRow
        left={
          storedInDb && !status.linkedin.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("linkedin")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.linkedin.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.linkedin.managedByEnv ? (
              <button
                type="button"
                disabled={savingLinkedIn}
                onClick={() => void saveLinkedIn()}
                className={btnPrimary}
              >
                {savingLinkedIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Twitter / X
// ---------------------------------------------------------------------------

function TwitterDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveTwitter,
    clearStored,
    savingTwitter,
    savingToggle,
    twitterClientId,
    setTwitterClientId,
    twitterClientSecret,
    setTwitterClientSecret,
  } = controller;
  if (!settings || !status) return null;

  const storedInDb =
    status.twitter.clientId.source === "db" || status.twitter.clientSecret.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="twitter" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">X</p>
          <p className="text-sm text-muted-foreground">
            OAuth app credentials so projects can connect X and publish posts.
          </p>
        </div>
      </div>

      {status.twitter.managedByEnv ? (
        <EnvManagedBanner envVars={status.twitter.envVars} />
      ) : (
        <SourceNote
          configured={status.twitter.clientId.configured && status.twitter.clientSecret.configured}
          source={status.twitter.clientSecret.source ?? status.twitter.clientId.source}
          lastFour={status.twitter.clientSecret.lastFour}
        />
      )}

      <div className="space-y-2">
        <label htmlFor="twitter-client-id" className="block text-xs font-medium">
          Client ID
        </label>
        <input
          id="twitter-client-id"
          value={twitterClientId}
          onChange={(e) => setTwitterClientId(e.target.value)}
          placeholder="X app Client ID"
          disabled={status.twitter.managedByEnv}
          autoComplete="off"
          className={`${inputClassName} font-mono text-xs`}
        />
      </div>
      <SecretField
        id="twitter-client-secret"
        label="Client secret"
        placeholder={
          status.twitter.clientSecret.configured
            ? "Leave blank to keep current secret"
            : "X app Client Secret"
        }
        value={twitterClientSecret}
        onChange={setTwitterClientSecret}
        disabled={status.twitter.managedByEnv}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <ExternalDocsLink href="https://developer.x.com/" label="X developer portal" />
        <ToggleSwitch
          id="twitter-enabled"
          label="Social publishing"
          checked={settings.socialPublishingEnabled}
          disabled={savingToggle === "socialPublishingEnabled"}
          onChange={(checked) => void toggle("socialPublishingEnabled", checked)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Redirect URI:{" "}
        <code className="rounded bg-muted px-1 py-0.5">
          {"{APP_URL}/api/auth/twitter/callback"}
        </code>
      </p>

      <DialogFooterRow
        left={
          storedInDb && !status.twitter.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("twitter")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.twitter.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.twitter.managedByEnv ? (
              <button
                type="button"
                disabled={savingTwitter}
                onClick={() => void saveTwitter()}
                className={btnPrimary}
              >
                {savingTwitter ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

function MetaDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveMeta,
    clearStored,
    savingMeta,
    savingToggle,
    metaAppId,
    setMetaAppId,
    metaAppSecret,
    setMetaAppSecret,
  } = controller;
  if (!settings || !status) return null;

  const storedInDb = status.meta.appId.source === "db" || status.meta.appSecret.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="meta" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Meta</p>
          <p className="text-sm text-muted-foreground">
            OAuth app credentials so projects can connect Facebook Pages and Instagram.
          </p>
        </div>
      </div>

      {status.meta.managedByEnv ? (
        <EnvManagedBanner envVars={status.meta.envVars} />
      ) : (
        <SourceNote
          configured={status.meta.appId.configured && status.meta.appSecret.configured}
          source={status.meta.appSecret.source ?? status.meta.appId.source}
          lastFour={status.meta.appSecret.lastFour}
        />
      )}

      <div className="space-y-2">
        <label htmlFor="meta-app-id" className="block text-xs font-medium">
          App ID
        </label>
        <input
          id="meta-app-id"
          value={metaAppId}
          onChange={(e) => setMetaAppId(e.target.value)}
          placeholder="Meta app ID"
          disabled={status.meta.managedByEnv}
          autoComplete="off"
          className={`${inputClassName} font-mono text-xs`}
        />
      </div>
      <SecretField
        id="meta-app-secret"
        label="App secret"
        placeholder={
          status.meta.appSecret.configured
            ? "Leave blank to keep current secret"
            : "Meta app secret"
        }
        value={metaAppSecret}
        onChange={setMetaAppSecret}
        disabled={status.meta.managedByEnv}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <ExternalDocsLink href="https://developers.facebook.com/" label="Meta for Developers" />
        <ToggleSwitch
          id="meta-enabled"
          label="Social publishing"
          checked={settings.socialPublishingEnabled}
          disabled={savingToggle === "socialPublishingEnabled"}
          onChange={(checked) => void toggle("socialPublishingEnabled", checked)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Redirect URI:{" "}
        <code className="rounded bg-muted px-1 py-0.5">
          {"{APP_URL}/api/auth/meta/callback"}
        </code>
      </p>

      <DialogFooterRow
        left={
          storedInDb && !status.meta.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("meta")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.meta.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.meta.managedByEnv ? (
              <button
                type="button"
                disabled={savingMeta}
                onClick={() => void saveMeta()}
                className={btnPrimary}
              >
                {savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bluesky
// ---------------------------------------------------------------------------

function BlueskyDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveBluesky,
    clearStored,
    savingBluesky,
    savingToggle,
    blueskyClientName,
    setBlueskyClientName,
    blueskyPrivateKeyJwk,
    setBlueskyPrivateKeyJwk,
  } = controller;
  if (!settings || !status) return null;

  const storedInDb =
    status.bluesky.privateKeyJwk.source === "db" || status.bluesky.clientName.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="bluesky" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Bluesky</p>
          <p className="text-sm text-muted-foreground">
            Stable AT Protocol OAuth signing key so project Connect survives restarts.
          </p>
        </div>
      </div>

      {status.bluesky.managedByEnv ? (
        <EnvManagedBanner envVars={status.bluesky.envVars} />
      ) : (
        <SourceNote
          configured={status.bluesky.privateKeyJwk.configured}
          source={status.bluesky.privateKeyJwk.source ?? status.bluesky.clientName.source}
          lastFour={status.bluesky.privateKeyJwk.lastFour}
        />
      )}

      <div className="space-y-2">
        <label htmlFor="bluesky-client-name" className="block text-xs font-medium">
          Client name
        </label>
        <input
          id="bluesky-client-name"
          value={blueskyClientName}
          onChange={(e) => setBlueskyClientName(e.target.value)}
          placeholder="goals.ac"
          disabled={status.bluesky.managedByEnv}
          autoComplete="off"
          className={inputClassName}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bluesky-private-key-jwk" className="block text-xs font-medium">
          Private key JWK
        </label>
        <textarea
          id="bluesky-private-key-jwk"
          value={blueskyPrivateKeyJwk}
          onChange={(e) => setBlueskyPrivateKeyJwk(e.target.value)}
          placeholder={
            status.bluesky.privateKeyJwk.configured
              ? "Leave blank to keep current key"
              : '{"kty":"RSA",...}'
          }
          disabled={status.bluesky.managedByEnv}
          autoComplete="off"
          className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <ExternalDocsLink
          href="https://docs.bsky.app/docs/advanced-guides/oauth-client"
          label="Bluesky OAuth docs"
        />
        <ToggleSwitch
          id="bluesky-enabled"
          label="Social publishing"
          checked={settings.socialPublishingEnabled}
          disabled={savingToggle === "socialPublishingEnabled"}
          onChange={(checked) => void toggle("socialPublishingEnabled", checked)}
        />
      </div>

      <DialogFooterRow
        left={
          storedInDb && !status.bluesky.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("bluesky")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.bluesky.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.bluesky.managedByEnv ? (
              <button
                type="button"
                disabled={savingBluesky}
                onClick={() => void saveBluesky()}
                className={btnPrimary}
              >
                {savingBluesky ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AWS Bedrock
// ---------------------------------------------------------------------------

function BedrockDialog({ controller }: { controller: AdminIntegrationsController }) {
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
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="bedrock" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">AWS Bedrock</p>
          <p className="text-sm text-muted-foreground">
            Store platform Bedrock credentials and grant selected organizations access when they lack
            their own BYOK keys.
          </p>
        </div>
      </div>

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
          <label htmlFor="bedrock-access-key" className="block text-xs font-medium">
            Access key ID
          </label>
          <input
            id="bedrock-access-key"
            value={bedrockAccessKeyId}
            onChange={(e) => setBedrockAccessKeyId(e.target.value)}
            placeholder={
              status.bedrock.accessKeyId.configured ? "Leave blank to keep current key" : "AKIA..."
            }
            disabled={status.bedrock.managedByEnv}
            autoComplete="off"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="bedrock-secret-key" className="block text-xs font-medium">
            Secret access key
          </label>
          <input
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
            className={inputClassName}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="bedrock-session-token" className="block text-xs font-medium">
            Session token (optional)
          </label>
          <input
            id="bedrock-session-token"
            value={bedrockSessionToken}
            onChange={(e) => setBedrockSessionToken(e.target.value)}
            placeholder="Temporary session token"
            disabled={status.bedrock.managedByEnv}
            autoComplete="off"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="bedrock-region" className="block text-xs font-medium">
            Region
          </label>
          <input
            id="bedrock-region"
            value={bedrockRegion}
            onChange={(e) => setBedrockRegion(e.target.value)}
            placeholder="us-east-1"
            disabled={status.bedrock.managedByEnv}
            autoComplete="off"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="bedrock-model" className="block text-xs font-medium">
            Model
          </label>
          <input
            id="bedrock-model"
            value={bedrockModel}
            onChange={(e) => setBedrockModel(e.target.value)}
            placeholder="anthropic.claude-3-5-sonnet-20240620-v1:0"
            disabled={status.bedrock.managedByEnv}
            autoComplete="off"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-3">
        <label htmlFor="bedrock-org-search" className="block text-sm font-medium">
          Share with organizations
        </label>
        <p className="text-xs text-muted-foreground">
          Granted orgs can use this platform Bedrock key when they have no org BYOK. Usage counts as
          platform-key quota.
        </p>
        <input
          id="bedrock-org-search"
          value={bedrockOrgSearch}
          onChange={(e) => setBedrockOrgSearch(e.target.value)}
          placeholder="Search organizations…"
          autoComplete="off"
          className={inputClassName}
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
          {bedrockGrantedOrgIds.size} organization{bedrockGrantedOrgIds.size === 1 ? "" : "s"} selected
        </p>
      </div>

      <div className="flex items-center border-t border-border/60 pt-3">
        <ExternalDocsLink href="https://docs.aws.amazon.com/bedrock/" label="Bedrock docs" />
      </div>

      <DialogFooterRow
        left={
          <>
            {storedInDb && !status.bedrock.managedByEnv ? (
              <button
                type="button"
                className={btnOutline}
                onClick={() => void clearStored("bedrock")}
                disabled={savingBedrock || testingBedrock}
              >
                Disconnect
              </button>
            ) : null}
            <button
              type="button"
              className={btnOutline}
              onClick={() => void testBedrock()}
              disabled={savingBedrock || testingBedrock}
            >
              {testingBedrock ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
            </button>
          </>
        }
        right={
          <>
            <button
              type="button"
              className={btnOutline}
              onClick={closeDialog}
              disabled={savingBedrock}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveBedrock()}
              disabled={savingBedrock || testingBedrock}
              className={btnPrimary}
            >
              {savingBedrock ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </button>
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root dialogs mount
// ---------------------------------------------------------------------------

const DIALOG_TITLES: Record<string, string> = {
  stripe: "Stripe",
  resend: "Resend",
  unsplash: "Unsplash",
  pexels: "Pexels",
  linkedin: "LinkedIn",
  twitter: "X",
  meta: "Meta",
  bluesky: "Bluesky",
  bedrock: "AWS Bedrock",
};

export function AdminIntegrationsDialogs({
  controller,
}: {
  controller: AdminIntegrationsController;
}) {
  const { activeDialog, closeDialog } = controller;

  return (
    <AdminDialog
      open={activeDialog != null}
      title={activeDialog ? (DIALOG_TITLES[activeDialog] ?? activeDialog) : ""}
      onClose={closeDialog}
    >
      {activeDialog === "stripe" && <StripeDialog controller={controller} />}
      {activeDialog === "resend" && <ResendDialog controller={controller} />}
      {activeDialog === "unsplash" && <UnsplashDialog controller={controller} />}
      {activeDialog === "pexels" && <PexelsDialog controller={controller} />}
      {activeDialog === "linkedin" && <LinkedInDialog controller={controller} />}
      {activeDialog === "twitter" && <TwitterDialog controller={controller} />}
      {activeDialog === "meta" && <MetaDialog controller={controller} />}
      {activeDialog === "bluesky" && <BlueskyDialog controller={controller} />}
      {activeDialog === "bedrock" && <BedrockDialog controller={controller} />}
    </AdminDialog>
  );
}
