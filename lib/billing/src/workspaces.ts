import { db, workspacesTable } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface GetOrCreateWorkspaceInput {
  organizationId: number;
  name?: string;
  ownerId?: number;
}

/** Idempotent 1:1 workspace provisioning for an organization. */
export async function getOrCreateWorkspaceForOrganization(
  input: GetOrCreateWorkspaceInput,
): Promise<number> {
  const [existing] = await db
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(eq(workspacesTable.organizationId, input.organizationId))
    .limit(1);

  if (existing) return existing.id;

  let ownerId = input.ownerId;
  let name = input.name;

  if (ownerId == null || name == null) {
    const [org] = await db
      .select({ ownerId: organizationsTable.ownerId, name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, input.organizationId))
      .limit(1);

    if (!org) {
      throw new Error(`getOrCreateWorkspaceForOrganization: organization ${input.organizationId} not found`);
    }

    ownerId ??= org.ownerId;
    name ??= org.name;
  }

  const [workspace] = await db
    .insert(workspacesTable)
    .values({
      organizationId: input.organizationId,
      ownerId,
      name,
    })
    .onConflictDoNothing({ target: workspacesTable.organizationId })
    .returning({ id: workspacesTable.id });

  if (workspace) return workspace.id;

  const [created] = await db
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(eq(workspacesTable.organizationId, input.organizationId))
    .limit(1);

  if (!created) {
    throw new Error(`getOrCreateWorkspaceForOrganization: failed to provision workspace for org ${input.organizationId}`);
  }

  return created.id;
}

export async function getWorkspaceIdForOrganization(organizationId: number): Promise<number | null> {
  const [row] = await db
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(eq(workspacesTable.organizationId, organizationId))
    .limit(1);
  return row?.id ?? null;
}
