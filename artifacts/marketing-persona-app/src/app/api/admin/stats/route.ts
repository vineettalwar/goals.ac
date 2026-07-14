import { NextResponse } from "next/server";
import { getPlatformStats } from "@/lib/platform/platform-stats";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";

export async function GET() {
  const { error } = await requirePlatformAdminApi();
  if (error) return error;

  const stats = await getPlatformStats();
  return NextResponse.json({ stats });
}
