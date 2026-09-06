import { withCors } from "@workspace/cf-edge/cors";
import { requireSiteAdminAccess } from "@workspace/cf-edge/project-access";
import { db } from "./db";
import {
  apiKeysTable,
  companiesTable,
  conversations,
  marketingPersonasTable,
  messages,
  organizationsTable,
  roadmapsTable,
  seoArticlesTable,
  type ApiKeyScope,
} from "@workspace/db/schema-sqlite";
import { syncCompanyHumanizationToProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { generateApiKey } from "@workspace/content-engine/support/auth/api-key-auth";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import { encryptSecret } from "@workspace/security/encryption";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { getAccessibleProject } from "./project-access";

const geminiKeyBody = z.object({ key: z.string().min(1) });

const chatBody = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.number().int().positive().optional(),
  slug: z.string().min(1),
});

const humanizationBody = z.object({
  companyId: z.number().int().positive(),
  humanizationLevel: z.enum(["off", "light", "strong"]),
  writingSample: z.string().max(10000).nullable().optional(),
});

const createApiKeyBody = z.object({
  name: z.string().min(1).max(120),
  scopes: z
    .array(z.enum(["publish:write", "content:read", "render:preview"]))
    .min(1)
    .default(["render:preview"]),
  rateLimitPerHour: z.number().int().min(10).max(10000).optional(),
});

const personaUpdateBody = z.object({
  name: z.string().min(1).optional(),
  ageRange: z.string().optional(),
  jobTitle: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  preferredContent: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const seoArticlePatchBody = z.object({
  status: z.enum(["draft", "published"]).optional(),
  content: z.string().optional(),
  title: z.string().optional(),
  metaDescription: z.string().optional(),
});

function buildSystemPrompt(roadmap: {
  industry: string;
  location: string;
  stage: string;
  content: unknown;
}): string {
  const content = roadmap.content as {
    executiveSummary?: string;
    phases?: { title: string; timeframe: string; objectives: string[] }[];
  };
  const phaseSummary =
    content.phases
      ?.map((phase) => `${phase.timeframe} — ${phase.title}: ${phase.objectives.slice(0, 2).join("; ")}`)
      .join("\n") ?? "";

  return `You are a B2B growth strategy advisor embedded in goals.ac.

Industry: ${roadmap.industry}
Location: ${roadmap.location}
Stage: ${roadmap.stage}
Executive Summary: ${content.executiveSummary ?? ""}

Phases:
${phaseSummary}

Answer questions about this roadmap. Be concise and practical.`;
}

function buildChatPrompt(history: { role: string; content: string }[], message: string): string {
  if (history.length === 0) return message;
  const transcript = history
    .map((entry) => `${entry.role === "assistant" ? "Assistant" : "User"}: ${entry.content}`)
    .join("\n\n");
  return `Previous conversation:\n${transcript}\n\nUser: ${message}\n\nAssistant:`;
}

async function requireSiteAdminResponse(request: Request, userId: number): Promise<Response | null> {
  const siteAdmin = await requireSiteAdminAccess(userId);
  if (!siteAdmin.ok) {
    return withCors(request, Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }));
  }
  return null;
}

export async function handleLegacyWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/auth/gemini-key" && request.method === "POST") {
    const forbidden = await requireSiteAdminResponse(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const parsed = geminiKeyBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "API key required" }, { status: 400 }));
    }

    await db
      .update(organizationsTable)
      .set({ encryptedGeminiKey: encryptSecret(parsed.data.key) })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(request, Response.json({ ok: true }));
  }

  if (path === "/api/auth/gemini-key" && request.method === "DELETE") {
    const forbidden = await requireSiteAdminResponse(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    await db
      .update(organizationsTable)
      .set({ encryptedGeminiKey: null })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(request, Response.json({ ok: true }));
  }

  if (path === "/api/chat" && request.method === "POST") {
    const parsed = chatBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    const [roadmap] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, parsed.data.slug))
      .limit(1);

    if (!roadmap) {
      return withCors(request, Response.json({ error: "Roadmap not found" }, { status: 404 }));
    }

    const billingPrep = await prepareAiBilling({ userId, tier: "rapid", quotaKind: "article" });
    if (!billingPrep.ok) return withCors(request, billingPrep.response);

    try {
      const { client } = await resolveAiClientForUser(userId);

      let convId = parsed.data.conversationId;
      let history: { role: string; content: string }[] = [];

      if (convId) {
        const existingMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, convId))
          .orderBy(asc(messages.createdAt));
        history = existingMessages.map((entry) => ({ role: entry.role, content: entry.content }));
      } else {
        const [conv] = await db.insert(conversations).values({ title: parsed.data.message.slice(0, 80) }).returning();
        convId = conv.id;
      }

      await db.insert(messages).values({
        conversationId: convId,
        role: "user",
        content: parsed.data.message,
      });

      const response = await client.generate({
        prompt: buildChatPrompt(history, parsed.data.message),
        systemInstruction: buildSystemPrompt(roadmap),
        maxOutputTokens: 2048,
      });

      const reply = response.text?.trim() ?? "";
      await db.insert(messages).values({ conversationId: convId, role: "assistant", content: reply });

      await completeAiBilling(billingPrep.ctx, {
        userId,
        eventType: "chat",
        usedByok: billingPrep.usedByok,
        tier: "rapid",
        promptTokens: response.usage?.promptTokens,
        outputTokens: response.usage?.outputTokens,
        totalTokens: response.usage?.totalTokens,
      });

      return withCors(request, Response.json({ reply, conversationId: convId }));
    } catch {
      await cancelAiBilling(billingPrep.ctx, "generation_failed");
      return withCors(request, Response.json({ error: "Failed to get response" }, { status: 500 }));
    }
  }

  if (path === "/api/conversations" && request.method === "DELETE") {
    const url = new URL(request.url);
    const convId = Number.parseInt(url.searchParams.get("id") ?? "", 10);
    if (!Number.isFinite(convId)) {
      return withCors(request, Response.json({ error: "Missing conversation id" }, { status: 400 }));
    }

    await db.delete(messages).where(eq(messages.conversationId, convId));
    await db.delete(conversations).where(eq(conversations.id, convId));
    return withCors(request, Response.json({ ok: true }));
  }

  if (path === "/api/companies/humanization" && request.method === "POST") {
    const parsed = humanizationBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    const [company] = await db
      .update(companiesTable)
      .set({
        humanizationLevel: parsed.data.humanizationLevel,
        writingSample: parsed.data.writingSample?.trim() ? parsed.data.writingSample.trim() : null,
      })
      .where(and(eq(companiesTable.id, parsed.data.companyId), eq(companiesTable.userId, userId)))
      .returning();

    if (!company) {
      return withCors(request, Response.json({ error: "Company not found" }, { status: 404 }));
    }

    await syncCompanyHumanizationToProject(
      userId,
      company,
      parsed.data.humanizationLevel,
      parsed.data.writingSample?.trim() ? parsed.data.writingSample.trim() : null,
    );

    return withCors(
      request,
      Response.json({
        company: {
          id: company.id,
          humanizationLevel: company.humanizationLevel,
          writingSample: company.writingSample,
        },
      }),
    );
  }

  if (path === "/api/org/api-keys" && request.method === "POST") {
    const forbidden = await requireSiteAdminResponse(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const parsed = createApiKeyBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const { rawKey, prefix, hash } = generateApiKey();
    const scopes = parsed.data.scopes as ApiKeyScope[];

    const [row] = await db
      .insert(apiKeysTable)
      .values({
        organizationId: orgSettings.organizationId,
        createdByUserId: userId,
        name: parsed.data.name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes,
        rateLimitPerHour: parsed.data.rateLimitPerHour ?? 60,
      })
      .returning({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        scopes: apiKeysTable.scopes,
        rateLimitPerHour: apiKeysTable.rateLimitPerHour,
        createdAt: apiKeysTable.createdAt,
      });

    return withCors(
      request,
      Response.json({
        key: row,
        rawKey,
        message: "Copy this key now — it will not be shown again.",
      }),
    );
  }

  const revokeApiKeyMatch = path.match(/^\/api\/org\/api-keys\/(\d+)$/);
  if (revokeApiKeyMatch && request.method === "DELETE") {
    const forbidden = await requireSiteAdminResponse(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const keyId = Number.parseInt(revokeApiKeyMatch[1]!, 10);
    const [updated] = await db
      .update(apiKeysTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(apiKeysTable.id, keyId),
          eq(apiKeysTable.organizationId, orgSettings.organizationId),
          isNull(apiKeysTable.revokedAt),
        ),
      )
      .returning({ id: apiKeysTable.id });

    if (!updated) {
      return withCors(request, Response.json({ error: "API key not found" }, { status: 404 }));
    }

    return withCors(request, Response.json({ ok: true }));
  }

  const personaMatch = path.match(/^\/api\/personas\/(\d+)$/);
  if (personaMatch && request.method === "PATCH") {
    const personaId = Number.parseInt(personaMatch[1]!, 10);
    const parsed = personaUpdateBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    const [persona] = await db
      .select({ id: marketingPersonasTable.id })
      .from(marketingPersonasTable)
      .innerJoin(companiesTable, eq(companiesTable.id, marketingPersonasTable.companyId))
      .where(and(eq(marketingPersonasTable.id, personaId), eq(companiesTable.userId, userId)))
      .limit(1);

    if (!persona) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }

    const [updated] = await db
      .update(marketingPersonasTable)
      .set(parsed.data)
      .where(eq(marketingPersonasTable.id, personaId))
      .returning();

    return withCors(request, Response.json({ persona: updated }));
  }

  if (personaMatch && request.method === "DELETE") {
    const personaId = Number.parseInt(personaMatch[1]!, 10);
    const [persona] = await db
      .select({ id: marketingPersonasTable.id })
      .from(marketingPersonasTable)
      .innerJoin(companiesTable, eq(companiesTable.id, marketingPersonasTable.companyId))
      .where(and(eq(marketingPersonasTable.id, personaId), eq(companiesTable.userId, userId)))
      .limit(1);

    if (!persona) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }

    await db.delete(marketingPersonasTable).where(eq(marketingPersonasTable.id, personaId));
    return withCors(request, Response.json({ ok: true }));
  }

  const seoArticleMatch = path.match(/^\/api\/seo-articles\/(\d+)$/);
  if (seoArticleMatch && request.method === "PATCH") {
    const articleId = Number.parseInt(seoArticleMatch[1]!, 10);
    const parsed = seoArticlePatchBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const [article] = await db
      .select()
      .from(seoArticlesTable)
      .where(eq(seoArticlesTable.id, articleId))
      .limit(1);

    if (!article) {
      return withCors(request, Response.json({ error: "Article not found" }, { status: 404 }));
    }

    if (article.websiteProjectId) {
      const project = await getAccessibleProject(article.websiteProjectId, userId);
      if (!project) {
        return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
      }
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.content !== undefined) {
      updates.content = parsed.data.content;
      updates.wordCount = parsed.data.content.split(/\s+/).filter(Boolean).length;
    }
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.metaDescription !== undefined) {
      updates.metaDescription = parsed.data.metaDescription;
    }

    const [updated] = await db
      .update(seoArticlesTable)
      .set(updates)
      .where(eq(seoArticlesTable.id, articleId))
      .returning();

    return withCors(request, Response.json(updated));
  }

  return null;
}
