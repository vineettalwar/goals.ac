import { NextResponse } from "next/server";
import { z } from "zod";
import { listAllUsers } from "@/lib/org/org-access";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";

const QuerySchema = z.object({
  search: z.string().optional(),
  organizationId: z.coerce.number().int().positive().optional(),
  platformRole: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  const { error } = await requirePlatformAdminApi();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    search: url.searchParams.get("search") ?? undefined,
    organizationId: url.searchParams.get("organizationId") ?? undefined,
    platformRole: url.searchParams.get("platformRole") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const result = await listAllUsers(parsed.data);
  return NextResponse.json({
    users: result.users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
    total: result.total,
  });
}
