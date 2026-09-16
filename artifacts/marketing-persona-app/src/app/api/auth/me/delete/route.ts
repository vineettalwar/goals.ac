import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  usersTable,
  websiteProjectsTable,
  contentStrategiesTable,
  contentItemsTable,
  seoArticlesTable,
  geoAuditsTable,
  competitorAnalysesTable,
  keywordAnalysesTable,
  organizationMembersTable,
  organizationsTable,
  sessionsTable,
  companiesTable,
} from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { signOut } from "@/auth";

export async function DELETE() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const memberships = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
    })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId!));

  for (const membership of memberships) {
    const others = await db
      .select({ id: organizationMembersTable.id })
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.organizationId, membership.organizationId));
    if (others.length > 1) {
      return NextResponse.json(
        { error: "Remove other organization members before deleting this account." },
        { status: 409 },
      );
    }
  }

  try {
    await db.transaction(async (tx) => {
      const userProjects = await tx
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.userId, userId!));

      if (userProjects.length > 0) {
        const projectIds = userProjects.map((p) => p.id);

        const strategies = await tx
          .select({ id: contentStrategiesTable.id })
          .from(contentStrategiesTable)
          .where(inArray(contentStrategiesTable.websiteProjectId, projectIds));

        if (strategies.length > 0) {
          const strategyIds = strategies.map((s) => s.id);
          await tx.delete(contentItemsTable).where(inArray(contentItemsTable.strategyId, strategyIds));
        }

        await tx.delete(contentStrategiesTable).where(inArray(contentStrategiesTable.websiteProjectId, projectIds));
        await tx.delete(seoArticlesTable).where(inArray(seoArticlesTable.websiteProjectId, projectIds));
        await tx.delete(geoAuditsTable).where(inArray(geoAuditsTable.websiteProjectId, projectIds));
        await tx.delete(competitorAnalysesTable).where(inArray(competitorAnalysesTable.websiteProjectId, projectIds));
        await tx.delete(keywordAnalysesTable).where(inArray(keywordAnalysesTable.websiteProjectId, projectIds));
        await tx.delete(websiteProjectsTable).where(inArray(websiteProjectsTable.id, projectIds));
      }

      const orgs = await tx
        .select({ id: organizationsTable.id })
        .from(organizationsTable)
        .where(eq(organizationsTable.ownerId, userId!));
      const orgIds = orgs.map((o) => o.id);
      if (orgIds.length > 0) {
        await tx
          .delete(organizationMembersTable)
          .where(inArray(organizationMembersTable.organizationId, orgIds));
        await tx.delete(organizationsTable).where(inArray(organizationsTable.id, orgIds));
      }

      await tx.delete(sessionsTable).where(eq(sessionsTable.userId, userId!));
      await tx.delete(companiesTable).where(eq(companiesTable.userId, userId!));
      await tx.delete(usersTable).where(eq(usersTable.id, userId!));
    });

    await signOut({ redirect: false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
