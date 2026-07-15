import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import type { EncryptedStockCredentialsMap } from "@workspace/db/schema/stock-credentials";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { encryptSecret } from "@workspace/security/encryption";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import {
  getOrgEncryptedStockCredentials,
  maskStockCredentialLastFour,
} from "@workspace/content-engine/support/integrations/stock-credentials";
import {
  getPlatformStockImageStatus,
  isStockProviderId,
  listByokStockProviders,
  STOCK_PROVIDER_REGISTRY,
} from "@workspace/stock-images";

const StockCredentialBody = z.object({
  provider: z.string().refine(isStockProviderId, "Unknown stock provider"),
  apiKey: z.string().min(8, "API key is too short"),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  const encrypted = orgSettings
    ? await getOrgEncryptedStockCredentials(orgSettings.organizationId)
    : null;
  const masked = maskStockCredentialLastFour(encrypted ?? undefined);

  return NextResponse.json({
    platform: getPlatformStockImageStatus(),
    org: Object.entries(masked).map(([provider, apiKeyLastFour]) => ({
      provider,
      apiKeyLastFour,
      billing: STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY].billing,
      searchImplemented:
        STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY].searchImplemented,
    })),
    providers: listByokStockProviders(),
  });
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = StockCredentialBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { provider, apiKey } = parsed.data;
  const meta = STOCK_PROVIDER_REGISTRY[provider];
  if (!meta.byokAllowed) {
    return NextResponse.json({ error: "BYOK is not supported for this provider" }, { status: 400 });
  }

  const existing = (await getOrgEncryptedStockCredentials(orgSettings.organizationId)) ?? {};
  const next: EncryptedStockCredentialsMap = {
    ...existing,
    [provider]: encryptSecret(apiKey.trim()),
  };

  await db
    .update(organizationsTable)
    .set({ encryptedStockCredentials: next })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  return NextResponse.json({
    ok: true,
    provider,
    apiKeyLastFour: apiKey.trim().slice(-4),
    billing: meta.billing,
    searchImplemented: meta.searchImplemented,
  });
}

export async function DELETE(req: Request) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const provider = new URL(req.url).searchParams.get("provider") ?? "";
  if (!isStockProviderId(provider)) {
    return NextResponse.json({ error: "Unknown stock provider" }, { status: 400 });
  }

  const existing = (await getOrgEncryptedStockCredentials(orgSettings.organizationId)) ?? {};
  const next = { ...existing };
  delete next[provider];

  await db
    .update(organizationsTable)
    .set({
      encryptedStockCredentials: Object.keys(next).length > 0 ? next : null,
    })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  return NextResponse.json({ ok: true });
}
