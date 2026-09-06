import { Loader2 } from "lucide-react";
import { IntegrationIconBox } from "@workspace/app-shell";
import { inputClassName } from "@workspace/app-shell";
import { PlatformIntegrationBrandIcon } from "./brand-icon";
import { EnvManagedBanner, SourceNote } from "./shared";
import type { AdminIntegrationsController } from "./use-controller";
import { btnPrimary, btnOutline, DialogFooterRow, ExternalDocsLink } from "./dialogs-shared";

// ---------------------------------------------------------------------------
// AWS Bedrock
// ---------------------------------------------------------------------------

export function BedrockDialog({ controller }: { controller: AdminIntegrationsController }) {
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
