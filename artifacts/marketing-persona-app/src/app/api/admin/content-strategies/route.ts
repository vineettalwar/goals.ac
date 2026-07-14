import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { listAdminContentStrategies } from "@/lib/admin/admin-content-strategies";

export async function GET(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const organizationIdParam = searchParams.get("organizationId");
  const organizationId =
    organizationIdParam && organizationIdParam !== "all"
      ? Number.parseInt(organizationIdParam, 10)
      : undefined;
  const unlinkedOnly = searchParams.get("unlinkedOnly") === "true";

  const strategies = await listAdminContentStrategies({
    search,
    organizationId: organizationId && !Number.isNaN(organizationId) ? organizationId : undefined,
    unlinkedOnly,
  });

  return NextResponse.json({ strategies, total: strategies.length });
}
