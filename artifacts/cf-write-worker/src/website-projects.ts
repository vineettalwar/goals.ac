import { withCors } from "@workspace/cf-edge/cors";
import { db, countAsInt } from "@workspace/db";
import {
  websiteProjectsTable,
  brandProfilesTable,
  organizationsTable,
  organizationMembersTable,
  usersTable,
  workspacesTable,
} from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { normalizePlanId, type PlanId } from "@workspace/billing/plans";
import { resolvePlanProjectQuota } from "./plan-quotas";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { ownedProject } from "./project-access";

function normalizeProjectHost(url: string): string {
  try {
    const normalized = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return (
      url
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        ?.toLowerCase() ?? url
    );
  }
}

async function findDuplicateProjectByUrl(
  organizationId: number,
  url: string,
  excludeProjectId?: number,
): Promise<{ id: number; name: string; url: string } | null> {
  const targetHost = normalizeProjectHost(url);
  const projects = await db
    .select({
      id: websiteProjectsTable.id,
      name: websiteProjectsTable.name,
      url: websiteProjectsTable.url,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.organizationId, organizationId));

  for (const project of projects) {
    if (excludeProjectId != null && project.id === excludeProjectId) continue;
    if (normalizeProjectHost(project.url) === targetHost) {
      return project;
    }
  }
  return null;
}

async function getOrCreateWorkspaceForOrganization(
  organizationId: number,
  ownerId: number,
  name: string,
): Promise<number> {
  const [existing] = await db
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(eq(workspacesTable.organizationId, organizationId))
    .limit(1);
  if (existing) return existing.id;

  const [workspace] = await db
    .insert(workspacesTable)
    .values({ organizationId, ownerId, name })
    .onConflictDoNothing({ target: workspacesTable.organizationId })
    .returning({ id: workspacesTable.id });

  if (workspace) return workspace.id;

  const [created] = await db
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(eq(workspacesTable.organizationId, organizationId))
    .limit(1);

  if (!created) {
    throw new Error(`Failed to provision workspace for organization ${organizationId}`);
  }
  return created.id;
}

async function resolveOrganizationIdForUser(userId: number): Promise<number | null> {
  const [row] = await db
    .select({ organizationId: organizationMembersTable.organizationId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);
  return row?.organizationId ?? null;
}

async function getOrCreateOrganizationForUser(userId: number): Promise<number> {
  const existingId = await resolveOrganizationIdForUser(userId);
  if (existingId != null) return existingId;

  const [user] = await db
    .select({ plan: usersTable.plan })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const [org] = await db
    .insert(organizationsTable)
    .values({
      name: "My Organization",
      plan: (user?.plan as PlanId) ?? "starter",
      ownerId: userId,
      companyId: null,
    })
    .returning({ id: organizationsTable.id });

  await db.insert(organizationMembersTable).values({
    organizationId: org.id,
    userId,
    role: "owner",
    assignedProjectId: null,
  });

  await getOrCreateWorkspaceForOrganization(org.id, userId, "My Organization");

  return org.id;
}

async function getOrganizationProjectCount(organizationId: number): Promise<number> {
  const [row] = await db
    .select({ count: countAsInt() })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.organizationId, organizationId));
  return row?.count ?? 0;
}

async function assertCanCreateProject(
  userId: number,
  organizationId: number,
): Promise<
  | { ok: true }
  | { ok: false; status: number; error: string; code?: string; plan?: PlanId }
> {
  const [org] = await db
    .select({ plan: organizationsTable.plan, suspendedAt: organizationsTable.suspendedAt })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  if (org.suspendedAt) {
    return { ok: false, status: 403, error: "Organization is suspended" };
  }

  const quota = await resolvePlanProjectQuota(org.plan);
  if (quota === null) {
    return { ok: true };
  }

  const projectCount = await getOrganizationProjectCount(organizationId);
  if (projectCount >= quota) {
    const plan = normalizePlanId(org.plan);
    return {
      ok: false,
      status: 402,
      error: `You've reached the ${quota}-site limit on Starter. Add your API key in Settings → AI Providers for more capacity.`,
      code: "quota_exhausted",
      plan,
    };
  }

  return { ok: true };
}

const createProjectBody = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Must be a valid URL"),
});

const contentStyleBody = z.object({
  tonePreset: z
    .enum(["professional", "casual", "technical", "conversational"])
    .optional(),
  personaName: z.string().optional(),
  defaultWordCount: z.number().int().min(300).max(3000).optional(),
  primaryLanguage: z.string().optional(),
  readingLevel: z.enum(["general", "intermediate", "expert"]).optional(),
  humanizationLevel: z.enum(["off", "light", "strong"]).optional(),
});

const patchProjectBody = z.object({
  name: z.string().optional(),
  url: z.string().url().optional(),
  companyName: z.string().optional(),
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
  voiceTone: z.string().optional(),
  primaryKeywords: z.array(z.string()).optional(),
  competitorUrls: z.array(z.string()).optional(),
  brandColors: z.array(z.string()).optional(),
  productOfferings: z.array(z.string()).optional(),
  contentStyle: contentStyleBody.optional(),
});

export async function handleWebsiteProjectsWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/website-projects" && request.method === "POST") {
    const parsed = createProjectBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    const { name, url } = parsed.data;
    const organizationId = await getOrCreateOrganizationForUser(userId);
    const quotaCheck = await assertCanCreateProject(userId, organizationId);
    if (!quotaCheck.ok) {
      return withCors(
        request,
        Response.json(
          {
            error: quotaCheck.code ?? "quota_exhausted",
            message: quotaCheck.error,
            plan: quotaCheck.plan,
          },
          { status: quotaCheck.status },
        ),
      );
    }

    const duplicate = await findDuplicateProjectByUrl(organizationId, url);
    if (duplicate) {
      return withCors(
        request,
        Response.json(
          {
            error: "duplicate_website",
            message: `A project for this website already exists (${duplicate.name}).`,
          },
          { status: 409 },
        ),
      );
    }

    const [project] = await db
      .insert(websiteProjectsTable)
      .values({
        userId,
        organizationId,
        name,
        url,
        crawlStatus: "pending",
        scrapeStatus: "pending",
      })
      .returning();

    void sendToCfQueue(QUEUES.brandVoiceIndex, { projectId: project.id }).catch((err) => {
      console.error("[goals-ac-write] brand scrape enqueue failed", project.id, err);
    });

    return withCors(request, Response.json(project, { status: 201 }));
  }

  const projectMatch = path.match(/^\/api\/website-projects\/(\d+)$/);
  if (projectMatch && request.method === "DELETE") {
    const projectId = Number.parseInt(projectMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    await db.delete(websiteProjectsTable).where(eq(websiteProjectsTable.id, projectId));
    return withCors(request, new Response(null, { status: 204 }));
  }

  if (projectMatch && request.method === "PATCH") {
    const projectId = Number.parseInt(projectMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const parsed = patchProjectBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    if (parsed.data.url !== undefined && project.organizationId != null) {
      const duplicate = await findDuplicateProjectByUrl(
        project.organizationId,
        parsed.data.url,
        projectId,
      );
      if (duplicate) {
        return withCors(
          request,
          Response.json(
            {
              error: "duplicate_website",
              message: `A project for this website already exists (${duplicate.name}).`,
            },
            { status: 409 },
          ),
        );
      }
    }

    const projectUpdates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) projectUpdates.name = parsed.data.name;
    if (parsed.data.url !== undefined) projectUpdates.url = parsed.data.url;
    if (parsed.data.contentStyle !== undefined) {
      const existingContentStyle =
        (project.contentStyle as Record<string, unknown> | null) ?? {};
      projectUpdates.contentStyle = {
        ...existingContentStyle,
        ...parsed.data.contentStyle,
      };
    }

    if (Object.keys(projectUpdates).length > 0) {
      await db
        .update(websiteProjectsTable)
        .set(projectUpdates)
        .where(eq(websiteProjectsTable.id, projectId));
    }

    const brandUpdates: Record<string, unknown> = {};
    if (parsed.data.companyName !== undefined) brandUpdates.companyName = parsed.data.companyName;
    if (parsed.data.industry !== undefined) brandUpdates.industry = parsed.data.industry;
    if (parsed.data.targetAudience !== undefined) {
      brandUpdates.targetAudience = parsed.data.targetAudience;
    }
    if (parsed.data.voiceTone !== undefined) brandUpdates.voiceTone = parsed.data.voiceTone;
    if (parsed.data.primaryKeywords !== undefined) {
      brandUpdates.primaryKeywords = parsed.data.primaryKeywords;
    }
    if (parsed.data.competitorUrls !== undefined) {
      brandUpdates.competitorUrls = parsed.data.competitorUrls;
    }
    if (parsed.data.brandColors !== undefined) brandUpdates.brandColors = parsed.data.brandColors;
    if (parsed.data.productOfferings !== undefined) {
      brandUpdates.productOfferings = parsed.data.productOfferings;
    }

    if (Object.keys(brandUpdates).length > 0) {
      const [existing] = await db
        .select({ id: brandProfilesTable.id })
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, projectId))
        .limit(1);

      if (existing) {
        await db
          .update(brandProfilesTable)
          .set(brandUpdates)
          .where(eq(brandProfilesTable.websiteProjectId, projectId));
      } else {
        await db.insert(brandProfilesTable).values({
          websiteProjectId: projectId,
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
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);
    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);

    return withCors(
      request,
      Response.json({ ...updated, brandProfile: brandProfile ?? null }),
    );
  }

  return null;
}
