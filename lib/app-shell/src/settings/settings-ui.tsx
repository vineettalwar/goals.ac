"use client";

import { type ReactNode, useEffect, useId, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  KeyRound,
  Shield,
  User,
} from "lucide-react";
import { cn } from "../cn";
import { APP_SHELL_PAGE } from "../shell-constants";
import { gravatarUrlForEmail } from "./gravatar";
import { readAvatarFileAsDataUrl } from "./read-avatar-file";
import {
  PLAN_LABELS,
  type SettingsBillingSummary,
  type SettingsTab,
  type UsageSummary,
} from "./types";

function profileInitials(name: string, email: string): string {
  const base = name.trim() || email.trim();
  if (!base) return "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

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

const TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof User;
  hideWhenGoogleOnly?: boolean;
}> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield, hideWhenGoogleOnly: true },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "account", label: "Account", icon: AlertTriangle },
];

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
  billingSummary,
  billingLoading = false,
  onOpenBillingPortal,
  portalLoading = false,
  billingMessage,
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
  billingSummary?: SettingsBillingSummary | null;
  billingLoading?: boolean;
  onOpenBillingPortal?: () => Promise<void>;
  portalLoading?: boolean;
  billingMessage?: string | null;
  securitySupplement?: ReactNode;
  billingContent?: ReactNode;
}) {
  const visibleTabs = TABS.filter((tab) => !tab.hideWhenGoogleOnly || !isGoogleOnly);
  const fileInputId = useId();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [gravatarPreview, setGravatarPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!email.trim()) {
      setGravatarPreview(null);
      return;
    }
    void gravatarUrlForEmail(email, 128).then((url) => {
      if (!cancelled) setGravatarPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const previewSrc =
    avatarUrl.trim().startsWith("data:image/") || /^https:\/\//i.test(avatarUrl.trim())
      ? avatarUrl.trim()
      : (gravatarPreview ?? null);

  async function onAvatarFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      onAvatarUrlChange(await readAvatarFileAsDataUrl(file));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not read image.");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className={`${APP_SHELL_PAGE} space-y-6`}>
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, billing, and account.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1">
        {visibleTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" ? (
        <div className="space-y-6">
          <div className="space-y-4 p-0">
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
            <div className="space-y-3">
              <p className="text-sm font-medium">Avatar</p>
              <div className="flex flex-wrap items-center gap-4">
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground ring-1 ring-border"
                    aria-hidden
                  >
                    {profileInitials(name, email)}
                  </div>
                )}
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label
                      htmlFor={fileInputId}
                      className={cn(
                        "inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary",
                        avatarBusy && "pointer-events-none opacity-50",
                      )}
                    >
                      {avatarBusy ? "Processing…" : "Upload photo"}
                    </label>
                    <input
                      id={fileInputId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={avatarBusy}
                      onChange={(event) => {
                        void onAvatarFileChange(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    {avatarUrl.trim() ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarError(null);
                          onAvatarUrlChange("");
                        }}
                        className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a photo from your computer (stored in media). Otherwise we use your
                    Google photo if linked, then Gravatar for your email.
                  </p>
                  {avatarError ? <p className="text-xs text-destructive">{avatarError}</p> : null}
                </div>
              </div>
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

          <div className="space-y-4 p-0">
            <h2 className="font-semibold">Usage this month</h2>
            {usageLoading ? <p className="text-sm text-muted-foreground">Loading usage…</p> : null}
            {usage ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Articles</p>
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
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-2xl font-bold">{PLAN_LABELS[usage.plan]}</p>
                </div>
                {usage.usesByok ? (
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs text-muted-foreground">AI key</p>
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

      {activeTab === "security" && showSecurityTab ? (
        <div className="space-y-6">
          {securitySupplement}
          <div className="space-y-4 p-0">
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
        <div className="space-y-4 p-0">
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
                      Subscription renews{" "}
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
        <div className="space-y-4 border-destructive/30">
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
