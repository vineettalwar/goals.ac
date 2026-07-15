"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  SettingsView,
  isSiteAdmin,
  isSuperAdmin,
  type SettingsTab,
} from "@workspace/app-shell";
import { MfaSettingsPanel } from "@/components/mfa/mfa-settings-panel";
import { OrgSecurityPanel } from "@/components/org/org-security-panel";
import { SettingsBillingPanel } from "@/components/settings/settings-billing-panel";
import { useSettingsData } from "@/hooks/use-settings-data";
import type { SettingsInitialData } from "@/lib/server/loaders";

const VALID_TABS: SettingsTab[] = ["profile", "security", "billing", "account"];

function parseTab(value: string | null): SettingsTab {
  if (value && VALID_TABS.includes(value as SettingsTab)) {
    return value as SettingsTab;
  }
  return "profile";
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
    userRole,
    orgRole,
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
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("tab") === "ai") {
      router.replace("/integrations/ai");
    }
  }, [searchParams, router]);

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
    />
  );
}
