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
