import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema/website_projects";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/org/org-access";
import { encryptSecret } from "@workspace/security/encryption";
import {
  getOrgEncryptedDeeplApiKey,
  loadDeeplCredentialContextForProject,
  maskEncryptedDeeplApiKeyLastFour,
  resolveDeeplCredentialSource,
} from "@workspace/content-engine/support/integrations/deepl-credentials";
import { resolveDeeplApiKey } from "@workspace/deepl";

const DeeplCredentialBody = z.object({
  apiKey: z.string().min(16, "API key is too short"),
});

const DeeplSettingsBody = z.object({
  deeplRefinementEnabled: z.boolean().optional(),
  deeplGlossaryId: z.string().max(128).nullable().optional(),
});

function readTranslationSettings(contentStyle: ContentStyle | null) {
  return contentStyle?.translationSettings ?? {};
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
    .select({
      contentStyle: websiteProjectsTable.contentStyle,
      organizationId: websiteProjectsTable.organizationId,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const contentStyle = (project?.contentStyle as ContentStyle | null) ?? null;
  const translationSettings = readTranslationSettings(contentStyle);
  const credentialContext = await loadDeeplCredentialContextForProject(projectId);
  const resolvedSource = resolveDeeplCredentialSource(credentialContext);

  const orgEncrypted =
    project?.organizationId != null
      ? await getOrgEncryptedDeeplApiKey(project.organizationId)
      : null;

  return NextResponse.json({
    configured: Boolean(resolveDeeplApiKey(credentialContext)),
    resolvedSource,
    org: {
      configured: Boolean(orgEncrypted),
      apiKeyLastFour: maskEncryptedDeeplApiKeyLastFour(orgEncrypted),
    },
    project: {
      configured: Boolean(translationSettings.encryptedDeeplApiKey),
      apiKeyLastFour: maskEncryptedDeeplApiKeyLastFour(translationSettings.encryptedDeeplApiKey),
    },
    deeplRefinementEnabled: translationSettings.deeplRefinementEnabled !== false,
    deeplGlossaryId: translationSettings.deeplGlossaryId ?? "",
    docsUrl: "https://www.deepl.com/pro-api",
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

  const [body, [project]] = await Promise.all([
    req.json().catch(() => null),
    db
      .select({ contentStyle: websiteProjectsTable.contentStyle })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1),
  ]);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const contentStyle = (project.contentStyle as ContentStyle | null) ?? {};
  const translationSettings = { ...readTranslationSettings(contentStyle) };

  const credentialParsed = DeeplCredentialBody.safeParse(body);
  if (credentialParsed.success) {
    const apiKey = credentialParsed.data.apiKey.trim();
    translationSettings.encryptedDeeplApiKey = encryptSecret(apiKey);

    await db
      .update(websiteProjectsTable)
      .set({
        contentStyle: {
          ...contentStyle,
          translationSettings,
        },
      })
      .where(eq(websiteProjectsTable.id, projectId));

    return NextResponse.json({
      ok: true,
      configured: true,
      apiKeyLastFour: apiKey.slice(-4),
      resolvedSource: "project",
    });
  }

  const settingsParsed = DeeplSettingsBody.safeParse(body);
  if (!settingsParsed.success) {
    return NextResponse.json(
      { error: settingsParsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  if (settingsParsed.data.deeplRefinementEnabled !== undefined) {
    translationSettings.deeplRefinementEnabled = settingsParsed.data.deeplRefinementEnabled;
  }
  if (settingsParsed.data.deeplGlossaryId !== undefined) {
    const glossaryId = settingsParsed.data.deeplGlossaryId?.trim();
    translationSettings.deeplGlossaryId = glossaryId || undefined;
  }

  await db
    .update(websiteProjectsTable)
    .set({
      contentStyle: {
        ...contentStyle,
        translationSettings,
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));

  return NextResponse.json({
    ok: true,
    deeplRefinementEnabled: translationSettings.deeplRefinementEnabled !== false,
    deeplGlossaryId: translationSettings.deeplGlossaryId ?? "",
  });
}

export async function DELETE(
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
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const contentStyle = (project.contentStyle as ContentStyle | null) ?? {};
  const translationSettings = { ...readTranslationSettings(contentStyle) };
  delete translationSettings.encryptedDeeplApiKey;

  await db
    .update(websiteProjectsTable)
    .set({
      contentStyle: {
        ...contentStyle,
        translationSettings:
          Object.keys(translationSettings).length > 0 ? translationSettings : undefined,
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));

  return NextResponse.json({ ok: true });
}
