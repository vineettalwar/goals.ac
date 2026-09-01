import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { onboardingSessionsTable, type OnboardingSession } from "@workspace/db/schema";
import { getVerticalPreset } from "@workspace/content-engine/vertical-presets";
import { resolveOrganizationIdForUser } from "@/lib/org/org-access";
import { findDuplicateProjectByUrl } from "@/lib/projects/project-url";
import { POST as createCompanyRoute } from "@/app/api/companies/route";
import { POST as createWebsiteProjectRoute } from "@/app/api/website-projects/route";

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type ProjectInitResult = {
  companyId: number;
  projectId: number;
  organizationId: number | null;
};

/**
 * Creates the company and website project a session's answers point to, the
 * moment enough of the answers exist (firm name, vertical, website) — not only
 * at completion. The connect steps that follow (LinkedIn, Search Console,
 * WordPress) all key their sync services off a `website_projects` row, so it has
 * to exist before those steps can do anything. Idempotent: reuses
 * `session.companyId` / `session.websiteProjectId` if already set, and persists
 * whatever it creates back onto the session row immediately.
 *
 * Reuses the `/api/companies` and `/api/website-projects` POST logic paths
 * rather than duplicating org-linking, quota, and duplicate-site handling here.
 */
export async function initCompanyAndProject(
  userId: number,
  session: OnboardingSession,
): Promise<ProjectInitResult> {
  const { answers } = session;
  if (!answers.orgName || !answers.vertical || !answers.websiteUrl) {
    throw new Error("Cannot init project before firm_name, vertical, and website are answered");
  }

  const preset = getVerticalPreset(answers.vertical);

  let companyId = session.companyId;
  if (!companyId) {
    const companyRes = await createCompanyRoute(
      jsonRequest("http://internal/api/companies", {
        name: answers.orgName,
        websiteUrl: answers.websiteUrl,
        industry: preset.label,
        description: `${answers.orgName} - ${preset.blurb}`,
        targetAudience: answers.audience || preset.defaultAudience,
        competitorUrls: answers.competitors ?? [],
      }),
    );
    if (!companyRes.ok) {
      const body = await companyRes.json().catch(() => ({}) as { error?: string });
      throw new Error(`Failed to create company: ${body?.error ?? companyRes.status}`);
    }
    const companyBody = (await companyRes.json()) as { company: { id: number } };
    companyId = companyBody.company.id;
  }

  let projectId = session.websiteProjectId;
  if (!projectId) {
    const projectRes = await createWebsiteProjectRoute(
      jsonRequest("http://internal/api/website-projects", {
        name: answers.orgName,
        url: answers.websiteUrl,
      }),
    );

    if (projectRes.status === 409) {
      const organizationId = await resolveOrganizationIdForUser(userId);
      const duplicate = organizationId
        ? await findDuplicateProjectByUrl(organizationId, answers.websiteUrl)
        : null;
      if (!duplicate) {
        throw new Error("Website project already exists but could not be resolved");
      }
      projectId = duplicate.id;
    } else if (!projectRes.ok) {
      const body = await projectRes.json().catch(() => ({}) as { error?: string });
      throw new Error(`Failed to create website project: ${body?.error ?? projectRes.status}`);
    } else {
      const project = (await projectRes.json()) as { id: number };
      projectId = project.id;
    }
  }

  const organizationId = session.organizationId ?? (await resolveOrganizationIdForUser(userId));

  await db
    .update(onboardingSessionsTable)
    .set({
      companyId,
      websiteProjectId: projectId,
      organizationId: organizationId ?? session.organizationId,
    })
    .where(eq(onboardingSessionsTable.id, session.id));

  return { companyId, projectId, organizationId: organizationId ?? session.organizationId ?? null };
}
