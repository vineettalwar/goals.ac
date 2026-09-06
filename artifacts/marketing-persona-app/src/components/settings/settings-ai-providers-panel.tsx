"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cpu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockByokPanel } from "@/components/settings/stock-byok-panel";
import { DeeplByokPanel } from "@/components/settings/deepl-byok-panel";
import { PublicApiKeysPanel } from "@/components/settings/public-api-keys-panel";
import { SettingsAiGeminiSection } from "@/components/settings/settings-ai-gemini-section";
import { SettingsAiOpenAISection } from "@/components/settings/settings-ai-openai-section";
import { SettingsAiAnthropicSection } from "@/components/settings/settings-ai-anthropic-section";
import { SettingsAiBedrockSection } from "@/components/settings/settings-ai-bedrock-section";
import { SettingsAiSemrushSection } from "@/components/settings/settings-ai-semrush-section";
import { useActiveProject } from "@/context/use-active-project";
import type { AiProviderStatus } from "@/components/settings/settings-types";
import type { SettingsInitialData } from "@/lib/server/loaders";

type AiProviderChoice = "gemini" | "bedrock" | "ollama" | "openai" | "anthropic";

function normalizeProviderChoice(value: string | null | undefined): AiProviderChoice {
  if (value === "bedrock") return "bedrock";
  if (value === "ollama") return "ollama";
  if (value === "openai") return "openai";
  if (value === "anthropic") return "anthropic";
  return "gemini";
}

interface AiProvidersPanelProps {
  canManage: boolean;
  initialData?: SettingsInitialData | null;
}

export function SettingsAiProvidersPanel({ canManage, initialData }: AiProvidersPanelProps) {
  const { activeProject } = useActiveProject();

  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(initialData?.aiStatus ?? null);
  const [selectedProvider, setSelectedProvider] = useState<AiProviderChoice>(() => {
    if (!initialData?.aiStatus) return "gemini";
    const saved = initialData.aiStatus.settings?.provider;
    return normalizeProviderChoice(saved ?? initialData.aiStatus.activeProvider);
  });
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(
    initialData?.aiStatus?.settings?.ollamaBaseUrl ??
      initialData?.aiStatus?.envFallback?.ollamaBaseUrl ??
      "http://localhost:11434",
  );
  const [ollamaModel, setOllamaModel] = useState(
    initialData?.aiStatus?.settings?.ollamaModel ??
      initialData?.aiStatus?.envFallback?.ollamaModel ??
      "",
  );
  const [providerSaving, setProviderSaving] = useState(false);

  useEffect(() => {
    if (initialData) return;
    fetch("/api/ai-providers/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((aiData) => {
        if (!aiData) return;
        setAiStatus(aiData);
        setSelectedProvider(normalizeProviderChoice(aiData.settings?.provider ?? aiData.activeProvider));
        setOllamaBaseUrl(aiData.settings?.ollamaBaseUrl ?? aiData.envFallback?.ollamaBaseUrl ?? "http://localhost:11434");
        setOllamaModel(aiData.settings?.ollamaModel ?? aiData.envFallback?.ollamaModel ?? "");
      });
  }, [initialData]);

  async function saveAiProvider() {
    setProviderSaving(true);
    const res = await fetch("/api/ai-providers/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: selectedProvider,
        ollamaBaseUrl: selectedProvider === "ollama" ? ollamaBaseUrl : null,
        ollamaModel: selectedProvider === "ollama" ? ollamaModel : null,
      }),
    });
    setProviderSaving(false);
    if (!res.ok) { toast.error("Failed to save AI provider"); return; }
    setAiStatus(await res.json());
    toast.success("AI provider updated");
  }

  const activeProvider = aiStatus?.activeProvider ?? "gemini";

  return (
    <>
      {/* Active provider selector */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Cpu className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="font-semibold">Active AI provider</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose which provider powers generation for your organization. All projects in your org share this setting.
                {!canManage && " Only site admins can change these settings."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai-provider">Provider</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value) => setSelectedProvider(value as AiProviderChoice)}
                disabled={!canManage}
              >
                <SelectTrigger id="ai-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="bedrock">AWS Bedrock</SelectItem>
                  <SelectItem value="ollama">Ollama (local)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedProvider === "ollama" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ollama-url">Ollama URL</Label>
                  <Input
                    id="ollama-url"
                    value={ollamaBaseUrl}
                    onChange={(e) => setOllamaBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ollama-model">Model</Label>
                  <Input
                    id="ollama-model"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder={aiStatus?.envFallback?.ollamaModel ?? "gemma4:e2b"}
                    disabled={!canManage}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  Currently using: <span className="capitalize text-primary">{activeProvider}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Source:{" "}
                  {aiStatus?.source === "app"
                    ? "organization settings"
                    : aiStatus?.source === "env"
                      ? "environment fallback"
                      : "auto-detected"}
                </p>
              </div>
              {canManage && (
                <Button onClick={saveAiProvider} disabled={providerSaving}>
                  {providerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save provider"}
                </Button>
              )}
            </div>

            {aiStatus?.envFallback?.provider && !aiStatus.settings.provider && (
              <p className="text-xs text-muted-foreground">
                Env fallback:{" "}
                <code className="px-1 py-0.5 rounded bg-muted">
                  AI_PROVIDER={aiStatus.envFallback.provider}
                </code>
              </p>
            )}
          </div>
        </div>
      </div>

      <SettingsAiGeminiSection
        canManage={canManage}
        initialHasKey={initialData?.me?.hasGeminiKey}
        initialLastFour={initialData?.apiKey?.lastFour}
      />
      <SettingsAiOpenAISection
        canManage={canManage}
        initialHasKey={initialData?.openaiCredentials?.hasKey}
        initialLastFour={initialData?.openaiCredentials?.lastFour}
        onAiStatusChange={setAiStatus}
      />
      <SettingsAiAnthropicSection
        canManage={canManage}
        initialHasKey={initialData?.anthropicCredentials?.hasKey}
        initialLastFour={initialData?.anthropicCredentials?.lastFour}
        onAiStatusChange={setAiStatus}
      />
      <SettingsAiBedrockSection
        canManage={canManage}
        initialHasCredentials={initialData?.bedrockCredentials?.hasCredentials}
        initialAccessKeyLastFour={initialData?.bedrockCredentials?.accessKeyLastFour}
        initialModel={initialData?.bedrockCredentials?.model ?? ""}
        onAiStatusChange={setAiStatus}
      />
      <SettingsAiSemrushSection
        canManage={canManage}
        initialHasCredentials={initialData?.semrushCredentials?.hasCredentials}
        initialApiKeyLastFour={initialData?.semrushCredentials?.apiKeyLastFour}
        initialDatabase={initialData?.semrushCredentials?.database ?? "us"}
        activeProject={activeProject}
      />

      <DeeplByokPanel scope="org" canManage={canManage} />
      <PublicApiKeysPanel canManage={canManage} />
      <div className="paper-card p-6">
        <StockByokPanel
          scope="org"
          canManage={canManage}
          billingFilter="free"
          title="Optional Unsplash / Pexels overrides"
          description="By default, free stock photos use platform-wide keys. Add your own Unsplash or Pexels developer keys here for higher rate limits or compliance."
        />
      </div>

      {/* Provider status */}
      {aiStatus && (
        <div className="paper-card p-6 space-y-3 text-sm">
          <h2 className="font-semibold">Provider status</h2>
          <div className="flex justify-between">
            <span>Gemini (platform)</span>
            <span className={aiStatus.gemini.configured ? "text-emerald-600" : "text-muted-foreground"}>
              {aiStatus.gemini.configured ? `Configured (${aiStatus.gemini.source})` : "Not configured"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Bedrock</span>
            <span className={aiStatus.bedrock.configured ? "text-emerald-600" : "text-muted-foreground"}>
              {aiStatus.bedrock.configured
                ? `Configured (${aiStatus.bedrock.source ?? "env"})`
                : "Not configured"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Ollama ({aiStatus.ollama.baseUrl})</span>
            <span className={aiStatus.ollama.reachable ? "text-emerald-600" : "text-muted-foreground"}>
              {aiStatus.ollama.reachable ? "Reachable" : "Unreachable"}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
