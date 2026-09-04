import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { getPublishQualityDistribution } from "@/lib/admin/publish-quality-distribution";

/**
 * Read-only: the real-draft qualityScore distribution and blocker/warning
 * code frequency behind minQualityScore, which stays unset until a human
 * has reviewed this. Aggregates across all organizations' publish attempts,
 * so it carries the same platform/super-admin gate as its neighbours.
 */
export async function GET(req: Request) {
  const { error } = await requirePlatformAdminApi();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const daysParam = searchParams.get("days");
  const parsedDays = daysParam ? Number(daysParam) : undefined;
  const days = parsedDays != null && Number.isFinite(parsedDays) && parsedDays > 0 ? Math.floor(parsedDays) : undefined;

  const result = await getPublishQualityDistribution(days);
  return NextResponse.json(result);
}
