import { redirect } from "next/navigation";
import { getAccessibleProject } from "@/lib/org/org-access";
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
} from "@/lib/integrations/oauth/bluesky-oauth";
import { getNextFrontendOrigin } from "@/lib/integrations/oauth/social-oauth";
import {
  assertOAuthSessionUser,
  decodeSignedOAuthState,
} from "@/lib/integrations/oauth/oauth-state";

function publishingRedirect(_projectId: number, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`${getNextFrontendOrigin()}/integrations?${qs}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !stateRaw) {
    redirect(`${getNextFrontendOrigin()}/integrations?bluesky=error`);
  }

  let projectId = 0;
  let userId = 0;
  try {
    const state = decodeSignedOAuthState(stateRaw!);
    if (!state || state.platform !== "bluesky") {
      throw new Error("Invalid OAuth state");
    }
    projectId = state.projectId;
    userId = state.userId;
    await assertOAuthSessionUser(userId);

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

    const project = await getAccessibleProject(projectId, userId);
    if (!project) throw new Error("Project not found");

    const existing = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    existing.bluesky = blueskyCreds;
    await saveProjectCreds(projectId, userId, existing);
    publishingRedirect(projectId, { bluesky: "connected" });
  } catch {
    if (projectId) {
      publishingRedirect(projectId, { bluesky: "error" });
    }
    redirect(`${getNextFrontendOrigin()}/integrations?bluesky=error`);
  }
}
