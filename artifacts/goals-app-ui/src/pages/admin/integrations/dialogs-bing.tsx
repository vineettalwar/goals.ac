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
  ToggleSwitch,
} from "./dialogs-shared";

export function BingDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    settings,
    status,
    closeDialog,
    toggle,
    saveBing,
    clearStored,
    savingBing,
    savingToggle,
    bingClientId,
    setBingClientId,
    bingClientSecret,
    setBingClientSecret,
  } = controller;
  if (!settings || !status) return null;

  const storedInDb =
    status.bing.clientId.source === "db" || status.bing.clientSecret.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="bing" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Bing Webmaster Tools</p>
          <p className="text-sm text-muted-foreground">
            OAuth client so projects can connect Bing Webmaster and open AI Performance reports.
          </p>
        </div>
      </div>

      {status.bing.managedByEnv ? (
        <EnvManagedBanner envVars={status.bing.envVars} />
      ) : (
        <SourceNote
          configured={status.bing.clientId.configured && status.bing.clientSecret.configured}
          source={status.bing.clientSecret.source ?? status.bing.clientId.source}
          lastFour={status.bing.clientSecret.lastFour}
        />
      )}

      <div className="space-y-2">
        <label htmlFor="bing-client-id" className="block text-xs font-medium">
          Client ID
        </label>
        <input
          id="bing-client-id"
          value={bingClientId}
          onChange={(e) => setBingClientId(e.target.value)}
          placeholder="Bing Webmaster OAuth client ID"
          disabled={status.bing.managedByEnv}
          autoComplete="off"
          className={`${inputClassName} font-mono text-xs`}
        />
      </div>
      <SecretField
        id="bing-client-secret"
        label="Client secret"
        placeholder={
          status.bing.clientSecret.configured
            ? "Leave blank to keep the current secret"
            : "Bing Webmaster OAuth client secret"
        }
        value={bingClientSecret}
        onChange={setBingClientSecret}
        disabled={status.bing.managedByEnv}
      />

      <ToggleSwitch
        id="bing-enabled"
        label="Allow project Bing Webmaster connections"
        checked={settings.bingWebmasterEnabled}
        disabled={savingToggle === "bingWebmasterEnabled"}
        onChange={(checked) => void toggle("bingWebmasterEnabled", checked)}
      />

      <p className="text-xs text-muted-foreground">
        Register at Bing Webmaster → Settings → API Access → OAuth Client. Redirect URI:{" "}
        <code className="rounded bg-muted px-1 py-0.5">
          https://api.goals.ac/api/auth/bing-webmaster/callback
        </code>
      </p>

      <DialogFooterRow
        left={
          storedInDb && !status.bing.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("bing")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {status.bing.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!status.bing.managedByEnv ? (
              <button
                type="button"
                disabled={savingBing}
                onClick={() => void saveBing()}
                className={btnPrimary}
              >
                {savingBing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}
