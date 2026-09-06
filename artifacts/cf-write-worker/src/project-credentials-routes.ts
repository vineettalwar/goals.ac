import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import { websiteProjectsTable, type ContentStyle } from "@workspace/db/schema-sqlite";
import { encryptSecret } from "@workspace/security/encryption";
import {
  isStockProviderId,
  STOCK_PROVIDER_REGISTRY,
} from "@workspace/stock-images";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAccessibleProject } from "./project-access";

const deeplCredentialBody = z.object({
  apiKey: z.string().min(16, "API key is too short"),
});

const deeplSettingsBody = z.object({
  deeplRefinementEnabled: z.boolean().optional(),
  deeplGlossaryId: z.string().max(128).nullable().optional(),
});

const stockCredentialBody = z.object({
  provider: z.string().refine(isStockProviderId, "Unknown stock provider"),
  apiKey: z.string().min(8, "API key is too short"),
});

function readTranslationSettings(contentStyle: ContentStyle | null) {
  return contentStyle?.translationSettings ?? {};
}

function readProjectEncrypted(contentStyle: ContentStyle | null) {
  return contentStyle?.imageSettings?.encryptedStockCredentials ?? {};
}

export async function handleProjectCredentialsWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const deeplMatch = path.match(/^\/api\/website-projects\/(\d+)\/deepl-credentials$/);
  if (deeplMatch) {
    const projectId = Number.parseInt(deeplMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    if (request.method === "PATCH") {
      const body = await request.json().catch(() => null);
      const [row] = await db
        .select({ contentStyle: websiteProjectsTable.contentStyle })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);

      if (!row) {
        return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
      }

      const contentStyle = (row.contentStyle as ContentStyle | null) ?? {};
      const translationSettings = { ...readTranslationSettings(contentStyle) };

      const credentialParsed = deeplCredentialBody.safeParse(body);
      if (credentialParsed.success) {
        const apiKey = credentialParsed.data.apiKey.trim();
        translationSettings.encryptedDeeplApiKey = encryptSecret(apiKey);

        await db
          .update(websiteProjectsTable)
          .set({ contentStyle: { ...contentStyle, translationSettings } })
          .where(eq(websiteProjectsTable.id, projectId));

        return withCors(
          request,
          Response.json({
            ok: true,
            configured: true,
            apiKeyLastFour: apiKey.slice(-4),
            resolvedSource: "project",
          }),
        );
      }

      const settingsParsed = deeplSettingsBody.safeParse(body);
      if (!settingsParsed.success) {
        return withCors(
          request,
          Response.json({ error: settingsParsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
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
        .set({ contentStyle: { ...contentStyle, translationSettings } })
        .where(eq(websiteProjectsTable.id, projectId));

      return withCors(
        request,
        Response.json({
          ok: true,
          deeplRefinementEnabled: translationSettings.deeplRefinementEnabled !== false,
          deeplGlossaryId: translationSettings.deeplGlossaryId ?? "",
        }),
      );
    }

    if (request.method === "DELETE") {
      const [row] = await db
        .select({ contentStyle: websiteProjectsTable.contentStyle })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);

      if (!row) {
        return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
      }

      const contentStyle = (row.contentStyle as ContentStyle | null) ?? {};
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

      return withCors(request, Response.json({ ok: true }));
    }
  }

  const stockMatch = path.match(/^\/api\/website-projects\/(\d+)\/stock-credentials$/);
  if (stockMatch) {
    const projectId = Number.parseInt(stockMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    if (request.method === "PATCH") {
      const parsed = stockCredentialBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return withCors(
          request,
          Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
        );
      }

      const { provider, apiKey } = parsed.data;
      const meta = STOCK_PROVIDER_REGISTRY[provider];
      if (!meta.byokAllowed) {
        return withCors(request, Response.json({ error: "BYOK is not supported for this provider" }, { status: 400 }));
      }

      const [row] = await db
        .select({ contentStyle: websiteProjectsTable.contentStyle })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);

      if (!row) {
        return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
      }

      const contentStyle = (row.contentStyle as ContentStyle | null) ?? {};
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
        .set({ contentStyle: { ...contentStyle, imageSettings } })
        .where(eq(websiteProjectsTable.id, projectId));

      return withCors(
        request,
        Response.json({
          ok: true,
          provider,
          apiKeyLastFour: apiKey.trim().slice(-4),
          billing: meta.billing,
          searchImplemented: meta.searchImplemented,
        }),
      );
    }

    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const provider = url.searchParams.get("provider") ?? "";
      if (!isStockProviderId(provider)) {
        return withCors(request, Response.json({ error: "Unknown stock provider" }, { status: 400 }));
      }

      const [row] = await db
        .select({ contentStyle: websiteProjectsTable.contentStyle })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);

      if (!row) {
        return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
      }

      const contentStyle = (row.contentStyle as ContentStyle | null) ?? {};
      const existing = { ...readProjectEncrypted(contentStyle) };
      delete existing[provider];

      const imageSettings = {
        ...contentStyle.imageSettings,
        encryptedStockCredentials: Object.keys(existing).length > 0 ? existing : undefined,
      };

      await db
        .update(websiteProjectsTable)
        .set({ contentStyle: { ...contentStyle, imageSettings } })
        .where(eq(websiteProjectsTable.id, projectId));

      return withCors(request, Response.json({ ok: true }));
    }
  }

  return null;
}
