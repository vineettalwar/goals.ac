import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getPlatformSettings();

  if (settings.platformEnabled) {
    return NextResponse.json({ status: "operational" as const }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  return NextResponse.json(
    {
      status: "maintenance" as const,
      message:
        settings.maintenanceMessage ??
        "We're performing scheduled maintenance. Please check back shortly.",
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
