import { IntegrationIconBox } from "@workspace/app-shell";
import { inputClassName } from "@workspace/app-shell";
import { PlatformIntegrationBrandIcon } from "./brand-icon";
import { EnvManagedBanner, SecretField, SourceNote } from "./shared";
import { ToggleSwitch, btnOutline, btnPrimary, DialogFooterRow } from "./dialogs-shared";
import type { AdminIntegrationsController } from "./use-controller";
import { Loader2 } from "lucide-react";

/** @deprecated Env-only AI dialog — replaced by AiProviderDialog in dialogs-ai.tsx */
export function EnvAiProviderDialog({ controller }: { controller: AdminIntegrationsController }) {
  const { closeDialog, activeDefinition } = controller;
  if (!activeDefinition || activeDefinition.kind !== "env") return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id={activeDefinition.id} />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">{activeDefinition.label}</p>
          <p className="text-sm text-muted-foreground">{activeDefinition.description}</p>
        </div>
      </div>

      <EnvManagedBanner envVars={activeDefinition.envVars.map((item) => item.name)} />

      <div className="flex justify-end">
        <button type="button" className={btnOutline} onClick={closeDialog}>
          Close
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use EnvAiProviderDialog */
export function GeminiDialog({ controller }: { controller: AdminIntegrationsController }) {
  return <EnvAiProviderDialog controller={controller} />;
}

export function GoogleDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveGoogle,
    clearStored,
    savingGoogle,
    savingToggle,
    googleClientId,
    setGoogleClientId,
    googleClientSecret,
    setGoogleClientSecret,
  } = controller;
  if (!settings || !status) return null;

  const storedInDb =
    status.google.clientId.source === "db" || status.google.clientSecret.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="google" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Google</p>
          <p className="text-sm text-muted-foreground">
            OAuth client for Google login, Search Console, Analytics, and Sheets.
          </p>
        </div>
      </div>

      {status.google.managedByEnv ? (
        <EnvManagedBanner envVars={status.google.envVars} />
      ) : (
        <SourceNote
          configured={status.google.clientId.configured && status.google.clientSecret.configured}
          source={status.google.clientSecret.source ?? status.google.clientId.source}
          lastFour={status.google.clientSecret.lastFour}
        />
      )}

      <div className="space-y-2">
        <label htmlFor="google-client-id" className="block text-xs font-medium">
          Client ID
        </label>
        <input
          id="google-client-id"
          value={googleClientId}
          onChange={(e) => setGoogleClientId(e.target.value)}
          placeholder="Google OAuth client ID"
          disabled={status.google.managedByEnv}
          autoComplete="off"
          className={`${inputClassName} font-mono text-xs`}
        />
      </div>
      <SecretField
        id="google-client-secret"
        label="Client secret"
        placeholder={
          status.google.clientSecret.configured
            ? "Leave blank to keep the current secret"
            : "Google OAuth client secret"
        }
        value={googleClientSecret}
        onChange={setGoogleClientSecret}
        disabled={status.google.managedByEnv}
      />

      <ToggleSwitch
        id="google-enabled"
        label="Allow Google login and Search Console"
        checked={settings.googleIntegrationsEnabled}
        disabled={savingToggle === "googleIntegrationsEnabled"}
        onChange={(checked) => void toggle("googleIntegrationsEnabled", checked)}
      />

      <p className="text-xs text-muted-foreground">
        Redirect URIs:{" "}
        <code className="rounded bg-muted px-1 py-0.5">https://api.goals.ac/api/auth/google/callback</code>
        {", "}
        <code className="rounded bg-muted px-1 py-0.5">
          https://api.goals.ac/api/auth/google-search-console/callback
        </code>
        {", "}
        <code className="rounded bg-muted px-1 py-0.5">
          https://api.goals.ac/api/auth/google-analytics/callback
        </code>
        {", "}
        <code className="rounded bg-muted px-1 py-0.5">https://api.goals.ac/api/auth/google-sheets/callback</code>
      </p>

      <DialogFooterRow
        left={
          storedInDb && !status.google.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("google")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.google.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.google.managedByEnv ? (
              <button
                type="button"
                disabled={savingGoogle}
                onClick={() => void saveGoogle()}
                className={btnPrimary}
              >
                {savingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}

export function MastodonDialog({ controller }: { controller: AdminIntegrationsController }) {
  const { closeDialog } = controller;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="mastodon" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Mastodon</p>
          <p className="text-sm text-muted-foreground">
            Each project registers with its own Mastodon instance. There is no platform-wide app
            client.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Turn on social publishing, then connect Mastodon from a project&apos;s Integrations → Social
        tab.
      </p>
      <div className="flex justify-end">
        <button type="button" className={btnOutline} onClick={closeDialog}>
          Close
        </button>
      </div>
    </div>
  );
}
