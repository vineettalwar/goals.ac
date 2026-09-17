import { Loader2 } from "lucide-react";
import { IntegrationIconBox, inputClassName } from "@workspace/app-shell";
import { PlatformIntegrationBrandIcon } from "./brand-icon";
import { EnvManagedBanner, SecretField, SourceNote } from "./shared";
import type { AdminIntegrationsController } from "./use-controller";
import { btnPrimary, btnOutline, DialogFooterRow, ExternalDocsLink } from "./dialogs-shared";
import type { PlatformAiKeyStatus, PlatformIntegrationId, PlatformOllamaStatus } from "./types";

const AI_KEY_PROVIDERS = [
  "gemini",
  "openai",
  "anthropic",
  "openrouter",
  "groq",
  "nvidia",
] as const;

type AiKeyProviderId = (typeof AI_KEY_PROVIDERS)[number];

const MODEL_SUPPORTED = new Set<AiKeyProviderId>(["openrouter", "groq", "nvidia"]);

function isAiKeyProvider(id: string): id is AiKeyProviderId {
  return (AI_KEY_PROVIDERS as readonly string[]).includes(id);
}

function aiKeyStatus(
  status: NonNullable<AdminIntegrationsController["status"]>,
  id: AiKeyProviderId,
): PlatformAiKeyStatus {
  return status[id];
}

/** Shared credential dialog for platform AI API-key providers. */
export function AiProviderDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    status,
    activeDefinition,
    closeDialog,
    clearStored,
    saveAiProvider,
    savingAiProvider,
    aiApiKey,
    setAiApiKey,
    aiModel,
    setAiModel,
  } = controller;

  if (!status || !activeDefinition || !isAiKeyProvider(activeDefinition.id)) return null;

  const providerStatus = aiKeyStatus(status, activeDefinition.id);
  const storedInDb = providerStatus.apiKey.source === "db" || providerStatus.model?.source === "db";
  const showModel = MODEL_SUPPORTED.has(activeDefinition.id);

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

      {providerStatus.managedByEnv ? (
        <EnvManagedBanner envVars={providerStatus.envVars} />
      ) : (
        <SourceNote
          configured={providerStatus.apiKey.configured}
          source={providerStatus.apiKey.source}
          lastFour={providerStatus.apiKey.lastFour}
        />
      )}

      <SecretField
        id={`${activeDefinition.id}-api-key`}
        label="API key"
        placeholder={
          providerStatus.apiKey.configured
            ? "Leave blank to keep the current key"
            : `${activeDefinition.label} API key`
        }
        value={aiApiKey}
        onChange={setAiApiKey}
        disabled={providerStatus.managedByEnv}
      />

      {showModel ? (
        <div className="space-y-2">
          <label htmlFor={`${activeDefinition.id}-model`} className="block text-xs font-medium">
            Default model
          </label>
          <input
            id={`${activeDefinition.id}-model`}
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            placeholder={providerStatus.model?.value ?? "Optional model id"}
            disabled={providerStatus.managedByEnv}
            autoComplete="off"
            className={`${inputClassName} font-mono text-xs`}
          />
        </div>
      ) : null}

      {activeDefinition.docsUrl ? (
        <div className="flex items-center border-t border-border/60 pt-3">
          <ExternalDocsLink href={activeDefinition.docsUrl} label={`${activeDefinition.label} docs`} />
        </div>
      ) : null}

      <DialogFooterRow
        left={
          storedInDb && !providerStatus.managedByEnv ? (
            <button
              type="button"
              className={btnOutline}
              onClick={() => void clearStored(activeDefinition.id as AiKeyProviderId)}
            >
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {providerStatus.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!providerStatus.managedByEnv ? (
              <button
                type="button"
                disabled={savingAiProvider}
                onClick={() => void saveAiProvider(activeDefinition.id as AiKeyProviderId)}
                className={btnPrimary}
              >
                {savingAiProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}

export function OllamaDialog({ controller }: { controller: AdminIntegrationsController }) {
  const {
    status,
    closeDialog,
    clearStored,
    saveOllama,
    savingAiProvider,
    ollamaBaseUrl,
    setOllamaBaseUrl,
    aiModel,
    setAiModel,
  } = controller;
  if (!status) return null;

  const providerStatus: PlatformOllamaStatus = status.ollama;
  const storedInDb =
    providerStatus.baseUrl.source === "db" || providerStatus.model.source === "db";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <IntegrationIconBox className="border-0 bg-transparent p-0">
          <PlatformIntegrationBrandIcon id={"ollama" satisfies PlatformIntegrationId} />
        </IntegrationIconBox>
        <div>
          <p className="font-medium">Ollama</p>
          <p className="text-sm text-muted-foreground">
            Local or self-hosted Ollama for platform fallback.
          </p>
        </div>
      </div>

      {providerStatus.managedByEnv ? (
        <EnvManagedBanner envVars={providerStatus.envVars} />
      ) : (
        <SourceNote
          configured={providerStatus.configured}
          source={providerStatus.baseUrl.source ?? providerStatus.model.source}
          lastFour={null}
        />
      )}

      <div className="space-y-2">
        <label htmlFor="ollama-base-url" className="block text-xs font-medium">
          Base URL
        </label>
        <input
          id="ollama-base-url"
          value={ollamaBaseUrl}
          onChange={(e) => setOllamaBaseUrl(e.target.value)}
          placeholder={providerStatus.baseUrl.value ?? "https://ollama.example.com"}
          disabled={providerStatus.managedByEnv}
          autoComplete="off"
          className={`${inputClassName} font-mono text-xs`}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="ollama-model" className="block text-xs font-medium">
          Default model
        </label>
        <input
          id="ollama-model"
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          placeholder={providerStatus.model.value ?? "llama3.2"}
          disabled={providerStatus.managedByEnv}
          autoComplete="off"
          className={`${inputClassName} font-mono text-xs`}
        />
      </div>

      <div className="flex items-center border-t border-border/60 pt-3">
        <ExternalDocsLink href="https://ollama.com/" label="Ollama docs" />
      </div>

      <DialogFooterRow
        left={
          storedInDb && !providerStatus.managedByEnv ? (
            <button type="button" className={btnOutline} onClick={() => void clearStored("ollama")}>
              Remove stored values
            </button>
          ) : undefined
        }
        right={
          <>
            <button type="button" className={btnOutline} onClick={closeDialog}>
              {providerStatus.managedByEnv ? "Close" : "Cancel"}
            </button>
            {!providerStatus.managedByEnv ? (
              <button
                type="button"
                disabled={savingAiProvider}
                onClick={() => void saveOllama()}
                className={btnPrimary}
              >
                {savingAiProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
}
