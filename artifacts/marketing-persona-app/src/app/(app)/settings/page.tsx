import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getSession } from "@/auth";
import { loadSettingsInitialData } from "@/lib/server/loaders";
import { isSuperAdmin } from "@/lib/org/org-access";
import { SettingsPageClient } from "./settings-page-client";

const SettingsClient = dynamic(
  () =>
    import("@/components/settings/settings-client").then((m) => m.SettingsClient),
  {
    loading: () => (
      <div className="px-8 py-8 text-sm text-muted-foreground">Loading settings…</div>
    ),
  },
);

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const initialData = await loadSettingsInitialData(userId);
  const useLegacySettings = isSuperAdmin(session.user.role);

  return (
    <Suspense fallback={<div className="px-8 py-8 text-sm text-muted-foreground">Loading settings…</div>}>
      {useLegacySettings ? (
        <SettingsClient initialData={initialData} />
      ) : (
        <SettingsPageClient initialData={initialData} />
      )}
    </Suspense>
  );
}
