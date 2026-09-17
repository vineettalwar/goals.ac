"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { PlatformIntegrationBrandIcon } from "@/components/integrations/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntegrationIconBox } from "@/components/integrations/integration-tile";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { EnvManagedBanner, SecretField, SourceNote } from "./admin-integrations-shared";
import type { PlatformAiKeyStatus, PlatformOllamaStatus } from "@/lib/platform/platform-ai-credentials";

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

export function AdminAiProviderDialog({ controller }: { controller: AdminIntegrationsController }) {
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

  const providerStatus = status[activeDefinition.id] as PlatformAiKeyStatus;
  const storedInDb = providerStatus.apiKey.source === "db" || providerStatus.model?.source === "db";
  const showModel = MODEL_SUPPORTED.has(activeDefinition.id);

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id={activeDefinition.id} />
          </IntegrationIconBox>
          <div>
            <DialogTitle>{activeDefinition.label}</DialogTitle>
            <DialogDescription className="mt-1">{activeDefinition.description}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
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
            <Label htmlFor={`${activeDefinition.id}-model`}>Default model</Label>
            <Input
              id={`${activeDefinition.id}-model`}
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder={providerStatus.model?.value ?? "Optional model id"}
              disabled={providerStatus.managedByEnv}
              className="font-mono text-xs"
              autoComplete="off"
            />
          </div>
        ) : null}
        {activeDefinition.docsUrl ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
            <a
              href={activeDefinition.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Developer docs
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {storedInDb && !providerStatus.managedByEnv ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void clearStored(activeDefinition.id as AiKeyProviderId)}
            >
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {providerStatus.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!providerStatus.managedByEnv ? (
            <Button
              size="sm"
              disabled={savingAiProvider}
              onClick={() => void saveAiProvider(activeDefinition.id as AiKeyProviderId)}
            >
              {savingAiProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
            </Button>
          ) : null}
        </div>
      </DialogFooter>
    </>
  );
}

export function AdminOllamaDialog({ controller }: { controller: AdminIntegrationsController }) {
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
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <IntegrationIconBox className="border-0 bg-transparent p-0">
            <PlatformIntegrationBrandIcon id="ollama" />
          </IntegrationIconBox>
          <div>
            <DialogTitle>Ollama</DialogTitle>
            <DialogDescription className="mt-1">
              Local or self-hosted Ollama for platform fallback.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 py-4">
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
          <Label htmlFor="ollama-base-url">Base URL</Label>
          <Input
            id="ollama-base-url"
            value={ollamaBaseUrl}
            onChange={(e) => setOllamaBaseUrl(e.target.value)}
            placeholder={providerStatus.baseUrl.value ?? "https://ollama.example.com"}
            disabled={providerStatus.managedByEnv}
            className="font-mono text-xs"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ollama-model">Default model</Label>
          <Input
            id="ollama-model"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            placeholder={providerStatus.model.value ?? "llama3.2"}
            disabled={providerStatus.managedByEnv}
            className="font-mono text-xs"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <a
            href="https://ollama.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ollama docs
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {storedInDb && !providerStatus.managedByEnv ? (
            <Button size="sm" variant="outline" onClick={() => void clearStored("ollama")}>
              Remove stored values
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={closeDialog}>
            {providerStatus.managedByEnv ? "Close" : "Cancel"}
          </Button>
          {!providerStatus.managedByEnv ? (
            <Button size="sm" disabled={savingAiProvider} onClick={() => void saveOllama()}>
              {savingAiProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
            </Button>
          ) : null}
        </div>
      </DialogFooter>
    </>
  );
}
