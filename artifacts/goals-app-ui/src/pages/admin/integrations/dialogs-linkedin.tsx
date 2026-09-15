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
