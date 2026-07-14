import { Suspense } from "react";
import { getSession } from "@/auth";
import { SettingsClient } from "@/components/settings/settings-client";
import { loadSettingsInitialData } from "@/lib/server/loaders";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const initialData = await loadSettingsInitialData(userId);

  return (
    <Suspense fallback={<div className="px-8 py-8 text-sm text-muted-foreground">Loading settings…</div>}>
      <SettingsClient initialData={initialData} />
    </Suspense>
  );
}
