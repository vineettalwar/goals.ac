import Link from "next/link";
import { getPlatformSettings } from "@/lib/platform/platform-settings";

export default async function MaintenancePage() {
  const settings = await getPlatformSettings();
  const message =
    settings.maintenanceMessage ??
    "goals.ac is temporarily unavailable for maintenance. Please check back shortly.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold mb-3">We&apos;ll be right back</h1>
      <p className="text-muted-foreground max-w-md mb-8">{message}</p>
      <Link href="/login" className="text-sm text-primary hover:underline">
        Sign in
      </Link>
    </div>
  );
}
