import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { getAdminContentStrategyDetail } from "@/lib/admin/admin-content-strategies";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const strategyId = Number.parseInt((await params).id, 10);
  if (Number.isNaN(strategyId)) {
    return NextResponse.json({ error: "Invalid strategy id" }, { status: 400 });
  }

  const strategy = await getAdminContentStrategyDetail(strategyId);
  if (!strategy) {
    return NextResponse.json({ error: "Content strategy not found" }, { status: 404 });
  }

  return NextResponse.json({ strategy });
}
