import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema/website_projects";
import type { EncryptedStockCredentialsMap } from "@workspace/db/schema/stock-credentials";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/org/org-access";
import { encryptSecret } from "@workspace/security/encryption";
import { maskStockCredentialLastFour } from "@workspace/content-engine/support/stock-credentials";
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

function readProjectEncrypted(contentStyle: ContentStyle | null): EncryptedStockCredentialsMap {
  return contentStyle?.imageSettings?.encryptedStockCredentials ?? {};
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [project] = await db
    .select({ contentStyle: websiteProjectsTable.contentStyle })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const contentStyle = (project?.contentStyle as ContentStyle | null) ?? null;
  const encrypted = readProjectEncrypted(contentStyle);
  const masked = maskStockCredentialLastFour(encrypted);

  return NextResponse.json({
    platform: getPlatformStockImageStatus(),
    project: Object.entries(masked).map(([provider, apiKeyLastFour]) => ({
      provider,
      apiKeyLastFour,
      billing: STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY].billing,
      searchImplemented:
        STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY].searchImplemented,
    })),
    providers: listByokStockProviders(),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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

  const [project] = await db
    .select({ contentStyle: websiteProjectsTable.contentStyle })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const contentStyle = (project.contentStyle as ContentStyle | null) ?? {};
  const existing = readProjectEncrypted(contentStyle);
  const imageSettings = {
    ...contentStyle.imageSettings,
    encryptedStockCredentials: {
      ...existing,
      [provider]: encryptSecret(apiKey.trim()),
    },
  };

  await db
    .update(websiteProjectsTable)
    .set({
      contentStyle: {
        ...contentStyle,
        imageSettings,
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));

  return NextResponse.json({
    ok: true,
    provider,
    apiKeyLastFour: apiKey.trim().slice(-4),
    billing: meta.billing,
    searchImplemented: meta.searchImplemented,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const provider = new URL(req.url).searchParams.get("provider") ?? "";
  if (!isStockProviderId(provider)) {
    return NextResponse.json({ error: "Unknown stock provider" }, { status: 400 });
  }

  const [project] = await db
    .select({ contentStyle: websiteProjectsTable.contentStyle })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const contentStyle = (project.contentStyle as ContentStyle | null) ?? {};
  const existing = { ...readProjectEncrypted(contentStyle) };
  delete existing[provider];

  const imageSettings = {
    ...contentStyle.imageSettings,
    encryptedStockCredentials:
      Object.keys(existing).length > 0 ? existing : undefined,
  };

  await db
    .update(websiteProjectsTable)
    .set({
      contentStyle: {
        ...contentStyle,
        imageSettings,
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));

  return NextResponse.json({ ok: true });
}
