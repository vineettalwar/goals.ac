import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptCmsCredentials } from "@workspace/content-engine/support/cms-integrations";
import { getAdapterCapabilities, listAdaptedPlatforms } from "@workspace/content-engine/adapters/registry";
import { assertProjectInOrg } from "@workspace/content-engine/support/api-key-auth";
import { requireApiKeyScope, withPublicApiKey } from "@/lib/public-api/auth";

export async function GET(req: Request) {
  return withPublicApiKey(req, async (key) => {
    requireApiKeyScope(key, "content:read");
    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get("projectId"));
    if (!projectId) {
      return NextResponse.json({ error: "projectId query param required" }, { status: 400 });
    }
    await assertProjectInOrg(projectId, key.organizationId);

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);

    const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
    const platforms = listAdaptedPlatforms().filter((p) => Boolean(creds[p as keyof typeof creds]));

    return NextResponse.json({
      projectId,
      connections: platforms.map((platform) => ({
        platform,
        capabilities: getAdapterCapabilities(platform),
      })),
    });
  });
}
