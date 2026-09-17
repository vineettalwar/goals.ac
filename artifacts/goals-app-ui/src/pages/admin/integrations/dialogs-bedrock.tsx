import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { IntegrationIconBox } from "@workspace/app-shell";
import { inputClassName } from "@workspace/app-shell";
import { apiFetch } from "@/lib/api";
import { PlatformIntegrationBrandIcon } from "./brand-icon";
import { EnvManagedBanner, SecretField, SourceNote } from "./shared";
import type { AdminIntegrationsController } from "./use-controller";
import { btnPrimary, btnOutline, DialogFooterRow, ExternalDocsLink } from "./dialogs-shared";

const BEDROCK_MODEL_CUSTOM = "__custom__";

type BedrockModelChoice = { id: string; label: string };

export function BedrockDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    status,
    closeDialog,
    saveBedrock,
    clearStored,
    testBedrock,
    savingBedrock,
    testingBedrock,
    bedrockApiKey,
    setBedrockApiKey,
    bedrockModel,
    setBedrockModel,
    bedrockOrgSearch,
    setBedrockOrgSearch,
    bedrockOrgOptions,
    bedrockGrantedOrgIds,
    toggleBedrockGrantedOrg,
  } = controller;
  const [forceCustomModel, setForceCustomModel] = useState(false);
  const [accountModels, setAccountModels] = useState<BedrockModelChoice[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const knownIds = useMemo(() => new Set(accountModels.map((m) => m.id)), [accountModels]);
  const showCustom = forceCustomModel || Boolean(bedrockModel && !knownIds.has(bedrockModel));
  const selectValue = showCustom ? BEDROCK_MODEL_CUSTOM : bedrockModel;

  useEffect(() => {
    if (!status || status.bedrock.managedByEnv) return;
    const trimmed = bedrockApiKey.trim();
    if ((trimmed.length > 0 && trimmed.length < 16) || (!trimmed && !status.bedrock.configured)) {
      setAccountModels([]);
      setModelsError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setModelsLoading(true);
      setModelsError(null);
      try {
        const data = await apiFetch<{ models?: BedrockModelChoice[] }>(
          "/api/admin/platform-integrations/bedrock-models",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(trimmed.length >= 16 ? { apiKey: trimmed } : {}),
          },
        );
        if (cancelled) return;
        const models = data.models ?? [];
        setAccountModels(models);
        setBedrockModel((current) => current || models[0]?.id || current);
      } catch (err) {
        if (cancelled) return;
        setAccountModels([]);
        setModelsError(err instanceof Error ? err.message : "Could not load models for this account");
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // ponytail: omit bedrockModel — auto-fill uses the setter so a pick does not refetch
  }, [status, bedrockApiKey, setBedrockModel]);

  if (!status) return null;

  const storedInDb =
    status.bedrock.secretAccessKey.source === "db" || status.bedrock.accessKeyId.source === "db";
  const filteredOrgs = bedrockOrgOptions.filter((org) => {
    const q = bedrockOrgSearch.trim().toLowerCase();
    if (!q) return true;
    return org.name.toLowerCase().includes(q) || String(org.id).includes(q);
  });
  const canTest = Boolean(bedrockApiKey.trim() || status.bedrock.configured);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id="bedrock" />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">AWS Bedrock</p>
          <p className="text-sm text-muted-foreground">
            Store a platform Bedrock API key, choose a model, and grant selected organizations
            access when they lack their own BYOK keys.
          </p>
        </div>
      </div>

      {status.bedrock.managedByEnv ? (
        <EnvManagedBanner envVars={status.bedrock.envVars} />
      ) : (
        <SourceNote
          configured={status.bedrock.configured}
          source={status.bedrock.secretAccessKey.source ?? status.bedrock.accessKeyId.source}
          lastFour={status.bedrock.secretAccessKey.lastFour ?? status.bedrock.accessKeyId.lastFour}
        />
      )}

      <SecretField
        id="bedrock-api-key"
        label="Bedrock API key"
        placeholder={
          status.bedrock.configured ? "Leave blank to keep current key" : "Paste Bedrock API key"
        }
        value={bedrockApiKey}
        onChange={setBedrockApiKey}
        disabled={status.bedrock.managedByEnv}
        hint="Use a long-term Bedrock API key from the AWS console (not a short-term key — those expire with your console session)."
      />

      <div className="space-y-2">
        <label htmlFor="bedrock-model" className="block text-xs font-medium">
          Model
        </label>
        <select
          id="bedrock-model"
          value={selectValue}
          onChange={(e) => {
            const value = e.target.value;
            if (value === BEDROCK_MODEL_CUSTOM) {
              setForceCustomModel(true);
              if (knownIds.has(bedrockModel)) setBedrockModel("");
              return;
            }
            setForceCustomModel(false);
            setBedrockModel(value);
          }}
          disabled={status.bedrock.managedByEnv || modelsLoading}
          className={inputClassName}
        >
          <option value="">
            {modelsLoading
              ? "Loading models for this account…"
              : accountModels.length === 0
                ? "Paste API key to load models"
                : "Choose a Bedrock model"}
          </option>
          {accountModels.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
          <option value={BEDROCK_MODEL_CUSTOM}>Custom model id…</option>
        </select>
        {modelsError ? <p className="text-xs text-muted-foreground">{modelsError}</p> : null}
        {showCustom ? (
          <input
            id="bedrock-model-custom"
            value={bedrockModel}
            onChange={(e) => setBedrockModel(e.target.value)}
            placeholder="e.g. amazon.nova-lite-v1:0"
            disabled={status.bedrock.managedByEnv}
            autoComplete="off"
            className={`${inputClassName} font-mono text-sm`}
          />
        ) : null}
        <p className="text-xs text-muted-foreground">
          Only models enabled for this AWS account are listed.
        </p>
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
        <ExternalDocsLink
          href="https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html"
          label="Bedrock API key docs"
        />
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
              disabled={savingBedrock || testingBedrock || !canTest}
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
