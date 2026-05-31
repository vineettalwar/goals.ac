import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable, brandProfilesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const ContentStyleBody = z.object({
  tonePreset: z.enum(["professional", "casual", "technical", "conversational"]).optional(),
  personaName: z.string().optional(),
  defaultWordCount: z.number().int().min(300).max(3000).optional(),
  primaryLanguage: z.string().optional(),
  forbiddenWords: z.array(z.string()).optional(),
  readingLevel: z.enum(["general", "intermediate", "expert"]).optional(),
});

const PatchBody = z.object({
  name: z.string().optional(),
  url: z.string().url().optional(),
  crawlStatus: z.string().optional(),
  scrapeStatus: z.string().optional(),
  scrapeData: z.unknown().optional(),
  contentStyle: ContentStyleBody.optional(),
  // Brand profile fields
  companyName: z.string().optional(),
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
  voiceTone: z.string().optional(),
  primaryKeywords: z.array(z.string()).optional(),
  competitorUrls: z.array(z.string()).optional(),
  // CMS integrations
  cmsIntegrations: z.unknown().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  try {
    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, id), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, id))
      .limit(1);

    return NextResponse.json({ ...project, brandProfile: brandProfile ?? null });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, id), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Update project-level fields
    const projectUpdates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) projectUpdates.name = parsed.data.name;
    if (parsed.data.url !== undefined) projectUpdates.url = parsed.data.url;
    if (parsed.data.crawlStatus !== undefined) projectUpdates.crawlStatus = parsed.data.crawlStatus;
    if (parsed.data.scrapeStatus !== undefined) projectUpdates.scrapeStatus = parsed.data.scrapeStatus;
    if (parsed.data.scrapeData !== undefined) projectUpdates.scrapeData = parsed.data.scrapeData;
    if (parsed.data.contentStyle !== undefined) projectUpdates.contentStyle = parsed.data.contentStyle;
    if (parsed.data.cmsIntegrations !== undefined) projectUpdates.cmsIntegrations = parsed.data.cmsIntegrations;

    if (Object.keys(projectUpdates).length > 0) {
      await db.update(websiteProjectsTable).set(projectUpdates).where(eq(websiteProjectsTable.id, id));
    }

    // Update brand profile fields if present
    const brandUpdates: Record<string, unknown> = {};
    if (parsed.data.companyName !== undefined) brandUpdates.companyName = parsed.data.companyName;
    if (parsed.data.industry !== undefined) brandUpdates.industry = parsed.data.industry;
    if (parsed.data.targetAudience !== undefined) brandUpdates.targetAudience = parsed.data.targetAudience;
    if (parsed.data.voiceTone !== undefined) brandUpdates.voiceTone = parsed.data.voiceTone;
    if (parsed.data.primaryKeywords !== undefined) brandUpdates.primaryKeywords = parsed.data.primaryKeywords;
    if (parsed.data.competitorUrls !== undefined) brandUpdates.competitorUrls = parsed.data.competitorUrls;

    if (Object.keys(brandUpdates).length > 0) {
      const existing = await db
        .select({ id: brandProfilesTable.id })
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, id))
        .limit(1);

      if (existing.length > 0) {
        await db.update(brandProfilesTable).set(brandUpdates).where(eq(brandProfilesTable.websiteProjectId, id));
      } else {
        await db.insert(brandProfilesTable).values({
          websiteProjectId: id,
          companyName: (brandUpdates.companyName as string) ?? "",
          industry: (brandUpdates.industry as string) ?? "",
          targetAudience: (brandUpdates.targetAudience as string) ?? "",
          voiceTone: (brandUpdates.voiceTone as string) ?? "",
          primaryKeywords: (brandUpdates.primaryKeywords as string[]) ?? [],
          competitorUrls: (brandUpdates.competitorUrls as string[]) ?? [],
        });
      }
    }

    const [updated] = await db
      .select()
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, id))
      .limit(1);

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  try {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, id), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    await db.delete(websiteProjectsTable).where(eq(websiteProjectsTable.id, id));
    return new Response(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
