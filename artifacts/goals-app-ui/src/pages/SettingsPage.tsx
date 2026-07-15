import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SettingsView, type SettingsTab, isSiteAdmin, isSuperAdmin } from "@workspace/app-shell";
import { MfaSettingsPanel } from "@/components/mfa/MfaSettingsPanel";
import { OrgSecurityPanel } from "@/components/org/OrgSecurityPanel";
import { SettingsBillingPanel } from "@/components/settings/SettingsBillingPanel";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";
import { useSettingsData } from "@/hooks/use-settings-data";

const VALID_TABS: SettingsTab[] = ["profile", "security", "billing", "account"];

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
    userRole,
    orgRole,
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
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (searchParams.get("tab") === "ai") {
      navigate("/integrations/ai", { replace: true });
      return;
    }
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams, navigate]);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setAvatarUrl(user.avatarUrl ?? "");
    }
  }, [user]);

  function changeTab(tab: SettingsTab) {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
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
      void loadBillingSummary();
    }
  }, [searchParams, loadBillingSummary]);

  async function openBillingPortal() {
    setPortalLoading(true);
    setBillingMessage(null);
    try {
      const data = await apiFetch<{ url?: string }>("/api/billing/portal", { method: "POST" });
      if (!data.url) {
        throw new Error("Could not open billing portal");
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

  if ((authLoading && !user) || (loading && !email)) {
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
      billingSummary={billingSummary}
      billingLoading={billingLoading}
      onOpenBillingPortal={openBillingPortal}
      portalLoading={portalLoading}
      billingMessage={billingMessage}
      securitySupplement={
        <>
          <MfaSettingsPanel />
          <OrgSecurityPanel canManage={canManageProviderKeys} />
        </>
      }
      billingContent={
        <SettingsBillingPanel
          billingSummary={billingSummary}
          usage={usage}
          onOpenBillingPortal={() => void openBillingPortal()}
          portalLoading={portalLoading}
        />
      }
    />
  );
}
