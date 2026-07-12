import { redirect } from "next/navigation";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { Agent } from "@atproto/api";
import {
  decryptCmsCredentials,
  type CmsIntegrationCredentials,
} from "@workspace/content-engine/support/cms-integrations";
import { saveProjectCreds } from "@workspace/content-engine/support/social-tokens";
import {
  completeBlueskyCallback,
  persistBlueskySession,
  getStoredBlueskySession,
} from "@/lib/bluesky-oauth";
import { getNextFrontendOrigin } from "@/lib/social-oauth";

function publishingRedirect(projectId: number, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`${getNextFrontendOrigin()}/projects/${projectId}?tab=publishing&${qs}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !stateRaw) {
    redirect(`${getNextFrontendOrigin()}/projects?tab=publishing&bluesky=error`);
  }

  let projectId = 0;
  let userId = 0;
  try {
    const state = JSON.parse(Buffer.from(stateRaw!, "base64url").toString("utf8")) as {
      projectId: number;
      userId: number;
    };
    projectId = state.projectId;
    userId = state.userId;

    const { session } = await completeBlueskyCallback(url.searchParams);
    const agent = new Agent(session);
    const profile = await agent.getProfile({ actor: session.did });

    const blueskyCreds = await persistBlueskySession(session, {
      handle: profile.data.handle,
    });
    if (!blueskyCreds.sessionJson) {
      const saved = getStoredBlueskySession(session.did);
      if (saved) blueskyCreds.sessionJson = JSON.stringify(saved);
    }

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
      .limit(1);
    if (!project) throw new Error("Project not found");

    const existing = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    existing.bluesky = blueskyCreds;
    await saveProjectCreds(projectId, userId, existing);
    publishingRedirect(projectId, { bluesky: "connected" });
  } catch {
    if (projectId) {
      publishingRedirect(projectId, { bluesky: "error" });
    }
    redirect(`${getNextFrontendOrigin()}/projects?tab=publishing&bluesky=error`);
  }
}
