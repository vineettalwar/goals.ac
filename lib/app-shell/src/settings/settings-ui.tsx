import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  CreditCard,
  KeyRound,
  Shield,
  User,
} from "lucide-react";
import { cn } from "../cn";
import { SettingsGeminiDialog } from "./settings-gemini-dialog";
import { SettingsBedrockDialog, type BedrockCredentialsForm } from "./settings-bedrock-dialog";
import { SettingsSemrushDialog, semrushDatabaseLabel } from "./settings-semrush-dialog";
import { SettingsStockByokPanel } from "./settings-stock-byok-panel";
import {
  SettingsProviderKeyDialog,
  type ProviderKeyDialogConfig,
} from "./settings-provider-key-dialog";
import {
  PLAN_LABELS,
  type AiProviderChoice,
  type SettingsAiSummary,
  type SettingsBillingSummary,
  type SettingsIntegrationsSummary,
  type SettingsTab,
  type UsageSummary,
} from "./types";

function formatRenewalDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function subscriptionStatusLabel(status: string | null): string {
  if (!status) return "No subscription";
  return status.replace(/_/g, " ");
}

const AI_PROVIDER_OPTIONS: Array<{ value: AiProviderChoice; label: string }> = [
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI (ChatGPT)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "bedrock", label: "AWS Bedrock" },
  { value: "ollama", label: "Ollama (local)" },
];

function normalizeProviderChoice(value: string | null | undefined): AiProviderChoice {
  if (value === "openai" || value === "anthropic" || value === "bedrock" || value === "ollama") {
    return value;
  }
  return "gemini";
}

const TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof User;
  hideWhenGoogleOnly?: boolean;
}> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "ai", label: "AI Providers", icon: Cpu },
  { id: "security", label: "Security", icon: Shield, hideWhenGoogleOnly: true },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "account", label: "Account", icon: AlertTriangle },
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

const DEEPL_KEY_DIALOG: ProviderKeyDialogConfig = {
  providerLabel: "DeepL",
  inputId: "deepl-api-key",
  dialogTitleId: "deepl-key-dialog-title",
  placeholder: "DeepL Pro API key",
  helpText: "Get a key at",
  helpUrl: "https://www.deepl.com/pro-api",
  helpLinkLabel: "deepl.com/pro-api",
  removeConfirmMessage: "Remove the organization DeepL API key?",
  permissionMessage: "Only organization owners and site admins can manage the DeepL API key.",
};

export function SettingsView({
  activeTab,
  onTabChange,
  isGoogleOnly,
  email,
  name,
  avatarUrl,
  onNameChange,
  onAvatarUrlChange,
  onSaveProfile,
  profileSaving,
  profileMessage,
  usage,
  usageLoading,
  aiSummary,
  showSecurityTab,
  currentPassword,
  newPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onChangePassword,
  passwordSaving,
  passwordMessage,
  forgotPasswordHref,
  renderForgotPasswordLink,
  onDeleteAccount,
  deletingAccount,
  aiProvidersNote,
  canManageGeminiKey = false,
  onSaveGeminiKey,
  onDeleteGeminiKey,
  onTestGeminiKey,
  geminiSaving = false,
  geminiDeleting = false,
  canManageProviderKeys = false,
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
  canManageProvider = false,
  onSaveProvider,
  providerSaving = false,
  providerMessage,
  billingSummary,
  billingLoading = false,
  onOpenBillingPortal,
  portalLoading = false,
  billingMessage,
  integrationsSummary,
  onSaveSemrushCredentials,
  onDeleteSemrushCredentials,
  onTestSemrushCredentials,
  semrushSaving = false,
  semrushDeleting = false,
  onSaveDeeplKey,
  onDeleteDeeplKey,
  onTestDeeplKey,
  deeplSaving = false,
  deeplDeleting = false,
  onSaveStockCredentials,
  onDeleteStockCredentials,
  onTestStockCredentials,
  stockSavingProvider = null,
  stockRemovingProvider = null,
  integrationsMessage,
  securitySupplement,
  billingContent,
}: {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  isGoogleOnly: boolean;
  email: string;
  name: string;
  avatarUrl: string;
  onNameChange: (value: string) => void;
  onAvatarUrlChange: (value: string) => void;
  onSaveProfile: () => void;
  profileSaving: boolean;
  profileMessage: string | null;
  usage: UsageSummary | null;
  usageLoading: boolean;
  aiSummary: SettingsAiSummary | null;
  showSecurityTab: boolean;
  currentPassword: string;
  newPassword: string;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onChangePassword: () => void;
  passwordSaving: boolean;
  passwordMessage: string | null;
  forgotPasswordHref: string;
  renderForgotPasswordLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  onDeleteAccount: () => void;
  deletingAccount: boolean;
  aiProvidersNote?: ReactNode;
  canManageGeminiKey?: boolean;
  onSaveGeminiKey?: (key: string) => Promise<void>;
  onDeleteGeminiKey?: () => Promise<void>;
  onTestGeminiKey?: (key: string) => Promise<{ ok: boolean; error?: string }>;
  geminiSaving?: boolean;
  geminiDeleting?: boolean;
  canManageProviderKeys?: boolean;
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
  canManageProvider?: boolean;
  onSaveProvider?: (input: {
    provider: AiProviderChoice;
    ollamaBaseUrl: string;
    ollamaModel: string;
  }) => Promise<void>;
  providerSaving?: boolean;
  providerMessage?: string | null;
  billingSummary?: SettingsBillingSummary | null;
  billingLoading?: boolean;
  onOpenBillingPortal?: () => Promise<void>;
  portalLoading?: boolean;
  billingMessage?: string | null;
  integrationsSummary?: SettingsIntegrationsSummary | null;
  onSaveSemrushCredentials?: (input: { apiKey: string; database: string }) => Promise<void>;
  onDeleteSemrushCredentials?: () => Promise<void>;
  onTestSemrushCredentials?: (input: {
    apiKey: string;
    database: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  semrushSaving?: boolean;
  semrushDeleting?: boolean;
  onSaveDeeplKey?: (key: string) => Promise<void>;
  onDeleteDeeplKey?: () => Promise<void>;
  onTestDeeplKey?: (key: string) => Promise<{ ok: boolean; error?: string }>;
  deeplSaving?: boolean;
  deeplDeleting?: boolean;
  onSaveStockCredentials?: (input: { provider: string; apiKey: string }) => Promise<void>;
  onDeleteStockCredentials?: (provider: string) => Promise<void>;
  onTestStockCredentials?: (input: {
    provider: string;
    apiKey: string;
  }) => Promise<{ ok: boolean; error?: string; note?: string }>;
  stockSavingProvider?: string | null;
  stockRemovingProvider?: string | null;
  integrationsMessage?: string | null;
  securitySupplement?: ReactNode;
  billingContent?: ReactNode;
}) {
  const visibleTabs = TABS.filter((tab) => !tab.hideWhenGoogleOnly || !isGoogleOnly);
  const [geminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const [openaiDialogOpen, setOpenaiDialogOpen] = useState(false);
  const [anthropicDialogOpen, setAnthropicDialogOpen] = useState(false);
  const [bedrockDialogOpen, setBedrockDialogOpen] = useState(false);
  const [semrushDialogOpen, setSemrushDialogOpen] = useState(false);
  const [deeplDialogOpen, setDeeplDialogOpen] = useState(false);
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
    <div className="max-w-3xl space-y-6 px-8 py-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, organization AI settings, and account.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tab.label}
              {tab.id === "ai" && aiSummary?.activeProvider ? (
                <span
                  className={cn(
                    "ml-1 rounded-full px-1.5 py-0.5 text-xs capitalize",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  {aiSummary.activeProvider}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" ? (
        <div className="space-y-6">
          <div className="paper-card space-y-4 p-6">
            <h2 className="font-semibold">Profile</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="settings-name" className="text-sm font-medium">
                Display name
              </label>
              <input
                id="settings-name"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="settings-avatar" className="text-sm font-medium">
                Avatar URL
              </label>
              <input
                id="settings-avatar"
                value={avatarUrl}
                onChange={(event) => onAvatarUrlChange(event.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Paste a publicly accessible image URL. Leave blank to use your initials.
              </p>
            </div>
            {profileMessage ? (
              <p className="text-sm text-muted-foreground">{profileMessage}</p>
            ) : null}
            <button
              type="button"
              onClick={onSaveProfile}
              disabled={profileSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {profileSaving ? "Saving…" : "Save changes"}
            </button>
          </div>

          <div className="paper-card space-y-4 p-6">
            <h2 className="font-semibold">Usage this month</h2>
            {usageLoading ? <p className="text-sm text-muted-foreground">Loading usage…</p> : null}
            {usage ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Articles</p>
                  <p className="text-2xl font-bold tabular-nums">{usage.articlesThisMonth}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {usage.usesByok
                      ? "BYOK — unlimited"
                      : usage.quota != null
                        ? `${usage.quotaRemaining ?? 0} remaining on platform key`
                        : "Generated this month"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Plan</p>
                  <p className="text-2xl font-bold">{PLAN_LABELS[usage.plan]}</p>
                </div>
                {usage.usesByok ? (
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs uppercase text-muted-foreground">AI key</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                      <KeyRound className="h-4 w-4 text-primary" aria-hidden />
                      BYOK — unlimited
                    </p>
                  </div>
                ) : null}
              </div>
            ) : !usageLoading ? (
              <p className="text-sm text-muted-foreground">Usage data unavailable.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "ai" ? (
        <div className="space-y-6">
          <div className="paper-card space-y-4 p-6">
            <div className="flex items-start gap-3">
              <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="font-semibold">Active AI provider</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose which provider powers generation for your organization. All projects in
                    your org share this setting.
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
                      <span className="capitalize text-primary">{aiSummary?.activeProvider ?? selectedProvider}</span>
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
              <p className="text-sm text-muted-foreground">No organization AWS Bedrock credentials configured.</p>
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

          <div className="paper-card space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Semrush (BYOK)</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect your Semrush API key for keyword gaps, search volume, and difficulty in content
                  suggestions.
                </p>
              </div>
              {onSaveSemrushCredentials ? (
                <button
                  type="button"
                  onClick={() => setSemrushDialogOpen(true)}
                  disabled={!canManageProviderKeys}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                >
                  {integrationsSummary?.semrush.hasCredentials ? "Replace key" : "Add key"}
                </button>
              ) : null}
            </div>
            {integrationsSummary?.semrush.hasCredentials ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-medium">Organization Semrush API key connected</p>
                  <p className="text-xs text-muted-foreground">
                    Key ending in ••••{integrationsSummary.semrush.apiKeyLastFour ?? "••••"}
                    {integrationsSummary.semrush.database
                      ? ` · database: ${semrushDatabaseLabel(integrationsSummary.semrush.database)}`
                      : ""}
                  </p>
                </div>
                {onDeleteSemrushCredentials && canManageProviderKeys ? (
                  <button
                    type="button"
                    onClick={() => void onDeleteSemrushCredentials()}
                    disabled={semrushDeleting}
                    className="text-sm text-red-700 hover:underline disabled:opacity-50"
                  >
                    {semrushDeleting ? "Removing…" : "Remove"}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No organization Semrush credentials configured.</p>
            )}
            {!canManageProviderKeys ? (
              <p className="text-xs text-muted-foreground">
                Only organization owners and site admins can manage Semrush credentials.
              </p>
            ) : null}
          </div>

          {onSaveSemrushCredentials && onTestSemrushCredentials && onDeleteSemrushCredentials ? (
            <SettingsSemrushDialog
              open={semrushDialogOpen}
              onOpenChange={setSemrushDialogOpen}
              hasCredentials={Boolean(integrationsSummary?.semrush.hasCredentials)}
              apiKeyLastFour={integrationsSummary?.semrush.apiKeyLastFour ?? null}
              database={integrationsSummary?.semrush.database ?? "us"}
              onSave={onSaveSemrushCredentials}
              onDelete={onDeleteSemrushCredentials}
              onTest={onTestSemrushCredentials}
              canManage={canManageProviderKeys}
              saving={semrushSaving}
              deleting={semrushDeleting}
            />
          ) : null}

          <div className="paper-card space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">DeepL translation (BYOK)</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Optional DeepL API key to refine non-English drafts after humanization.
                </p>
              </div>
              {onSaveDeeplKey ? (
                <button
                  type="button"
                  onClick={() => setDeeplDialogOpen(true)}
                  disabled={!canManageProviderKeys}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                >
                  {integrationsSummary?.deepl.configured ? "Replace key" : "Add key"}
                </button>
              ) : null}
            </div>
            {integrationsSummary?.deepl.configured ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-medium">Organization DeepL API key connected</p>
                  <p className="text-xs text-muted-foreground">
                    Key ending in ••••{integrationsSummary.deepl.apiKeyLastFour ?? "••••"}
                  </p>
                </div>
                {onDeleteDeeplKey && canManageProviderKeys ? (
                  <button
                    type="button"
                    onClick={() => void onDeleteDeeplKey()}
                    disabled={deeplDeleting}
                    className="text-sm text-red-700 hover:underline disabled:opacity-50"
                  >
                    {deeplDeleting ? "Removing…" : "Remove"}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No organization DeepL API key configured.</p>
            )}
            {!canManageProviderKeys ? (
              <p className="text-xs text-muted-foreground">
                Only organization owners and site admins can manage the DeepL API key.
              </p>
            ) : null}
          </div>

          {onSaveDeeplKey && onTestDeeplKey && onDeleteDeeplKey ? (
            <SettingsProviderKeyDialog
              open={deeplDialogOpen}
              onOpenChange={setDeeplDialogOpen}
              hasKey={Boolean(integrationsSummary?.deepl.configured)}
              lastFour={integrationsSummary?.deepl.apiKeyLastFour ?? null}
              onSave={onSaveDeeplKey}
              onDelete={onDeleteDeeplKey}
              onTest={onTestDeeplKey}
              canManage={canManageProviderKeys}
              saving={deeplSaving}
              deleting={deeplDeleting}
              config={DEEPL_KEY_DIALOG}
            />
          ) : null}

          <div className="paper-card space-y-4 p-6">
            <div>
              <h2 className="font-semibold">Stock photos (Unsplash / Pexels)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional API keys for copyright-free stock search. Platform keys are used when unset.
              </p>
            </div>
            {onSaveStockCredentials && onTestStockCredentials && onDeleteStockCredentials ? (
              <SettingsStockByokPanel
                platform={integrationsSummary?.stock.platform}
                orgCredentials={integrationsSummary?.stock.org ?? []}
                providers={integrationsSummary?.stock.providers ?? []}
                canManage={canManageProviderKeys}
                onSave={onSaveStockCredentials}
                onDelete={onDeleteStockCredentials}
                onTest={onTestStockCredentials}
                savingProvider={stockSavingProvider}
                removingProvider={stockRemovingProvider}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Stock credential settings unavailable.</p>
            )}
          </div>

          {integrationsMessage ? (
            <div className="paper-card p-4 text-sm text-muted-foreground">{integrationsMessage}</div>
          ) : null}

          {aiProvidersNote}
        </div>
      ) : null}

      {activeTab === "security" && showSecurityTab ? (
        <div className="space-y-6">
          {securitySupplement}
          <div className="paper-card space-y-4 p-6">
          <h2 className="font-semibold">Change password</h2>
          <div className="space-y-1.5">
            <label htmlFor="current-password" className="text-sm font-medium">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => onCurrentPasswordChange(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-sm font-medium">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => onNewPasswordChange(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {passwordMessage ? <p className="text-sm text-muted-foreground">{passwordMessage}</p> : null}
          <button
            type="button"
            onClick={onChangePassword}
            disabled={passwordSaving}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            {passwordSaving ? "Updating…" : "Change password"}
          </button>
          {renderForgotPasswordLink ? (
            renderForgotPasswordLink({
              href: forgotPasswordHref,
              className: "block text-sm text-primary hover:underline",
              children: "Forgot password?",
            })
          ) : (
            <a href={forgotPasswordHref} className="block text-sm text-primary hover:underline">
              Forgot password?
            </a>
          )}
          </div>
        </div>
      ) : null}

      {activeTab === "billing" ? (
        billingContent ?? (
        <div className="paper-card space-y-4 p-6">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="font-semibold">Plan</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {billingSummary?.plan === "growth"
                    ? "Growth includes autopilot and platform features. BYOK recommended for unlimited AI."
                    : "Consulting clients use BYOK for unlimited AI generations. Platform access is scoped per engagement."}
                </p>
              </div>

              {billingLoading ? (
                <p className="text-sm text-muted-foreground">Loading billing…</p>
              ) : billingSummary ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-bold">
                      {PLAN_LABELS[billingSummary.plan] ?? billingSummary.plan}
                    </p>
                    {billingSummary.plan === "starter" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                        <KeyRound className="h-3 w-3" aria-hidden />
                        BYOK optional
                      </span>
                    ) : null}
                    {billingSummary.subscriptionStatus ? (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize">
                        {subscriptionStatusLabel(billingSummary.subscriptionStatus)}
                      </span>
                    ) : null}
                  </div>

                  {billingSummary.hasActiveSubscription &&
                  formatRenewalDate(billingSummary.currentPeriodEnd) ? (
                    <p className="text-sm text-muted-foreground">
                      {billingSummary.plan === "growth" ? "Subscription renews" : "Legacy subscription renews"}{" "}
                      on{" "}
                      <span className="text-foreground">
                        {formatRenewalDate(billingSummary.currentPeriodEnd)}
                      </span>
                    </p>
                  ) : null}

                  {usage ? (
                    <div className="space-y-2 rounded-lg border border-border p-4">
                      <p className="text-sm font-medium">Usage this month</p>
                      <p className="text-2xl font-bold tabular-nums">{usage.articlesThisMonth}</p>
                      <p className="text-sm text-muted-foreground">
                        {usage.usesByok
                          ? "Articles generated with your API key (unlimited)"
                          : "Articles generated on platform key"}
                      </p>
                    </div>
                  ) : null}

                  {!billingSummary.stripeConfigured ? (
                    <p className="text-sm text-muted-foreground">
                      Self-serve billing is not configured on this deployment.
                    </p>
                  ) : null}

                  {billingSummary.canManageBilling && billingSummary.stripeConfigured && onOpenBillingPortal ? (
                    <button
                      type="button"
                      onClick={() => void onOpenBillingPortal()}
                      disabled={portalLoading}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      {portalLoading ? "Opening…" : "Manage billing"}
                    </button>
                  ) : null}

                  {billingMessage ? (
                    <p className="text-sm text-muted-foreground">{billingMessage}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Billing unavailable.</p>
              )}
            </div>
          </div>
        </div>
        )
      ) : null}

      {activeTab === "account" ? (
        <div className="paper-card space-y-4 border-red-200 p-6">
          <h2 className="font-semibold text-red-700">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={deletingAccount}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {deletingAccount ? "Deleting…" : "Delete account"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
