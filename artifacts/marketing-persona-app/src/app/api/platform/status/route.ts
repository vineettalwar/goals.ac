import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/platform/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getPlatformSettings();

  // Short private cache: middleware + clients may hit this often; admin toggle
  // updates are rare and already TTL-bounded in getPlatformSettings.
  const cacheHeaders = { "Cache-Control": "private, max-age=15" };

  if (settings.platformEnabled) {
    return NextResponse.json({ status: "operational" as const }, {
      headers: cacheHeaders,
    });
  }

  return NextResponse.json(
    {
      status: "maintenance" as const,
      message:
        settings.maintenanceMessage ??
        "We're performing scheduled maintenance. Please check back shortly.",
    },
    { headers: cacheHeaders },
  );
}
