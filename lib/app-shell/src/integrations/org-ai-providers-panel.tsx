import { useEffect, useState, type ReactNode } from "react";
import { SettingsGeminiDialog } from "../settings/settings-gemini-dialog";
import {
  SettingsBedrockDialog,
  type BedrockCredentialsForm,
} from "../settings/settings-bedrock-dialog";
import {
  SettingsProviderKeyDialog,
  type ProviderKeyDialogConfig,
} from "../settings/settings-provider-key-dialog";
import type { AiProviderChoice, SettingsAiSummary } from "../settings/types";
import { AiProviderIcon } from "./integration-icons";
import { IntegrationTile } from "./integration-tiles";

const AI_PROVIDER_OPTIONS: Array<{ value: AiProviderChoice; label: string }> = [
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI (ChatGPT)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "bedrock", label: "AWS Bedrock" },
  { value: "ollama", label: "Ollama (local)" },
];

const OPENAI_KEY_DIALOG: ProviderKeyDialogConfig = {
  providerLabel: "OpenAI",
  inputId: "openai-api-key",
  dialogTitleId: "openai-key-dialog-title",
  placeholder: "sk-…",
  helpText: "Get a key at",
  helpUrl: "https://platform.openai.com/api-keys",
  helpLinkLabel: "platform.openai.com",
  removeConfirmMessage: "Remove the organization OpenAI API key?",
  permissionMessage: "Only organization owners and site admins can manage the OpenAI API key.",
};

const ANTHROPIC_KEY_DIALOG: ProviderKeyDialogConfig = {
  providerLabel: "Anthropic",
  inputId: "anthropic-api-key",
  dialogTitleId: "anthropic-key-dialog-title",
  placeholder: "sk-ant-…",
  helpText: "Get a key at",
  helpUrl: "https://console.anthropic.com/settings/keys",
  helpLinkLabel: "console.anthropic.com",
  removeConfirmMessage: "Remove the organization Anthropic API key?",
  permissionMessage: "Only organization owners and site admins can manage the Anthropic API key.",
};

function normalizeProviderChoice(value: string | null | undefined): AiProviderChoice {
  if (value === "openai" || value === "anthropic" || value === "bedrock" || value === "ollama") {
    return value;
  }
  return "gemini";
}

function keySummary(connected: boolean, lastFour: string | null | undefined, extra?: string): string {
  if (!connected) return "Add organization key";
  const base = `Ending in ••••${lastFour ?? "••••"}`;
  return extra ? `${base} · ${extra}` : base;
}

export type OrgAiProvidersPanelProps = {
  aiSummary: SettingsAiSummary | null;
  canManageGeminiKey?: boolean;
  canManageProviderKeys?: boolean;
  canManageProvider?: boolean;
  onSaveGeminiKey?: (key: string) => Promise<void>;
  onDeleteGeminiKey?: () => Promise<void>;
  onTestGeminiKey?: (key: string) => Promise<{ ok: boolean; error?: string }>;
  geminiSaving?: boolean;
  geminiDeleting?: boolean;
  onSaveOpenaiKey?: (key: string) => Promise<void>;
  onDeleteOpenaiKey?: () => Promise<void>;
  onTestOpenaiKey?: (key: string) => Promise<{ ok: boolean; error?: string }>;
  openaiSaving?: boolean;
  openaiDeleting?: boolean;
  onSaveAnthropicKey?: (key: string) => Promise<void>;
  onDeleteAnthropicKey?: () => Promise<void>;
  onTestAnthropicKey?: (key: string) => Promise<{ ok: boolean; error?: string }>;
  anthropicSaving?: boolean;
  anthropicDeleting?: boolean;
  onSaveBedrockCredentials?: (form: BedrockCredentialsForm) => Promise<void>;
  onDeleteBedrockCredentials?: () => Promise<void>;
  onTestBedrockCredentials?: (
    form: BedrockCredentialsForm,
  ) => Promise<{ ok: boolean; error?: string }>;
  bedrockSaving?: boolean;
  bedrockDeleting?: boolean;
  onSaveProvider?: (input: {
    provider: AiProviderChoice;
    ollamaBaseUrl: string;
    ollamaModel: string;
  }) => Promise<void>;
  providerSaving?: boolean;
  providerMessage?: string | null;
  footerNote?: ReactNode;
};

export function OrgAiProvidersPanel({
  aiSummary,
  canManageGeminiKey = false,
  canManageProviderKeys = false,
  canManageProvider = false,
  onSaveGeminiKey,
  onDeleteGeminiKey,
  onTestGeminiKey,
  geminiSaving = false,
  geminiDeleting = false,
  onSaveOpenaiKey,
  onDeleteOpenaiKey,
  onTestOpenaiKey,
  openaiSaving = false,
  openaiDeleting = false,
  onSaveAnthropicKey,
  onDeleteAnthropicKey,
  onTestAnthropicKey,
  anthropicSaving = false,
  anthropicDeleting = false,
  onSaveBedrockCredentials,
  onDeleteBedrockCredentials,
  onTestBedrockCredentials,
  bedrockSaving = false,
  bedrockDeleting = false,
  onSaveProvider,
  providerSaving = false,
  providerMessage,
  footerNote,
}: OrgAiProvidersPanelProps) {
  const [geminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const [openaiDialogOpen, setOpenaiDialogOpen] = useState(false);
  const [anthropicDialogOpen, setAnthropicDialogOpen] = useState(false);
  const [bedrockDialogOpen, setBedrockDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AiProviderChoice>("gemini");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("");

  useEffect(() => {
    if (!aiSummary) return;
    const saved = aiSummary.settings?.provider;
    setSelectedProvider(normalizeProviderChoice(saved ?? aiSummary.activeProvider));
    setOllamaBaseUrl(
      aiSummary.settings?.ollamaBaseUrl ??
        aiSummary.ollama?.baseUrl ??
        "http://localhost:11434",
    );
    setOllamaModel(aiSummary.settings?.ollamaModel ?? aiSummary.ollama?.model ?? "");
  }, [aiSummary]);

  const active = aiSummary?.activeProvider ?? selectedProvider;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <p className="text-sm text-muted-foreground">
          Click a provider to connect or manage its organization key.
          {!canManageProviderKeys && !canManageGeminiKey
            ? " Only site admins can change these settings."
            : null}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <IntegrationTile
          compact
          icon={<AiProviderIcon provider="gemini" />}
          title="Google Gemini"
          description="Organization BYOK key"
          connected={Boolean(aiSummary?.hasGeminiKey)}
          summary={
            active === "gemini"
              ? `${keySummary(Boolean(aiSummary?.hasGeminiKey), aiSummary?.geminiLastFour)} · active`
              : keySummary(Boolean(aiSummary?.hasGeminiKey), aiSummary?.geminiLastFour)
          }
          onClick={() => {
            if (onSaveGeminiKey) setGeminiDialogOpen(true);
          }}
        />
        <IntegrationTile
          compact
          icon={<AiProviderIcon provider="openai" />}
          title="OpenAI"
          description="Organization BYOK key"
          connected={Boolean(aiSummary?.hasOpenaiKey)}
          summary={
            active === "openai"
              ? `${keySummary(Boolean(aiSummary?.hasOpenaiKey), aiSummary?.openaiLastFour)} · active`
              : keySummary(Boolean(aiSummary?.hasOpenaiKey), aiSummary?.openaiLastFour)
          }
          onClick={() => {
            if (onSaveOpenaiKey) setOpenaiDialogOpen(true);
          }}
        />
        <IntegrationTile
          compact
          icon={<AiProviderIcon provider="anthropic" />}
          title="Anthropic"
          description="Organization BYOK key"
          connected={Boolean(aiSummary?.hasAnthropicKey)}
          summary={
            active === "anthropic"
              ? `${keySummary(Boolean(aiSummary?.hasAnthropicKey), aiSummary?.anthropicLastFour)} · active`
              : keySummary(Boolean(aiSummary?.hasAnthropicKey), aiSummary?.anthropicLastFour)
          }
          onClick={() => {
            if (onSaveAnthropicKey) setAnthropicDialogOpen(true);
          }}
        />
        <IntegrationTile
          compact
          icon={<AiProviderIcon provider="bedrock" />}
          title="AWS Bedrock"
          description="Organization BYOK credentials"
          connected={Boolean(aiSummary?.hasBedrockCredentials)}
          summary={
            active === "bedrock"
              ? `${keySummary(
                  Boolean(aiSummary?.hasBedrockCredentials),
                  aiSummary?.bedrockAccessKeyLastFour,
                  [aiSummary?.bedrockRegion, aiSummary?.bedrockModel].filter(Boolean).join(" · ") ||
                    undefined,
                )} · active`
              : keySummary(
                  Boolean(aiSummary?.hasBedrockCredentials),
                  aiSummary?.bedrockAccessKeyLastFour,
                  [aiSummary?.bedrockRegion, aiSummary?.bedrockModel].filter(Boolean).join(" · ") ||
                    undefined,
                )
          }
          onClick={() => {
            if (onSaveBedrockCredentials) setBedrockDialogOpen(true);
          }}
        />
        <IntegrationTile
          compact
          icon={<AiProviderIcon provider="ollama" />}
          title="Ollama"
          description="Local models"
          connected={active === "ollama"}
          summary={
            active === "ollama"
              ? ollamaModel || ollamaBaseUrl || "Active · configure below"
              : "Select as active provider below"
          }
          onClick={() => setSelectedProvider("ollama")}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <label htmlFor="ai-provider" className="text-sm font-medium">
              Active provider
            </label>
            <select
              id="ai-provider"
              value={selectedProvider}
              onChange={(event) =>
                setSelectedProvider(normalizeProviderChoice(event.target.value))
              }
              disabled={!canManageProvider}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              {AI_PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {canManageProvider && onSaveProvider ? (
            <button
              type="button"
              onClick={() =>
                void onSaveProvider({
                  provider: selectedProvider,
                  ollamaBaseUrl,
                  ollamaModel,
                })
              }
              disabled={providerSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {providerSaving ? "Saving…" : "Save provider"}
            </button>
          ) : null}
        </div>

        {selectedProvider === "ollama" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="ollama-url" className="text-sm font-medium">
                Ollama URL
              </label>
              <input
                id="ollama-url"
                value={ollamaBaseUrl}
                onChange={(event) => setOllamaBaseUrl(event.target.value)}
                placeholder="http://localhost:11434"
                disabled={!canManageProvider}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ollama-model" className="text-sm font-medium">
                Model
              </label>
              <input
                id="ollama-model"
                value={ollamaModel}
                onChange={(event) => setOllamaModel(event.target.value)}
                placeholder={aiSummary?.ollama?.model ?? "llama3.2"}
                disabled={!canManageProvider}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
            </div>
          </div>
        ) : null}

        {aiSummary?.source ? (
          <p className="text-xs text-muted-foreground">
            Currently using{" "}
            <span className="capitalize text-foreground">{aiSummary.activeProvider ?? selectedProvider}</span>
            {" · "}
            {aiSummary.source === "app"
              ? "organization settings"
              : aiSummary.source === "env"
                ? "environment fallback"
                : "auto-detected"}
          </p>
        ) : null}

        {providerMessage ? (
          <p className="text-sm text-muted-foreground">{providerMessage}</p>
        ) : null}
      </div>

      {onSaveGeminiKey && onTestGeminiKey && onDeleteGeminiKey ? (
        <SettingsGeminiDialog
          open={geminiDialogOpen}
          onOpenChange={setGeminiDialogOpen}
          hasGeminiKey={Boolean(aiSummary?.hasGeminiKey)}
          lastFour={aiSummary?.geminiLastFour ?? null}
          onSave={onSaveGeminiKey}
          onDelete={onDeleteGeminiKey}
          onTest={onTestGeminiKey}
          canManage={canManageGeminiKey}
          saving={geminiSaving}
          deleting={geminiDeleting}
        />
      ) : null}

      {onSaveOpenaiKey && onTestOpenaiKey && onDeleteOpenaiKey ? (
        <SettingsProviderKeyDialog
          open={openaiDialogOpen}
          onOpenChange={setOpenaiDialogOpen}
          hasKey={Boolean(aiSummary?.hasOpenaiKey)}
          lastFour={aiSummary?.openaiLastFour ?? null}
          onSave={onSaveOpenaiKey}
          onDelete={onDeleteOpenaiKey}
          onTest={onTestOpenaiKey}
          canManage={canManageProviderKeys}
          saving={openaiSaving}
          deleting={openaiDeleting}
          config={OPENAI_KEY_DIALOG}
        />
      ) : null}

      {onSaveAnthropicKey && onTestAnthropicKey && onDeleteAnthropicKey ? (
        <SettingsProviderKeyDialog
          open={anthropicDialogOpen}
          onOpenChange={setAnthropicDialogOpen}
          hasKey={Boolean(aiSummary?.hasAnthropicKey)}
          lastFour={aiSummary?.anthropicLastFour ?? null}
          onSave={onSaveAnthropicKey}
          onDelete={onDeleteAnthropicKey}
          onTest={onTestAnthropicKey}
          canManage={canManageProviderKeys}
          saving={anthropicSaving}
          deleting={anthropicDeleting}
          config={ANTHROPIC_KEY_DIALOG}
        />
      ) : null}

      {onSaveBedrockCredentials && onTestBedrockCredentials && onDeleteBedrockCredentials ? (
        <SettingsBedrockDialog
          open={bedrockDialogOpen}
          onOpenChange={setBedrockDialogOpen}
          hasCredentials={Boolean(aiSummary?.hasBedrockCredentials)}
          accessKeyLastFour={aiSummary?.bedrockAccessKeyLastFour ?? null}
          region={aiSummary?.bedrockRegion ?? null}
          model={aiSummary?.bedrockModel ?? null}
          onSave={onSaveBedrockCredentials}
          onDelete={onDeleteBedrockCredentials}
          onTest={onTestBedrockCredentials}
          canManage={canManageProviderKeys}
          saving={bedrockSaving}
          deleting={bedrockDeleting}
        />
      ) : null}

      {footerNote}
    </div>
  );
}
