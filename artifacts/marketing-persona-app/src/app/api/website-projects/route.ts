import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable, brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { scrapeBrandProfile } from "@/lib/ai/brand-scraper";
import { z } from "zod";

const CreateProjectBody = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Must be a valid URL"),
});

async function runBrandScrape(projectId: number, url: string, overwrite = false): Promise<void> {
  await db
    .update(websiteProjectsTable)
    .set({ scrapeStatus: "pending" })
    .where(eq(websiteProjectsTable.id, projectId));

  try {
    await assertPublicUrl(url);
    const extract = await scrapeBrandProfile(url);

    const existing = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      const updates: Record<string, unknown> = {};

      if (overwrite) {
        updates.companyName = extract.companyName;
        updates.industry = extract.industry;
        updates.targetAudience = extract.targetAudience;
        updates.voiceTone = extract.voiceTone;
        updates.primaryKeywords = extract.primaryKeywords;
        updates.competitorUrls = extract.competitorUrls;
      } else {
        if (!current.companyName && extract.companyName) updates.companyName = extract.companyName;
        if (!current.industry && extract.industry) updates.industry = extract.industry;
        if (!current.targetAudience && extract.targetAudience) updates.targetAudience = extract.targetAudience;
        if (!current.voiceTone && extract.voiceTone) updates.voiceTone = extract.voiceTone;
        if ((!current.primaryKeywords || current.primaryKeywords.length === 0) && extract.primaryKeywords.length > 0) updates.primaryKeywords = extract.primaryKeywords;
        if ((!current.competitorUrls || current.competitorUrls.length === 0) && extract.competitorUrls.length > 0) updates.competitorUrls = extract.competitorUrls;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(brandProfilesTable)
          .set(updates)
          .where(eq(brandProfilesTable.websiteProjectId, projectId));
      }
    } else {
      await db.insert(brandProfilesTable).values({
        websiteProjectId: projectId,
        companyName: extract.companyName,
        industry: extract.industry,
        targetAudience: extract.targetAudience,
        voiceTone: extract.voiceTone,
        primaryKeywords: extract.primaryKeywords,
        competitorUrls: extract.competitorUrls,
      });
    }

    await db
      .update(websiteProjectsTable)
      .set({ scrapeStatus: "done", scrapeData: extract })
      .where(eq(websiteProjectsTable.id, projectId));
  } catch {
    await db
      .update(websiteProjectsTable)
      .set({ scrapeStatus: "failed" })
      .where(eq(websiteProjectsTable.id, projectId));
  }
}

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const projects = await db
      .select()
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, userId!));

    return NextResponse.json(projects);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = CreateProjectBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { name, url } = parsed.data;

  try {
    const [project] = await db
      .insert(websiteProjectsTable)
      .values({
        userId: userId!,
        name,
        url,
        crawlStatus: "pending",
        scrapeStatus: "pending",
      })
      .returning();

    // Fire-and-forget brand scrape
    runBrandScrape(project.id, url).catch(() => {});

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
