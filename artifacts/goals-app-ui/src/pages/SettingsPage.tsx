import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SettingsView, type AiProviderChoice, type BedrockCredentialsForm, type SettingsTab, isSiteAdmin, isSuperAdmin } from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { apiFetch, getAppOrigin } from "@/lib/api";
import { useSettingsData } from "@/hooks/use-settings-data";

const VALID_TABS: SettingsTab[] = ["profile", "ai", "security", "billing", "account"];

function parseTab(value: string | null): SettingsTab {
  if (value && VALID_TABS.includes(value as SettingsTab)) {
    return value as SettingsTab;
  }
  return "profile";
}

export function SettingsPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    loading,
    email,
    hasGoogleId,
    hasPassword,
    usage,
    usageLoading,
    aiSummary,
    userRole,
    orgRole,
    reload,
    forgotPasswordHref,
    billingSummary,
    billingLoading,
    loadBillingSummary,
  } = useSettingsData();

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => parseTab(searchParams.get("tab")));
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiDeleting, setGeminiDeleting] = useState(false);
  const [geminiMessage, setGeminiMessage] = useState<string | null>(null);
  const [openaiSaving, setOpenaiSaving] = useState(false);
  const [openaiDeleting, setOpenaiDeleting] = useState(false);
  const [openaiMessage, setOpenaiMessage] = useState<string | null>(null);
  const [anthropicSaving, setAnthropicSaving] = useState(false);
  const [anthropicDeleting, setAnthropicDeleting] = useState(false);
  const [anthropicMessage, setAnthropicMessage] = useState<string | null>(null);
  const [bedrockSaving, setBedrockSaving] = useState(false);
  const [bedrockDeleting, setBedrockDeleting] = useState(false);
  const [bedrockMessage, setBedrockMessage] = useState<string | null>(null);
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setAvatarUrl(user.avatarUrl ?? "");
    }
  }, [user]);

  function changeTab(tab: SettingsTab) {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  }

  useEffect(() => {
    if (activeTab === "billing") {
      void loadBillingSummary();
    }
  }, [activeTab, loadBillingSummary]);

  async function saveProfile() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileMessage("Display name is required.");
      return;
    }
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const payload: { name: string; avatarUrl?: string | null } = { name: trimmedName };
      if (avatarUrl.trim()) {
        payload.avatarUrl = avatarUrl.trim();
      } else {
        payload.avatarUrl = null;
      }
      await apiFetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await refresh();
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || newPassword.length < 8) {
      setPasswordMessage("Enter your current password and a new password (8+ characters).");
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password updated.");
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your account and all projects? This cannot be undone.")) return;
    setDeletingAccount(true);
    try {
      await apiFetch("/api/auth/me/delete", { method: "DELETE" });
      window.location.href = "/login";
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Failed to delete account");
      setDeletingAccount(false);
    }
  }

  async function testGeminiKey(key: string) {
    const data = await apiFetch<{ ok?: boolean; error?: string }>("/api/auth/api-key/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return { ok: Boolean(data.ok), error: data.error };
  }

  async function saveGeminiKey(key: string) {
    setGeminiSaving(true);
    setGeminiMessage(null);
    try {
      await apiFetch("/api/auth/api-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      await reload();
      setGeminiMessage("Gemini API key saved.");
    } catch (err) {
      setGeminiMessage(err instanceof Error ? err.message : "Failed to save key");
      throw err;
    } finally {
      setGeminiSaving(false);
    }
  }

  async function deleteGeminiKey() {
    if (!window.confirm("Remove the organization Gemini API key?")) return;
    setGeminiDeleting(true);
    setGeminiMessage(null);
    try {
      await apiFetch("/api/auth/api-key", { method: "DELETE" });
      await reload();
      setGeminiMessage("Gemini API key removed.");
    } catch (err) {
      setGeminiMessage(err instanceof Error ? err.message : "Failed to remove key");
      throw err;
    } finally {
      setGeminiDeleting(false);
    }
  }

  async function saveProvider(input: {
    provider: AiProviderChoice;
    ollamaBaseUrl: string;
    ollamaModel: string;
  }) {
    setProviderSaving(true);
    setProviderMessage(null);
    try {
      await apiFetch("/api/ai-providers/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: input.provider,
          ollamaBaseUrl: input.provider === "ollama" ? input.ollamaBaseUrl : null,
          ollamaModel: input.provider === "ollama" ? input.ollamaModel : null,
        }),
      });
      await reload();
      setProviderMessage("AI provider updated.");
    } catch (err) {
      setProviderMessage(err instanceof Error ? err.message : "Failed to save provider");
      throw err;
    } finally {
      setProviderSaving(false);
    }
  }

  async function testOpenaiKey(key: string) {
    const data = await apiFetch<{ ok?: boolean; error?: string }>("/api/auth/openai-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return { ok: Boolean(data.ok), error: data.error };
  }

  async function saveOpenaiKey(key: string) {
    setOpenaiSaving(true);
    setOpenaiMessage(null);
    try {
      await apiFetch("/api/auth/openai-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      await reload();
      setOpenaiMessage("OpenAI API key saved.");
    } catch (err) {
      setOpenaiMessage(err instanceof Error ? err.message : "Failed to save key");
      throw err;
    } finally {
      setOpenaiSaving(false);
    }
  }

  async function deleteOpenaiKey() {
    if (!window.confirm("Remove the organization OpenAI API key?")) return;
    setOpenaiDeleting(true);
    setOpenaiMessage(null);
    try {
      await apiFetch("/api/auth/openai-credentials", { method: "DELETE" });
      await reload();
      setOpenaiMessage("OpenAI API key removed.");
    } catch (err) {
      setOpenaiMessage(err instanceof Error ? err.message : "Failed to remove key");
      throw err;
    } finally {
      setOpenaiDeleting(false);
    }
  }

  async function testAnthropicKey(key: string) {
    const data = await apiFetch<{ ok?: boolean; error?: string }>("/api/auth/anthropic-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return { ok: Boolean(data.ok), error: data.error };
  }

  async function saveAnthropicKey(key: string) {
    setAnthropicSaving(true);
    setAnthropicMessage(null);
    try {
      await apiFetch("/api/auth/anthropic-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      await reload();
      setAnthropicMessage("Anthropic API key saved.");
    } catch (err) {
      setAnthropicMessage(err instanceof Error ? err.message : "Failed to save key");
      throw err;
    } finally {
      setAnthropicSaving(false);
    }
  }

  async function deleteAnthropicKey() {
    if (!window.confirm("Remove the organization Anthropic API key?")) return;
    setAnthropicDeleting(true);
    setAnthropicMessage(null);
    try {
      await apiFetch("/api/auth/anthropic-credentials", { method: "DELETE" });
      await reload();
      setAnthropicMessage("Anthropic API key removed.");
    } catch (err) {
      setAnthropicMessage(err instanceof Error ? err.message : "Failed to remove key");
      throw err;
    } finally {
      setAnthropicDeleting(false);
    }
  }

  function bedrockPayloadFromForm(form: BedrockCredentialsForm) {
    return {
      accessKeyId: form.accessKeyId.trim(),
      secretAccessKey: form.secretAccessKey.trim(),
      sessionToken: form.sessionToken.trim() || null,
      region: form.region.trim(),
      model: form.model.trim(),
    };
  }

  async function testBedrockCredentials(form: BedrockCredentialsForm) {
    const data = await apiFetch<{ ok?: boolean; error?: string }>("/api/auth/bedrock-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bedrockPayloadFromForm(form)),
    });
    return { ok: Boolean(data.ok), error: data.error };
  }

  async function saveBedrockCredentials(form: BedrockCredentialsForm) {
    setBedrockSaving(true);
    setBedrockMessage(null);
    try {
      await apiFetch("/api/auth/bedrock-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bedrockPayloadFromForm(form)),
      });
      await reload();
      setBedrockMessage("AWS Bedrock credentials saved.");
    } catch (err) {
      setBedrockMessage(err instanceof Error ? err.message : "Failed to save credentials");
      throw err;
    } finally {
      setBedrockSaving(false);
    }
  }

  async function deleteBedrockCredentials() {
    if (!window.confirm("Remove the organization AWS Bedrock credentials?")) return;
    setBedrockDeleting(true);
    setBedrockMessage(null);
    try {
      await apiFetch("/api/auth/bedrock-credentials", { method: "DELETE" });
      await reload();
      setBedrockMessage("AWS Bedrock credentials removed.");
    } catch (err) {
      setBedrockMessage(err instanceof Error ? err.message : "Failed to remove credentials");
      throw err;
    } finally {
      setBedrockDeleting(false);
    }
  }

  if (authLoading || loading) {
    return <p className="p-8 text-muted-foreground">Loading settings…</p>;
  }

  if (!user) return null;

  const isGoogleOnly = hasGoogleId && !hasPassword;
  const canManageProviderKeys = isSuperAdmin(userRole) || isSiteAdmin(orgRole);

  return (
    <SettingsView
      activeTab={activeTab}
      onTabChange={changeTab}
      isGoogleOnly={isGoogleOnly}
      email={email || user.email}
      name={name}
      avatarUrl={avatarUrl}
      onNameChange={setName}
      onAvatarUrlChange={setAvatarUrl}
      onSaveProfile={saveProfile}
      profileSaving={profileSaving}
      profileMessage={profileMessage}
      usage={usage}
      usageLoading={usageLoading}
      aiSummary={aiSummary}
      showSecurityTab={hasPassword}
      currentPassword={currentPassword}
      newPassword={newPassword}
      onCurrentPasswordChange={setCurrentPassword}
      onNewPasswordChange={setNewPassword}
      onChangePassword={changePassword}
      passwordSaving={passwordSaving}
      passwordMessage={passwordMessage}
      forgotPasswordHref={forgotPasswordHref}
      renderForgotPasswordLink={({ href, className, children }) => (
        <a href={href} className={className}>
          {children}
        </a>
      )}
      onDeleteAccount={deleteAccount}
      deletingAccount={deletingAccount}
      canManageGeminiKey={canManageProviderKeys}
      canManageProviderKeys={canManageProviderKeys}
      onSaveGeminiKey={saveGeminiKey}
      onDeleteGeminiKey={deleteGeminiKey}
      onTestGeminiKey={testGeminiKey}
      geminiSaving={geminiSaving}
      geminiDeleting={geminiDeleting}
      onSaveOpenaiKey={saveOpenaiKey}
      onDeleteOpenaiKey={deleteOpenaiKey}
      onTestOpenaiKey={testOpenaiKey}
      openaiSaving={openaiSaving}
      openaiDeleting={openaiDeleting}
      onSaveAnthropicKey={saveAnthropicKey}
      onDeleteAnthropicKey={deleteAnthropicKey}
      onTestAnthropicKey={testAnthropicKey}
      anthropicSaving={anthropicSaving}
      anthropicDeleting={anthropicDeleting}
      onSaveBedrockCredentials={saveBedrockCredentials}
      onDeleteBedrockCredentials={deleteBedrockCredentials}
      onTestBedrockCredentials={testBedrockCredentials}
      bedrockSaving={bedrockSaving}
      bedrockDeleting={bedrockDeleting}
      canManageProvider={canManageProviderKeys}
      onSaveProvider={saveProvider}
      providerSaving={providerSaving}
      providerMessage={providerMessage}
      billingSummary={billingSummary}
      billingLoading={billingLoading}
      aiProvidersNote={
        <div className="space-y-3">
          {geminiMessage ? (
            <div className="paper-card p-4 text-sm text-muted-foreground">{geminiMessage}</div>
          ) : null}
          {openaiMessage ? (
            <div className="paper-card p-4 text-sm text-muted-foreground">{openaiMessage}</div>
          ) : null}
          {anthropicMessage ? (
            <div className="paper-card p-4 text-sm text-muted-foreground">{anthropicMessage}</div>
          ) : null}
          {bedrockMessage ? (
            <div className="paper-card p-4 text-sm text-muted-foreground">{bedrockMessage}</div>
          ) : null}
          <div className="paper-card p-6 text-sm text-muted-foreground">
            <p>
              Semrush, DeepL, and stock image BYOK panels are available in the full product app.
              Run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                pnpm --filter @workspace/marketing-persona-app run dev
              </code>{" "}
              and open{" "}
              <a
                href={`${getAppOrigin()}/settings?tab=ai`}
                className="text-primary hover:underline"
              >
                Settings → AI Providers
              </a>{" "}
              on the full product app.
            </p>
            <button
              type="button"
              onClick={() => void reload()}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Refresh provider status
            </button>
          </div>
        </div>
      }
    />
  );
}
