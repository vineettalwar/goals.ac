"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  SettingsView,
  isSiteAdmin,
  isSuperAdmin,
  type AiProviderChoice,
  type BedrockCredentialsForm,
  type SettingsTab,
} from "@workspace/app-shell";
import { MfaSettingsPanel } from "@/components/mfa/mfa-settings-panel";
import { OrgSecurityPanel } from "@/components/org/org-security-panel";
import { PublicApiKeysPanel } from "@/components/settings/public-api-keys-panel";
import { SettingsBillingPanel } from "@/components/settings/settings-billing-panel";
import { useSettingsData } from "@/hooks/use-settings-data";
import type { SettingsInitialData } from "@/lib/server/loaders";

const VALID_TABS: SettingsTab[] = ["profile", "ai", "security", "billing", "account"];

function parseTab(value: string | null): SettingsTab {
  if (value && VALID_TABS.includes(value as SettingsTab)) {
    return value as SettingsTab;
  }
  return "profile";
}

function credentialTestResult(data: { ok?: boolean; error?: string }) {
  return { ok: Boolean(data.ok), error: data.error };
}

type SettingsPageClientProps = {
  initialData: SettingsInitialData;
};

export function SettingsPageClient({ initialData }: SettingsPageClientProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
    integrationsSummary,
    reload,
    forgotPasswordHref,
    billingSummary,
    billingLoading,
    loadBillingSummary,
    canManageAiSettings: initialCanManage,
  } = useSettingsData(initialData);

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => parseTab(searchParams.get("tab")));
  const [name, setName] = useState(session?.user.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(session?.user.image ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiDeleting, setGeminiDeleting] = useState(false);
  const [openaiSaving, setOpenaiSaving] = useState(false);
  const [openaiDeleting, setOpenaiDeleting] = useState(false);
  const [anthropicSaving, setAnthropicSaving] = useState(false);
  const [anthropicDeleting, setAnthropicDeleting] = useState(false);
  const [bedrockSaving, setBedrockSaving] = useState(false);
  const [bedrockDeleting, setBedrockDeleting] = useState(false);
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [semrushSaving, setSemrushSaving] = useState(false);
  const [semrushDeleting, setSemrushDeleting] = useState(false);
  const [deeplSaving, setDeeplSaving] = useState(false);
  const [deeplDeleting, setDeeplDeleting] = useState(false);
  const [stockSavingProvider, setStockSavingProvider] = useState<string | null>(null);
  const [stockRemovingProvider, setStockRemovingProvider] = useState<string | null>(null);
  const [integrationsMessage, setIntegrationsMessage] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setAvatarUrl(session.user.image ?? "");
    }
  }, [session]);

  function changeTab(tab: SettingsTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (activeTab === "billing") {
      void loadBillingSummary();
    }
  }, [activeTab, loadBillingSummary]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const topup = searchParams.get("topup");
    if (checkout === "success") {
      setBillingMessage("Billing updated.");
      void loadBillingSummary();
    } else if (checkout === "cancel" || topup === "cancelled") {
      setBillingMessage("Checkout canceled.");
    } else if (topup === "success") {
      setBillingMessage("Credits added to your workspace.");
    }
  }, [searchParams, loadBillingSummary]);

  const canManageProviderKeys =
    initialCanManage ??
    (isSuperAdmin(userRole) ||
      isSiteAdmin(orgRole) ||
      isSuperAdmin(session?.user?.role) ||
      isSiteAdmin(session?.user?.orgRole));

  if (loading && !session) {
    return <p className="p-8 text-muted-foreground">Loading settings…</p>;
  }

  if (!session?.user) return null;

  const isGoogleOnly = hasGoogleId && !hasPassword;
  const displayEmail = email || session.user.email || "";

  async function openBillingPortal() {
    setPortalLoading(true);
    setBillingMessage(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not open billing portal");
      }
      window.location.href = data.url;
    } catch (err) {
      setBillingMessage(err instanceof Error ? err.message : "Portal unavailable");
      setPortalLoading(false);
    }
  }

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
      payload.avatarUrl = avatarUrl.trim() ? avatarUrl.trim() : null;
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to save profile");
      }
      const body = (await res.json()) as { user?: { name?: string; avatarUrl?: string | null } };
      const nextAvatar = body.user?.avatarUrl ?? (payload.avatarUrl ?? undefined);
      await update({ name: trimmedName, image: nextAvatar ?? undefined });
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
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Failed to change password");
      }
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
      const res = await fetch("/api/auth/me/delete", { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete account");
      }
      window.location.href = "/login";
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Failed to delete account");
      setDeletingAccount(false);
    }
  }

  async function testGeminiKey(key: string) {
    const res = await fetch("/api/auth/api-key/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    return credentialTestResult(data);
  }

  async function saveGeminiKey(key: string) {
    setGeminiSaving(true);
    try {
      const res = await fetch("/api/auth/api-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to save key");
      await reload(false);
    } finally {
      setGeminiSaving(false);
    }
  }

  async function deleteGeminiKey() {
    if (!window.confirm("Remove the organization Gemini API key?")) return;
    setGeminiDeleting(true);
    try {
      const res = await fetch("/api/auth/api-key", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove key");
      await reload(false);
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
      const res = await fetch("/api/ai-providers/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: input.provider,
          ollamaBaseUrl: input.provider === "ollama" ? input.ollamaBaseUrl : null,
          ollamaModel: input.provider === "ollama" ? input.ollamaModel : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save provider");
      await reload(false);
      setProviderMessage("AI provider updated.");
    } catch (err) {
      setProviderMessage(err instanceof Error ? err.message : "Failed to save provider");
      throw err;
    } finally {
      setProviderSaving(false);
    }
  }

  async function testOpenaiKey(key: string) {
    const res = await fetch("/api/auth/openai-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveOpenaiKey(key: string) {
    setOpenaiSaving(true);
    try {
      const res = await fetch("/api/auth/openai-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to save key");
      await reload(false);
    } finally {
      setOpenaiSaving(false);
    }
  }

  async function deleteOpenaiKey() {
    if (!window.confirm("Remove the organization OpenAI API key?")) return;
    setOpenaiDeleting(true);
    try {
      const res = await fetch("/api/auth/openai-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove key");
      await reload(false);
    } finally {
      setOpenaiDeleting(false);
    }
  }

  async function testAnthropicKey(key: string) {
    const res = await fetch("/api/auth/anthropic-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveAnthropicKey(key: string) {
    setAnthropicSaving(true);
    try {
      const res = await fetch("/api/auth/anthropic-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to save key");
      await reload(false);
    } finally {
      setAnthropicSaving(false);
    }
  }

  async function deleteAnthropicKey() {
    if (!window.confirm("Remove the organization Anthropic API key?")) return;
    setAnthropicDeleting(true);
    try {
      const res = await fetch("/api/auth/anthropic-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove key");
      await reload(false);
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
    const res = await fetch("/api/auth/bedrock-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bedrockPayloadFromForm(form)),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveBedrockCredentials(form: BedrockCredentialsForm) {
    setBedrockSaving(true);
    try {
      const res = await fetch("/api/auth/bedrock-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bedrockPayloadFromForm(form)),
      });
      if (!res.ok) throw new Error("Failed to save credentials");
      await reload(false);
    } finally {
      setBedrockSaving(false);
    }
  }

  async function deleteBedrockCredentials() {
    if (!window.confirm("Remove the organization AWS Bedrock credentials?")) return;
    setBedrockDeleting(true);
    try {
      const res = await fetch("/api/auth/bedrock-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove credentials");
      await reload(false);
    } finally {
      setBedrockDeleting(false);
    }
  }

  async function testSemrushCredentials(input: { apiKey: string; database: string }) {
    const res = await fetch("/api/auth/semrush-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveSemrushCredentials(input: { apiKey: string; database: string }) {
    setSemrushSaving(true);
    setIntegrationsMessage(null);
    try {
      const res = await fetch("/api/auth/semrush-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to save Semrush credentials");
      await reload(false);
      setIntegrationsMessage("Semrush API key saved.");
    } catch (err) {
      setIntegrationsMessage(err instanceof Error ? err.message : "Failed to save Semrush credentials");
      throw err;
    } finally {
      setSemrushSaving(false);
    }
  }

  async function deleteSemrushCredentials() {
    if (!window.confirm("Remove the organization Semrush API key?")) return;
    setSemrushDeleting(true);
    setIntegrationsMessage(null);
    try {
      const res = await fetch("/api/auth/semrush-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove Semrush credentials");
      await reload(false);
      setIntegrationsMessage("Semrush credentials removed.");
    } catch (err) {
      setIntegrationsMessage(err instanceof Error ? err.message : "Failed to remove Semrush credentials");
      throw err;
    } finally {
      setSemrushDeleting(false);
    }
  }

  async function testDeeplKey(key: string) {
    const res = await fetch("/api/auth/deepl-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; note?: string };
    return { ...credentialTestResult(data), note: data.note };
  }

  async function saveDeeplKey(key: string) {
    setDeeplSaving(true);
    setIntegrationsMessage(null);
    try {
      const res = await fetch("/api/auth/deepl-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      if (!res.ok) throw new Error("Failed to save DeepL key");
      await reload(false);
      setIntegrationsMessage("DeepL API key saved.");
    } catch (err) {
      setIntegrationsMessage(err instanceof Error ? err.message : "Failed to save DeepL key");
      throw err;
    } finally {
      setDeeplSaving(false);
    }
  }

  async function deleteDeeplKey() {
    if (!window.confirm("Remove the organization DeepL API key?")) return;
    setDeeplDeleting(true);
    setIntegrationsMessage(null);
    try {
      const res = await fetch("/api/auth/deepl-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove DeepL key");
      await reload(false);
      setIntegrationsMessage("DeepL API key removed.");
    } catch (err) {
      setIntegrationsMessage(err instanceof Error ? err.message : "Failed to remove DeepL key");
      throw err;
    } finally {
      setDeeplDeleting(false);
    }
  }

  async function testStockCredentials(input: { provider: string; apiKey: string }) {
    const res = await fetch("/api/auth/stock-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; note?: string };
    return { ...credentialTestResult(data), note: data.note };
  }

  async function saveStockCredentials(input: { provider: string; apiKey: string }) {
    setStockSavingProvider(input.provider);
    setIntegrationsMessage(null);
    try {
      const res = await fetch("/api/auth/stock-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to save stock credentials");
      await reload(false);
      setIntegrationsMessage(`${input.provider} API key saved.`);
    } catch (err) {
      setIntegrationsMessage(err instanceof Error ? err.message : "Failed to save stock credentials");
      throw err;
    } finally {
      setStockSavingProvider(null);
    }
  }

  async function deleteStockCredentials(provider: string) {
    if (!window.confirm(`Remove the organization ${provider} API key?`)) return;
    setStockRemovingProvider(provider);
    setIntegrationsMessage(null);
    try {
      const res = await fetch("/api/auth/stock-credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("Failed to remove stock credentials");
      await reload(false);
      setIntegrationsMessage(`${provider} API key removed.`);
    } catch (err) {
      setIntegrationsMessage(err instanceof Error ? err.message : "Failed to remove stock credentials");
      throw err;
    } finally {
      setStockRemovingProvider(null);
    }
  }

  return (
    <SettingsView
      activeTab={activeTab}
      onTabChange={changeTab}
      isGoogleOnly={isGoogleOnly}
      email={displayEmail}
      name={name}
      avatarUrl={avatarUrl}
      onNameChange={setName}
      onAvatarUrlChange={setAvatarUrl}
      onSaveProfile={() => void saveProfile()}
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
      onChangePassword={() => void changePassword()}
      passwordSaving={passwordSaving}
      passwordMessage={passwordMessage}
      forgotPasswordHref={forgotPasswordHref}
      renderForgotPasswordLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
      onDeleteAccount={() => void deleteAccount()}
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
      onOpenBillingPortal={openBillingPortal}
      portalLoading={portalLoading}
      billingMessage={billingMessage}
      integrationsSummary={integrationsSummary}
      onSaveSemrushCredentials={saveSemrushCredentials}
      onDeleteSemrushCredentials={deleteSemrushCredentials}
      onTestSemrushCredentials={testSemrushCredentials}
      semrushSaving={semrushSaving}
      semrushDeleting={semrushDeleting}
      onSaveDeeplKey={saveDeeplKey}
      onDeleteDeeplKey={deleteDeeplKey}
      onTestDeeplKey={testDeeplKey}
      deeplSaving={deeplSaving}
      deeplDeleting={deeplDeleting}
      onSaveStockCredentials={saveStockCredentials}
      onDeleteStockCredentials={deleteStockCredentials}
      onTestStockCredentials={testStockCredentials}
      stockSavingProvider={stockSavingProvider}
      stockRemovingProvider={stockRemovingProvider}
      integrationsMessage={integrationsMessage}
      securitySupplement={
        <>
          <MfaSettingsPanel />
          <OrgSecurityPanel canManage={canManageProviderKeys} />
        </>
      }
      billingContent={
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading billing…</p>}>
          <SettingsBillingPanel />
        </Suspense>
      }
      aiProvidersNote={<PublicApiKeysPanel canManage={canManageProviderKeys} />}
    />
  );
}
