import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  brandProfilesTable,
  companiesTable,
  keywordOpportunitiesTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { runBrandScrapeWithDiscovery } from "../support/brand/brand-scrape-orchestrator";
import { resolveOrganizationIdForUser } from "../support/ai/org-ai-settings";
import { hostnameFromUrl } from "./playbooks";

export async function createProjectForChatOnboard(input: {
  userId: number;
  url: string;
  name?: string;
}): Promise<{ projectId: number; reused: boolean }> {
  const organizationId = await resolveOrganizationIdForUser(input.userId);
  if (organizationId == null) {
    throw new Error("Join or create an organization before adding a site in chat");
  }
  const url = input.url.trim();
  const existing = await db
    .select({ id: websiteProjectsTable.id, url: websiteProjectsTable.url })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.organizationId, organizationId));
  const reused = existing.find((row) => normalizeUrl(row.url) === normalizeUrl(url));
  if (reused) return { projectId: reused.id, reused: true };

  const name = input.name?.trim() || hostnameFromUrl(url);
  const [project] = await db
    .insert(websiteProjectsTable)
    .values({
      userId: input.userId,
      organizationId,
      name,
      url,
      crawlStatus: "pending",
      scrapeStatus: "pending",
    })
    .returning({ id: websiteProjectsTable.id });
  if (!project) throw new Error("Failed to create project");

  await db.insert(companiesTable).values({
    userId: input.userId,
    name,
    websiteUrl: url,
  });

  void runBrandScrapeWithDiscovery(project.id, url).catch(() => {
    // ponytail: scrape is best-effort; voice_review polls scrapeStatus
  });
  return { projectId: project.id, reused: false };
}

export async function patchChatProjectName(projectId: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db
    .update(websiteProjectsTable)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(websiteProjectsTable.id, projectId));
}

export async function loadLearnSummary(projectId: number): Promise<{ title: string; bullets: string[] }> {
  const [project] = await db
    .select({
      name: websiteProjectsTable.name,
      url: websiteProjectsTable.url,
      scrapeStatus: websiteProjectsTable.scrapeStatus,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  const [brand] = await db
    .select({
      companyName: brandProfilesTable.companyName,
      industry: brandProfilesTable.industry,
      targetAudience: brandProfilesTable.targetAudience,
      brandMemory: brandProfilesTable.brandMemory,
    })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);
  const bullets: string[] = [];
  bullets.push(`Site: ${project?.url ?? "unknown"}`);
  bullets.push(`Scrape: ${project?.scrapeStatus ?? "pending"}`);
  if (brand?.companyName) bullets.push(`Brand: ${brand.companyName}`);
  if (brand?.industry) bullets.push(`Industry: ${brand.industry}`);
  if (brand?.targetAudience) bullets.push(`Audience: ${brand.targetAudience}`);
  const sufficient = brand?.brandMemory?.styleSufficiency?.sufficient;
  if (sufficient === true) bullets.push("Voice material from the site is sufficient.");
  if (sufficient === false) bullets.push("Voice material is thin — a few style questions next.");
  return { title: `Learned ${project?.name ?? "this site"}`, bullets };
}

export async function styleNeedsQuestions(projectId: number): Promise<boolean> {
  const [brand] = await db
    .select({ brandMemory: brandProfilesTable.brandMemory })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);
  return brand?.brandMemory?.styleSufficiency?.sufficient === false;
}

export async function wordpressConnected(projectId: number): Promise<boolean> {
  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  const wp = (project?.cmsIntegrations as { wordpress?: unknown } | null)?.wordpress;
  return Boolean(wp && typeof wp === "object");
}

export async function listTopicKeywords(projectId: number, limit = 8): Promise<string[]> {
  const rows = await db
    .select({ keyword: keywordOpportunitiesTable.keyword })
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.websiteProjectId, projectId))
    .limit(limit);
  return rows.map((row) => row.keyword);
}

function normalizeUrl(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().toLowerCase().replace(/\/$/, "");
  }
}
