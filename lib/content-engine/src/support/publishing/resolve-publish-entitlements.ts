import { db } from "@workspace/db";
import { organizationsTable, usersTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  resolvePublishEntitlements,
  type PublishEntitlements,
} from "./publish-entitlements";

export async function resolveEntitlementsForProject(
  projectId: number,
  userId?: number,
): Promise<PublishEntitlements> {
  const [project] = await db
    .select({
      organizationId: websiteProjectsTable.organizationId,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  let plan: string | null = "starter";
  let hasByok = false;

  if (project?.organizationId) {
    const [org] = await db
      .select({
        plan: organizationsTable.plan,
        encryptedGeminiKey: organizationsTable.encryptedGeminiKey,
      })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, project.organizationId))
      .limit(1);
    if (org) {
      plan = org.plan;
      hasByok = Boolean(org.encryptedGeminiKey);
    }
  }

  if (!hasByok && userId) {
    const [user] = await db
      .select({ encryptedGeminiKey: usersTable.encryptedGeminiKey })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    hasByok = Boolean(user?.encryptedGeminiKey);
  }

  return resolvePublishEntitlements({ plan, hasByok });
}

export async function resolveEntitlementsForOrg(orgId: number): Promise<PublishEntitlements> {
  const [org] = await db
    .select({
      plan: organizationsTable.plan,
      encryptedGeminiKey: organizationsTable.encryptedGeminiKey,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId))
    .limit(1);

  return resolvePublishEntitlements({
    plan: org?.plan ?? "starter",
    hasByok: Boolean(org?.encryptedGeminiKey),
  });
}
