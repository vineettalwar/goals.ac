import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema-sqlite";
import type { PlatformVoiceChannel } from "@workspace/db/schema-sqlite";
import {
  getBrandVoiceSkill,
  regenerateBrandVoiceSkill,
  updateBrandVoiceSkill,
} from "@workspace/content-engine/brand/brand-voice-skill";
import { ingestBrandVoiceDocuments } from "@workspace/content-engine/brand/brand-voice-indexer";
import {
  isValidChannel,
  isValidSocialPlatform,
  PLATFORM_CHANNELS,
  updatePlatformVoiceChannel,
} from "@workspace/content-engine/platform-voice";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { getAccessibleProject, requireProjectAccess } from "./project-access";

const putSkillBody = z.object({
  skill: z.string(),
  skillLocked: z.boolean().optional(),
});

const ingestJsonBody = z.object({
  texts: z.array(z.string().min(80)).min(1).max(20),
  title: z.string().optional(),
});

const updateChannelBody = z.object({
  channel: z.string().optional(),
  writingExamples: z.array(z.string()).optional(),
  typicalStructure: z.string().optional(),
  hookPatterns: z.array(z.string()).optional(),
  doWords: z.array(z.string()).optional(),
  dontWords: z.array(z.string()).optional(),
  voiceTraits: z.array(z.string()).optional(),
});

const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 10;

export async function handleBrandVoiceWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const skillPutMatch = path.match(/^\/api\/website-projects\/(\d+)\/brand-voice\/skill$/);
  if (skillPutMatch && request.method === "PUT") {
    const projectId = Number.parseInt(skillPutMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const parsed = putSkillBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request body" }, { status: 400 }));
    }

    await updateBrandVoiceSkill(projectId, parsed.data.skill, parsed.data.skillLocked);
    const skill = await getBrandVoiceSkill(projectId);
    return withCors(request, Response.json(skill));
  }

  const skillPostMatch = path.match(/^\/api\/website-projects\/(\d+)\/brand-voice\/skill$/);
  if (skillPostMatch && request.method === "POST") {
    const projectId = Number.parseInt(skillPostMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const billingPrep = await prepareAiBilling({
      userId,
      tier: "planning",
      quotaKind: "article",
    });
    if (!billingPrep.ok) return withCors(request, billingPrep.response);

    try {
      const regenerated = await regenerateBrandVoiceSkill(projectId);
      const skill = await getBrandVoiceSkill(projectId);

      await completeAiBilling(billingPrep.ctx, {
        userId,
        eventType: "brand_voice_skill",
        usedByok: billingPrep.usedByok,
        tier: "planning",
      });

      return withCors(request, Response.json({ ...skill, regenerated: Boolean(regenerated) }));
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "generation_failed");
      return withCors(
        request,
        Response.json({ error: "Failed to regenerate brand voice skill" }, { status: 500 }),
      );
    }
  }

  const ingestMatch = path.match(/^\/api\/website-projects\/(\d+)\/brand-voice\/ingest$/);
  if (ingestMatch && request.method === "POST") {
    const projectId = Number.parseInt(ingestMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const contentType = request.headers.get("content-type") ?? "";
    const documents: Array<{ text: string; title?: string; fileName?: string }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const pasted = formData.get("text");
      if (typeof pasted === "string" && pasted.trim().length >= 80) {
        documents.push({ text: pasted.trim(), title: "Pasted sample" });
      }

      const files = [...formData.getAll("files"), ...formData.getAll("file")].filter(
        (entry): entry is File => entry instanceof File,
      );

      if (files.length > MAX_FILES) {
        return withCors(
          request,
          Response.json({ error: `Maximum ${MAX_FILES} files per upload` }, { status: 400 }),
        );
      }

      for (const file of files) {
        const text = await file.text();
        const bytes = new TextEncoder().encode(text).byteLength;
        if (bytes > MAX_TEXT_BYTES) {
          return withCors(
            request,
            Response.json({ error: `File ${file.name} exceeds 2MB limit` }, { status: 400 }),
          );
        }
        if (text.trim().length < 80) continue;
        documents.push({
          text: text.trim(),
          title: file.name,
          fileName: file.name,
        });
      }
    } else {
      const parsed = ingestJsonBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return withCors(
          request,
          Response.json(
            { error: "Provide texts[] (min 80 chars each) or multipart upload" },
            { status: 400 },
          ),
        );
      }
      for (const text of parsed.data.texts) {
        documents.push({ text, title: parsed.data.title ?? "Uploaded sample" });
      }
    }

    if (documents.length === 0) {
      return withCors(
        request,
        Response.json({ error: "No valid text samples (minimum 80 characters each)" }, { status: 400 }),
      );
    }

    const sourceIds = await ingestBrandVoiceDocuments(
      projectId,
      documents.map((doc, index) => ({
        sourceType: "upload" as const,
        sourceUrl: `upload:${Date.now()}:${index}`,
        title: doc.title ?? `Upload ${index + 1}`,
        text: doc.text,
        metadata: { fileName: doc.fileName },
      })),
    );

    return withCors(request, Response.json({ ok: true, sourceIds, count: sourceIds.length }));
  }

  const platformVoicePutMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/brand-profile\/platform-voice\/([^/]+)$/,
  );
  if (platformVoicePutMatch && request.method === "PUT") {
    const projectId = Number.parseInt(platformVoicePutMatch[1]!, 10);
    const platformRaw = platformVoicePutMatch[2]!;
    if (!isValidSocialPlatform(platformRaw)) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    const parsed = updateChannelBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const channel = parsed.data.channel ?? PLATFORM_CHANNELS[platformRaw][0];
    if (!isValidChannel(platformRaw, channel)) {
      return withCors(request, Response.json({ error: "Invalid channel for platform" }, { status: 400 }));
    }

    const [brandProfile] = await db
      .select({ platformVoices: brandProfilesTable.platformVoices })
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);
    if (!brandProfile) {
      return withCors(request, Response.json({ error: "Brand profile not found" }, { status: 404 }));
    }

    const updates: Partial<PlatformVoiceChannel> = {};
    if (parsed.data.writingExamples !== undefined) {
      updates.writingExamples = parsed.data.writingExamples;
    }
    if (parsed.data.typicalStructure !== undefined) {
      updates.typicalStructure = parsed.data.typicalStructure;
    }
    if (parsed.data.hookPatterns !== undefined) updates.hookPatterns = parsed.data.hookPatterns;
    if (parsed.data.doWords !== undefined) updates.doWords = parsed.data.doWords;
    if (parsed.data.dontWords !== undefined) updates.dontWords = parsed.data.dontWords;
    if (parsed.data.voiceTraits !== undefined) updates.voiceTraits = parsed.data.voiceTraits;

    const platformVoices = updatePlatformVoiceChannel({
      voices: brandProfile.platformVoices,
      platform: platformRaw,
      channel,
      updates,
    });

    const [updated] = await db
      .update(brandProfilesTable)
      .set({ platformVoices })
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .returning();

    return withCors(
      request,
      Response.json({
        platform: platformRaw,
        profile: updated?.platformVoices?.[platformRaw] ?? null,
      }),
    );
  }

  return null;
}
