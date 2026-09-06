import { Loader2 } from "lucide-react";
import { IntegrationIconBox } from "@workspace/app-shell";
import { PlatformIntegrationBrandIcon } from "./brand-icon";
import { EnvManagedBanner, SecretField, SourceNote } from "./shared";
import type { AdminIntegrationsController } from "./use-controller";
import { btnPrimary, btnOutline, DialogFooterRow, ExternalDocsLink } from "./dialogs-shared";

// ---------------------------------------------------------------------------
// Unsplash
// ---------------------------------------------------------------------------

export function UnsplashDialog({ controller }: { controller: AdminIntegrationsController }) {
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

export function PexelsDialog({ controller }: { controller: AdminIntegrationsController }) {
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
