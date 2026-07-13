import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable, brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { getAccessibleProject } from "@/lib/org-access";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { scrapeBrandProfile } from "@/lib/ai/brand-scraper";

async function runBrandScrape(projectId: number, url: string): Promise<void> {
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
      await db
        .update(brandProfilesTable)
        .set({
          companyName: extract.companyName,
          industry: extract.industry,
          targetAudience: extract.targetAudience,
          voiceTone: extract.voiceTone,
          primaryKeywords: extract.primaryKeywords,
          competitorUrls: extract.competitorUrls,
        })
        .where(eq(brandProfilesTable.websiteProjectId, projectId));
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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  try {
    const project = await getAccessibleProject(id, userId!);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Start scrape asynchronously
    runBrandScrape(id, project.url).catch(() => {});

    return NextResponse.json({ message: "Scrape started", scrapeStatus: "pending" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
