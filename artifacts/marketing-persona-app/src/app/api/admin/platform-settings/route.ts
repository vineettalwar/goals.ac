import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/require-platform-admin";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/platform-settings";

const updateSchema = z.object({
  platformEnabled: z.boolean().optional(),
  aiGenerationEnabled: z.boolean().optional(),
  maintenanceMessage: z.string().nullable().optional(),
});

export async function GET() {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const settings = await getPlatformSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const settings = await updatePlatformSettings({
    ...parsed.data,
    updatedBy: admin.userId!,
  });

  return NextResponse.json(settings);
}
