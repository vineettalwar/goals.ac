import { PlatformIntegrationBrandIcon } from "./brand-icon";
import { IntegrationIconBox } from "@workspace/app-shell";
import { EnvManagedBanner, EnvVarChecklist } from "./shared";
import { ToggleSwitch, btnOutline } from "./dialogs-shared";
import type { AdminIntegrationsController } from "./use-controller";

export function GeminiDialog({ controller }: { controller: AdminIntegrationsController }) {
  const { closeDialog, definitions } = controller;
  const definition = definitions.find((item) => item.id === "gemini");
  if (!definition) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="gemini" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Google Gemini</p>
          <p className="text-sm text-muted-foreground">
            Platform key for generations when an organization has not added its own. Set{" "}
            <code className="text-xs">GEMINI_API_KEY</code> as a Worker secret.
          </p>
        </div>
      </div>

      <EnvManagedBanner envVars={definition.envVars.map((item) => item.name)} />
      <EnvVarChecklist envVars={definition.envVars} />

      <div className="flex justify-end">
        <button type="button" className={btnOutline} onClick={closeDialog}>
          Close
        </button>
      </div>
    </div>
  );
}

export function GoogleDialog({ controller }: { controller: AdminIntegrationsController }) {
  const { settings, closeDialog, toggle, savingToggle, definitions } = controller;
  if (!settings) return null;
  const definition = definitions.find((item) => item.id === "google");
  if (!definition) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="google" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Google</p>
          <p className="text-sm text-muted-foreground">
            Same OAuth client as Google login. Projects use it for Search Console.
          </p>
        </div>
      </div>

      <EnvManagedBanner envVars={definition.envVars.map((item) => item.name)} />
      <EnvVarChecklist envVars={definition.envVars} />

      <ToggleSwitch
        id="google-enabled"
        label="Allow Google login and Search Console"
        checked={settings.googleIntegrationsEnabled}
        disabled={savingToggle === "googleIntegrationsEnabled"}
        onChange={(checked) => void toggle("googleIntegrationsEnabled", checked)}
      />

      <div className="flex justify-end">
        <button type="button" className={btnOutline} onClick={closeDialog}>
          Close
        </button>
      </div>
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
