import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Cpu } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Organization-wide AI provider and BYOK keys. All projects in your org share these settings.
      </p>

      <div className="paper-card space-y-4 p-6">
        <div className="flex items-start gap-3">
          <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="font-semibold">Active AI provider</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose which provider powers generation for your organization.
                {!canManageProvider ? " Only site admins can change these settings." : null}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ai-provider" className="text-sm font-medium">
                Provider
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

            {selectedProvider === "ollama" ? (
              <div className="grid gap-4 sm:grid-cols-2">
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

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  Currently using:{" "}
                  <span className="capitalize text-primary">
                    {aiSummary?.activeProvider ?? selectedProvider}
                  </span>
                </p>
                {aiSummary?.source ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Source:{" "}
                    {aiSummary.source === "app"
                      ? "organization settings"
                      : aiSummary.source === "env"
                        ? "environment fallback"
                        : "auto-detected"}
                  </p>
                ) : null}
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

            {providerMessage ? (
              <p className="text-sm text-muted-foreground">{providerMessage}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="paper-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-semibold">Google Gemini (BYOK)</h2>
          {onSaveGeminiKey ? (
            <button
              type="button"
              onClick={() => setGeminiDialogOpen(true)}
              disabled={!canManageGeminiKey}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {aiSummary?.hasGeminiKey ? "Replace key" : "Add key"}
            </button>
          ) : null}
        </div>
        {aiSummary?.hasGeminiKey ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium">Organization Gemini API key connected</p>
              <p className="text-xs text-muted-foreground">
                Ending in ••••{aiSummary.geminiLastFour ?? "••••"}
              </p>
            </div>
            {onDeleteGeminiKey && canManageGeminiKey ? (
              <button
                type="button"
                onClick={() => void onDeleteGeminiKey()}
                disabled={geminiDeleting}
                className="text-sm text-red-700 hover:underline disabled:opacity-50"
              >
                {geminiDeleting ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No organization API key configured.</p>
        )}
        {!canManageGeminiKey ? (
          <p className="text-xs text-muted-foreground">
            Only organization owners and site admins can manage the Gemini API key.
          </p>
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

      <div className="paper-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-semibold">OpenAI (BYOK)</h2>
          {onSaveOpenaiKey ? (
            <button
              type="button"
              onClick={() => setOpenaiDialogOpen(true)}
              disabled={!canManageProviderKeys}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {aiSummary?.hasOpenaiKey ? "Replace key" : "Add key"}
            </button>
          ) : null}
        </div>
        {aiSummary?.hasOpenaiKey ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium">Organization OpenAI API key connected</p>
              <p className="text-xs text-muted-foreground">
                Ending in ••••{aiSummary.openaiLastFour ?? "••••"}
              </p>
            </div>
            {onDeleteOpenaiKey && canManageProviderKeys ? (
              <button
                type="button"
                onClick={() => void onDeleteOpenaiKey()}
                disabled={openaiDeleting}
                className="text-sm text-red-700 hover:underline disabled:opacity-50"
              >
                {openaiDeleting ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No organization OpenAI API key configured.</p>
        )}
        {!canManageProviderKeys ? (
          <p className="text-xs text-muted-foreground">
            Only organization owners and site admins can manage the OpenAI API key.
          </p>
        ) : null}
      </div>

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

      <div className="paper-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-semibold">Anthropic (BYOK)</h2>
          {onSaveAnthropicKey ? (
            <button
              type="button"
              onClick={() => setAnthropicDialogOpen(true)}
              disabled={!canManageProviderKeys}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {aiSummary?.hasAnthropicKey ? "Replace key" : "Add key"}
            </button>
          ) : null}
        </div>
        {aiSummary?.hasAnthropicKey ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium">Organization Anthropic API key connected</p>
              <p className="text-xs text-muted-foreground">
                Ending in ••••{aiSummary.anthropicLastFour ?? "••••"}
              </p>
            </div>
            {onDeleteAnthropicKey && canManageProviderKeys ? (
              <button
                type="button"
                onClick={() => void onDeleteAnthropicKey()}
                disabled={anthropicDeleting}
                className="text-sm text-red-700 hover:underline disabled:opacity-50"
              >
                {anthropicDeleting ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No organization Anthropic API key configured.</p>
        )}
        {!canManageProviderKeys ? (
          <p className="text-xs text-muted-foreground">
            Only organization owners and site admins can manage the Anthropic API key.
          </p>
        ) : null}
      </div>

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

      <div className="paper-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-semibold">AWS Bedrock (BYOK)</h2>
          {onSaveBedrockCredentials ? (
            <button
              type="button"
              onClick={() => setBedrockDialogOpen(true)}
              disabled={!canManageProviderKeys}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {aiSummary?.hasBedrockCredentials ? "Replace credentials" : "Add credentials"}
            </button>
          ) : null}
        </div>
        {aiSummary?.hasBedrockCredentials ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium">Organization AWS Bedrock credentials connected</p>
              <p className="text-xs text-muted-foreground">
                Access key ending in ••••{aiSummary.bedrockAccessKeyLastFour ?? "••••"}
                {aiSummary.bedrockRegion ? ` · ${aiSummary.bedrockRegion}` : ""}
                {aiSummary.bedrockModel ? ` · ${aiSummary.bedrockModel}` : ""}
                {aiSummary.bedrockHasSessionToken ? " · session token" : ""}
              </p>
            </div>
            {onDeleteBedrockCredentials && canManageProviderKeys ? (
              <button
                type="button"
                onClick={() => void onDeleteBedrockCredentials()}
                disabled={bedrockDeleting}
                className="text-sm text-red-700 hover:underline disabled:opacity-50"
              >
                {bedrockDeleting ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No organization AWS Bedrock credentials configured.
          </p>
        )}
        {!canManageProviderKeys ? (
          <p className="text-xs text-muted-foreground">
            Only organization owners and site admins can manage AWS Bedrock credentials.
          </p>
        ) : null}
      </div>

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
