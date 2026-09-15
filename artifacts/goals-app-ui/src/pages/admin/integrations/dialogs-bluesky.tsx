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
