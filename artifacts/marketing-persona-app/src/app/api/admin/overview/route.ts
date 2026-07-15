import { NextResponse } from "next/server";
import { getAdminOverview } from "@/lib/org/admin-overview";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";

export async function GET() {
  const { error } = await requirePlatformAdminApi();
  if (error) return error;

  const overview = await getAdminOverview();
  return NextResponse.json(overview);
}
