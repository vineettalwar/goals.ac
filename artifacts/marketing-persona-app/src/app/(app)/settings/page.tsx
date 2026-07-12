import { getSession } from "@/auth";
import { SettingsClient } from "@/components/settings-client";
import { loadSettingsInitialData } from "@/lib/server/loaders";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const initialData = await loadSettingsInitialData(userId);

  return <SettingsClient initialData={initialData} />;
}
