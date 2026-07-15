import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  assertCanCreateProject,
  getOrCreateOrganizationForUser,
  listAccessibleProjects,
  resolveOrganizationIdForUser,
} from "@/lib/org/org-access";
import { getSupportOrganizationId } from "@/lib/org/project-scope";
import { runBrandScrapeWithDiscovery } from "@workspace/content-engine/support/brand/brand-scrape-orchestrator";
import { logger } from "@/lib/utils/logger";
import { findDuplicateProjectByUrl } from "@/lib/projects/project-url";
import { logOrgAudit } from "@/lib/org/org-audit";
import { z } from "zod";

const CreateProjectBody = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Must be a valid URL"),
});

function clientIp(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export async function GET() {
  const { session, userId, error } = await requireAuth();
  if (error) return error;

  try {
    const projects = await listAccessibleProjects(userId!, getSupportOrganizationId(session));
    return NextResponse.json(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        url: project.url,
        organizationId: project.organizationId,
        crawlStatus: project.crawlStatus,
        primaryLanguage:
          (project.contentStyle as ContentStyle | null)?.primaryLanguage ?? "en",
      })),
    );
  } catch (err) {
    logger.error({ err, userId }, "Failed to list website projects");
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
    let organizationId = await resolveOrganizationIdForUser(userId!);
    if (organizationId == null) {
      organizationId = await getOrCreateOrganizationForUser({
        userId: userId!,
        name: "My Organization",
      });
    }

    const quotaCheck = await assertCanCreateProject(userId!, organizationId);
    if (!quotaCheck.ok) {
      return NextResponse.json(
        {
          error: quotaCheck.code ?? "quota_exhausted",
          message: quotaCheck.error,
          plan: quotaCheck.plan,
        },
        { status: quotaCheck.status },
      );
    }

    const duplicate = await findDuplicateProjectByUrl(organizationId, url);
    if (duplicate) {
      return NextResponse.json(
        {
          error: "duplicate_website",
          message: `A project for this website already exists (${duplicate.name}).`,
        },
        { status: 409 },
      );
    }

    const [project] = await db
      .insert(websiteProjectsTable)
      .values({
        userId: userId!,
        organizationId,
        name,
        url,
        crawlStatus: "pending",
        scrapeStatus: "pending",
      })
      .returning();

    runBrandScrapeWithDiscovery(project.id, url).catch((err) => {
      logger.error({ err, projectId: project.id, url }, "Background brand scrape failed");
    });

    await logOrgAudit({
      organizationId,
      actorUserId: userId,
      action: "project.created",
      resourceType: "website_project",
      resourceId: project.id,
      metadata: { name, url },
      ip: clientIp(req),
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    logger.error({ err, userId, url }, "Failed to create website project");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
