"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsBillingPanel } from "@/components/settings/settings-billing-panel";
import { SettingsProfilePanel } from "@/components/settings/settings-profile-panel";
import { SettingsSecurityPanel } from "@/components/settings/settings-security-panel";
import { SettingsAccountPanel } from "@/components/settings/settings-account-panel";

interface SettingsClientProps {
  initialData?: import("@/lib/server/loaders").SettingsInitialData;
}

export function SettingsClient({ initialData }: SettingsClientProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") ?? "profile");
  const [hasGoogleId, setHasGoogleId] = useState(initialData?.me?.hasGoogleId ?? false);
  const [hasPassword, setHasPassword] = useState(initialData?.me?.hasPassword ?? true);

  useEffect(() => {
    if (searchParams.get("tab") === "ai") {
      window.location.replace("/integrations/ai");
    }
  }, [searchParams]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (initialData) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setHasGoogleId(d.hasGoogleId ?? false);
        setHasPassword(d.hasPassword ?? true);
      });
  }, [initialData]);

  const isGoogleOnly = hasGoogleId && !hasPassword;
  const canManageAiSettings =
    initialData?.canManageAiSettings ??
    (session?.user?.orgRole === "site_admin" ||
      session?.user?.orgRole === "owner" ||
      session?.user?.role === "super_admin" ||
      session?.user?.role === "admin");

  return (
    <div className={`${APP_SHELL_PAGE} space-y-6`}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, organization AI settings, and account.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 h-auto justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="profile" className="shadow-none">
            Profile
          </TabsTrigger>
          {!isGoogleOnly && (
            <TabsTrigger value="security" className="shadow-none">
              Security
            </TabsTrigger>
          )}
          <TabsTrigger value="billing" className="shadow-none">
            Billing
          </TabsTrigger>
          <TabsTrigger value="account" className="shadow-none">
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <SettingsProfilePanel initialData={initialData} />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SettingsSecurityPanel canManage={canManageAiSettings} />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading billing…</p>}>
            <SettingsBillingPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="account">
          <SettingsAccountPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
