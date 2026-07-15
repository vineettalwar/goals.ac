import { type ReactNode } from "react";
import {
  AlertTriangle,
  CreditCard,
  KeyRound,
  Shield,
  User,
} from "lucide-react";
import { cn } from "../cn";
import {
  PLAN_LABELS,
  type SettingsBillingSummary,
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

  return (
    <div className="max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, billing, and account.
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
