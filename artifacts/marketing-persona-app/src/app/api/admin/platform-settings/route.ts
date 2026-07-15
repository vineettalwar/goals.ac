import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/platform/platform-settings";
import { getIntegrationEnvStatus, getPlatformIntegrationDefinitions } from "@/lib/platform/platform-features";

const updateSchema = z.object({
  platformEnabled: z.boolean().optional(),
  aiGenerationEnabled: z.boolean().optional(),
  maintenanceMessage: z.string().nullable().optional(),
  signupsEnabled: z.boolean().optional(),
  stripeBillingEnabled: z.boolean().optional(),
  googleIntegrationsEnabled: z.boolean().optional(),
  bingWebmasterEnabled: z.boolean().optional(),
  socialPublishingEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
});

export async function GET() {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const [settings, env, integrations] = await Promise.all([
    getPlatformSettings(),
    Promise.resolve(getIntegrationEnvStatus()),
    Promise.resolve(getPlatformIntegrationDefinitions()),
  ]);

  return NextResponse.json({ ...settings, env, integrations });
}

export async function PATCH(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [settings, { invalidatePlatformGatesCache }] = await Promise.all([
    updatePlatformSettings({
      ...parsed.data,
      updatedBy: admin.userId!,
    }),
    import("@workspace/billing"),
  ]);
  invalidatePlatformGatesCache();

  const env = getIntegrationEnvStatus();
  const integrations = getPlatformIntegrationDefinitions();
  return NextResponse.json({ ...settings, env, integrations });
}
