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
// LinkedIn
// ---------------------------------------------------------------------------

export function LinkedInDialog({ controller }: { controller: AdminIntegrationsController }) {
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

export function TwitterDialog({ controller }: { controller: AdminIntegrationsController }) {
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

export function MetaDialog({ controller }: { controller: AdminIntegrationsController }) {
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

export function BlueskyDialog({ controller }: { controller: AdminIntegrationsController }) {
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
